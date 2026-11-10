import mongoose from 'mongoose';
import Service from '../models/Service.js';
import Package from '../models/Package.js';
import Category from '../models/Category.js';
import GalleryImage from '../models/GalleryImage.js';
import Product from '../models/Product.js';
import Testimonial from '../models/Testimonial.js';
import Booking from '../models/Booking.js';
import Order from '../models/Order.js';
import Enquiry from '../models/Enquiry.js';
import { ApiError, asyncHandler, escapeRegex, makeReference, phoneKey } from '../utils/helpers.js';
import { validate } from '../middleware/validate.js';
import { getConfig, whatsappLink } from '../services/siteConfig.js';
import { paymentInfo } from '../services/payments.js';
import { upsertCustomer } from '../services/customers.js';
import { logPublicEvent } from '../services/activity.js';
import { notifyStudio } from '../services/mailer.js';
import { priceCart, shippingFor, reserveStock } from '../services/orders.js';

const sorted = { order: 1, createdAt: -1 };
const isId = (v) => mongoose.isValidObjectId(v);

// ---------- content ----------
export const site = asyncHandler(async (_req, res) => {
  const config = await getConfig();
  res.json({ config, payment: paymentInfo(), whatsappUrl: whatsappLink(config) });
});

export const home = asyncHandler(async (_req, res) => {
  const config = await getConfig();
  const hp = config.homepage;
  const pick = async (Model, ids, fallbackQuery, limit) => {
    const valid = (ids || []).filter(isId);
    if (valid.length) {
      const docs = await Model.find({ _id: { $in: valid }, published: true });
      const map = new Map(docs.map((d) => [String(d._id), d]));
      const ordered = valid.map((id) => map.get(String(id))).filter(Boolean);
      if (ordered.length) return ordered;
    }
    return fallbackQuery.limit(limit);
  };
  const [servicesList, productsList, galleryList, packagesList, testimonialsList] = await Promise.all([
    pick(Service, hp.featuredServices, Service.find({ published: true }).sort(sorted), 6),
    pick(Product, hp.featuredProducts, Product.find({ published: true }).sort({ featured: -1, ...sorted }).populate('category', 'name slug'), 4),
    GalleryImage.find({ published: true }).sort({ featured: -1, order: 1, createdAt: -1 }).limit(9).populate('category', 'name slug'),
    Package.find({ published: true }).sort({ popular: -1, ...sorted }).limit(3),
    Testimonial.find({ published: true }).sort(sorted).limit(8),
  ]);
  const prods = await Product.populate(productsList, { path: 'category', select: 'name slug' });
  res.json({
    config,
    payment: paymentInfo(),
    whatsappUrl: whatsappLink(config),
    services: servicesList,
    products: prods.map((p) => p.toPublic()),
    gallery: galleryList,
    packages: packagesList,
    testimonials: testimonialsList,
  });
});

export const listServices = asyncHandler(async (_req, res) => res.json(await Service.find({ published: true }).sort(sorted)));
export const listPackages = asyncHandler(async (_req, res) => res.json(await Package.find({ published: true }).sort(sorted)));
export const listTestimonials = asyncHandler(async (_req, res) => res.json(await Testimonial.find({ published: true }).sort(sorted)));

export const listCategories = asyncHandler(async (req, res) => {
  const type = req.query.type === 'product' ? 'product' : 'gallery';
  const cats = await Category.find({ type, published: true }).sort({ order: 1, name: 1 });
  // Only expose categories that actually contain published items.
  const model = type === 'product' ? Product : GalleryImage;
  const counts = await model.aggregate([{ $match: { published: true } }, { $group: { _id: '$category', n: { $sum: 1 } } }]);
  const map = new Map(counts.map((c) => [String(c._id), c.n]));
  res.json(cats.map((c) => ({ ...c.toJSON(), count: map.get(String(c._id)) || 0 })).filter((c) => c.count > 0));
});

export const listGallery = asyncHandler(async (req, res) => {
  const filter = { published: true };
  if (req.query.category) {
    const cat = isId(req.query.category) ? await Category.findById(req.query.category) : await Category.findOne({ slug: String(req.query.category) });
    if (!cat) return res.json([]);
    filter.category = cat._id;
  }
  res.json(await GalleryImage.find(filter).sort({ order: 1, createdAt: -1 }).limit(300).populate('category', 'name slug'));
});

export const listProducts = asyncHandler(async (req, res) => {
  const filter = { published: true };
  if (req.query.category) {
    const cat = isId(req.query.category) ? await Category.findById(req.query.category) : await Category.findOne({ slug: String(req.query.category) });
    if (!cat) return res.json([]);
    filter.category = cat._id;
  }
  if (req.query.q) filter.name = new RegExp(escapeRegex(String(req.query.q).slice(0, 60)), 'i');
  const items = await Product.find(filter).sort({ featured: -1, ...sorted }).populate('category', 'name slug');
  res.json(items.map((p) => p.toPublic()));
});

export const getProduct = asyncHandler(async (req, res) => {
  const key = String(req.params.idOrSlug);
  const p = await Product.findOne(isId(key) ? { _id: key, published: true } : { slug: key.toLowerCase(), published: true }).populate('category', 'name slug');
  if (!p) throw new ApiError(404, 'Product not found');
  const related = await Product.find({ published: true, _id: { $ne: p._id } }).sort({ featured: -1, ...sorted }).limit(4).populate('category', 'name slug');
  res.json({ product: p.toPublic(), related: related.map((r) => r.toPublic()) });
});

// ---------- cart / orders ----------
const cartItemsSchema = (items) => {
  if (!Array.isArray(items) || items.length === 0) throw new ApiError(422, 'Your cart is empty', { items: 'Your cart is empty' });
  if (items.length > 30) throw new ApiError(422, 'Too many items in cart');
  return items.map((it) => validate({ productId: { type: 'id', required: true }, variantId: { type: 'id', required: true }, quantity: { type: 'int', min: 1, max: 20, default: 1 } }, it));
};

/** Authoritative prices for whatever is in the shopper's cart. */
export const cartPrice = asyncHandler(async (req, res) => {
  const items = cartItemsSchema(req.body.items);
  const priced = await priceCart(items);
  const fulfilment = req.body.fulfilment === 'pickup' ? 'pickup' : 'delivery';
  const shipping = await shippingFor(priced.subtotal, fulfilment);
  res.json({ ...priced, shipping, total: priced.subtotal + shipping });
});

export const createOrder = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const config = await getConfig();
  const contact = validate({ name: { type: 'string', required: true, min: 2, max: 80 }, phone: { type: 'phone', required: true }, email: { type: 'email' } }, body.contact || {});
  const fulfilment = body.fulfilment === 'pickup' ? 'pickup' : 'delivery';
  if (fulfilment === 'pickup' && !config.commerce.allowPickup) throw new ApiError(422, 'Studio pickup is not available');
  const addressRules = { line1: { type: 'string', max: 160 }, line2: { type: 'string', max: 160 }, city: { type: 'string', max: 80 }, state: { type: 'string', max: 80 }, pincode: { type: 'string', max: 10 } };
  const address = validate(
    fulfilment === 'delivery'
      ? { ...addressRules, line1: { ...addressRules.line1, required: true }, city: { ...addressRules.city, required: true }, state: { ...addressRules.state, required: true }, pincode: { ...addressRules.pincode, required: true } }
      : addressRules,
    body.address || {}
  );
  const paymentMethod = body.paymentMethod === 'cod' && config.commerce.allowCod ? 'cod' : 'enquiry';
  const notes = validate({ notes: { type: 'text', max: 1000 } }, { notes: body.notes }).notes || '';
  const items = cartItemsSchema(body.items);

  const priced = await priceCart(items);
  if (priced.issues.length) throw new ApiError(409, priced.issues[0].message, { issues: priced.issues });
  const shipping = await shippingFor(priced.subtotal, fulfilment);

  if (!(await reserveStock(priced.lines))) throw new ApiError(409, 'Sorry, an item just went out of stock. Please review your cart.');

  const customer = await upsertCustomer({
    name: contact.name,
    phone: contact.phone,
    email: contact.email,
    address: fulfilment === 'delivery' ? [address.line1, address.line2, address.city, address.state, address.pincode].filter(Boolean).join(', ') : '',
    source: 'order',
  });

  let order;
  for (let attempt = 0; attempt < 5 && !order; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      order = await Order.create({
        orderNumber: makeReference('ORD'),
        customer: customer._id,
        contact: { ...contact, phoneKey: phoneKey(contact.phone) },
        shippingAddress: address,
        fulfilment,
        items: priced.lines.map(({ product, variantId, name, size, finish, sku, image, unitPrice, quantity, lineTotal }) => ({ product, variantId, name, size, finish, sku, image, unitPrice, quantity, lineTotal })),
        subtotal: priced.subtotal,
        shipping,
        total: priced.subtotal + shipping,
        currency: config.general.currency,
        paymentMethod,
        notes,
        history: [{ status: 'Pending', note: 'Order placed on website', by: 'customer' }],
      });
    } catch (e) {
      if (e?.code !== 11000) {
        await Promise.all(priced.lines.map((l) => Product.updateOne({ _id: l.product, 'variants._id': l.variantId }, { $inc: { 'variants.$.stock': l.quantity } })));
        throw e;
      }
    }
  }
  if (!order) throw new ApiError(500, 'Could not create the order. Please try again.');

  logPublicEvent(req, { action: 'create', entity: 'order', entityId: order._id, summary: `New order ${order.orderNumber} from ${contact.name} (₹${order.total})` });
  notifyStudio(config, `New order ${order.orderNumber}`, `${contact.name} (${contact.phone}) placed order ${order.orderNumber} for ${order.currency} ${order.total}.`);

  res.status(201).json({
    orderNumber: order.orderNumber,
    status: order.status,
    total: order.total,
    subtotal: order.subtotal,
    shipping: order.shipping,
    paymentMethod,
    items: order.items,
    createdAt: order.createdAt,
  });
});

const publicOrder = (o) => ({
  orderNumber: o.orderNumber,
  status: o.status,
  paymentStatus: o.paymentStatus,
  paymentMethod: o.paymentMethod,
  fulfilment: o.fulfilment,
  items: o.items,
  subtotal: o.subtotal,
  shipping: o.shipping,
  total: o.total,
  createdAt: o.createdAt,
  history: (o.history || []).map((h) => ({ status: h.status, at: h.at })),
});

/** Order history for a shopper: items are [{ orderNumber, phone }] – the phone number acts as the shared secret. */
export const lookupOrders = asyncHandler(async (req, res) => {
  const items = (Array.isArray(req.body.items) ? req.body.items : []).slice(0, 20);
  const out = [];
  for (const it of items) {
    const orderNumber = String(it.orderNumber || '').trim().toUpperCase();
    const key = phoneKey(it.phone);
    if (!orderNumber || key.length < 7) continue;
    // eslint-disable-next-line no-await-in-loop
    const o = await Order.findOne({ orderNumber, 'contact.phoneKey': key });
    if (o) out.push(publicOrder(o));
  }
  res.json(out);
});

// ---------- bookings ----------
const publicBooking = (b) => ({
  reference: b.reference,
  status: b.status,
  name: b.name,
  serviceTitle: b.serviceTitle,
  date: b.date,
  time: b.time,
  location: b.location,
  rescheduleRequest: b.rescheduleRequest?.date ? { date: b.rescheduleRequest.date, time: b.rescheduleRequest.time } : null,
  createdAt: b.createdAt,
});

export const createBooking = asyncHandler(async (req, res) => {
  const data = validate(
    {
      name: { type: 'string', required: true, min: 2, max: 80 },
      phone: { type: 'phone', required: true },
      email: { type: 'email' },
      serviceId: { type: 'id', required: true, message: 'Please choose a service' },
      date: { type: 'futureDate', required: true },
      time: { type: 'time', required: true },
      location: { type: 'text', max: 300 },
      message: { type: 'text', max: 1500 },
    },
    req.body
  );
  const service = await Service.findOne({ _id: data.serviceId, published: true });
  if (!service) throw new ApiError(422, 'Please choose a valid service', { serviceId: 'Please choose a valid service' });
  const customer = await upsertCustomer({ name: data.name, phone: data.phone, email: data.email, source: 'booking' });

  let booking;
  for (let attempt = 0; attempt < 5 && !booking; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      booking = await Booking.create({
        reference: makeReference('BK'),
        customer: customer._id,
        name: data.name,
        phone: data.phone,
        phoneKey: phoneKey(data.phone),
        email: data.email || '',
        service: service._id,
        serviceTitle: service.title,
        date: data.date,
        time: data.time,
        location: data.location || '',
        message: data.message || '',
        status: 'Pending', // never auto-confirmed – the studio confirms personally
        history: [{ action: 'Created', status: 'Pending', note: 'Booking request submitted on website', by: 'customer' }],
      });
    } catch (e) {
      if (e?.code !== 11000) throw e;
    }
  }
  if (!booking) throw new ApiError(500, 'Could not create the booking. Please try again.');
  const config = await getConfig();
  logPublicEvent(req, { action: 'create', entity: 'booking', entityId: booking._id, summary: `New booking ${booking.reference}: ${booking.serviceTitle} on ${booking.date} for ${booking.name}` });
  notifyStudio(config, `New booking request ${booking.reference}`, `${booking.name} (${booking.phone}) requested ${booking.serviceTitle} on ${booking.date} at ${booking.time}.\n${booking.message}`);
  res.status(201).json(publicBooking(booking));
});

const findOwnBooking = async (body) => {
  const { reference, phone } = validate({ reference: { type: 'string', required: true, max: 40 }, phone: { type: 'phone', required: true } }, body);
  const b = await Booking.findOne({ reference: reference.toUpperCase(), phoneKey: phoneKey(phone) });
  if (!b) throw new ApiError(404, 'We could not find a booking with that reference and phone number');
  return b;
};

export const lookupBooking = asyncHandler(async (req, res) => res.json(publicBooking(await findOwnBooking(req.body))));

export const cancelBooking = asyncHandler(async (req, res) => {
  const b = await findOwnBooking(req.body);
  if (!['Pending', 'Confirmed'].includes(b.status)) throw new ApiError(409, `A ${b.status.toLowerCase()} booking cannot be cancelled online. Please contact us.`);
  b.status = 'Cancelled';
  b.history.push({ action: 'Cancelled by customer', status: 'Cancelled', by: 'customer' });
  await b.save();
  logPublicEvent(req, { action: 'status', entity: 'booking', entityId: b._id, summary: `Booking ${b.reference} cancelled by customer` });
  res.json(publicBooking(b));
});

export const requestReschedule = asyncHandler(async (req, res) => {
  const b = await findOwnBooking(req.body);
  const data = validate({ newDate: { type: 'futureDate', required: true }, newTime: { type: 'time', required: true }, note: { type: 'text', max: 300 } }, req.body);
  if (!['Pending', 'Confirmed'].includes(b.status)) throw new ApiError(409, `A ${b.status.toLowerCase()} booking cannot be rescheduled online. Please contact us.`);
  b.rescheduleRequest = { date: data.newDate, time: data.newTime, note: data.note || '', at: new Date() };
  b.history.push({ action: 'Reschedule requested', status: b.status, note: `${data.newDate} ${data.newTime}`, by: 'customer' });
  await b.save();
  logPublicEvent(req, { action: 'update', entity: 'booking', entityId: b._id, summary: `Booking ${b.reference}: customer asked to reschedule to ${data.newDate} ${data.newTime}` });
  res.json(publicBooking(b));
});

// ---------- enquiries ----------
export const createEnquiry = asyncHandler(async (req, res) => {
  const data = validate(
    {
      name: { type: 'string', required: true, min: 2, max: 80 },
      phone: { type: 'phone' },
      email: { type: 'email' },
      subject: { type: 'text', max: 160 },
      message: { type: 'text', required: true, min: 5, max: 2000 },
      type: { type: 'enum', values: ['contact', 'product', 'service', 'whatsapp'], default: 'contact' },
      reference: { type: 'text', max: 160 },
    },
    req.body
  );
  if (!data.phone && !data.email) throw new ApiError(422, 'Please provide a phone number or an email so we can reply', { phone: 'Add a phone number or email', email: 'Add a phone number or email' });
  const customer = await upsertCustomer({ name: data.name, phone: data.phone, email: data.email, source: 'enquiry' });
  const enquiry = await Enquiry.create({ ...data, customer: customer._id });
  const config = await getConfig();
  logPublicEvent(req, { action: 'create', entity: 'enquiry', entityId: enquiry._id, summary: `New ${enquiry.type} enquiry from ${enquiry.name}${enquiry.reference ? ` about ${enquiry.reference}` : ''}` });
  notifyStudio(config, `New enquiry from ${enquiry.name}`, `${enquiry.subject || ''}\n${enquiry.message}\n\n${enquiry.phone} ${enquiry.email}`);
  res.status(201).json({ ok: true });
});
