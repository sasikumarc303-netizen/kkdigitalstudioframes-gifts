import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import Order from '../models/Order.js';
import Booking from '../models/Booking.js';
import Enquiry from '../models/Enquiry.js';
import { ApiError, asyncHandler, escapeRegex, parsePaging, phoneKey } from '../utils/helpers.js';
import { validate } from '../middleware/validate.js';
import { logActivity } from '../services/activity.js';

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query, { defaultLimit: 20 });
  const filter = {};
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(String(req.query.q).slice(0, 60)), 'i');
    filter.$or = [{ name: rx }, { phone: rx }, { email: rx }];
  }
  const [items, total] = await Promise.all([
    Customer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Customer.countDocuments(filter),
  ]);
  const ids = items.map((c) => c._id);
  const [orderAgg, bookingAgg] = await Promise.all([
    Order.aggregate([{ $match: { customer: { $in: ids } } }, { $group: { _id: '$customer', n: { $sum: 1 }, spent: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 0, '$total'] } } } }]),
    Booking.aggregate([{ $match: { customer: { $in: ids } } }, { $group: { _id: '$customer', n: { $sum: 1 } } }]),
  ]);
  const oMap = new Map(orderAgg.map((o) => [String(o._id), o]));
  const bMap = new Map(bookingAgg.map((b) => [String(b._id), b.n]));
  res.json({
    items: items.map((c) => ({ ...c.toJSON(), orderCount: oMap.get(String(c._id))?.n || 0, totalSpent: oMap.get(String(c._id))?.spent || 0, bookingCount: bMap.get(String(c._id)) || 0 })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  });
});

export const get = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid id');
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw new ApiError(404, 'Customer not found');
  const [orders, bookings, enquiries] = await Promise.all([
    Order.find({ customer: customer._id }).sort({ createdAt: -1 }).limit(100),
    Booking.find({ customer: customer._id }).sort({ createdAt: -1 }).limit(100),
    Enquiry.find({ customer: customer._id }).sort({ createdAt: -1 }).limit(50),
  ]);
  res.json({ customer, orders, bookings, enquiries });
});

export const update = asyncHandler(async (req, res) => {
  const data = validate(
    {
      name: { type: 'string', required: true, max: 80 },
      phone: { type: 'phone' },
      email: { type: 'email' },
      address: { type: 'text', max: 400 },
      notes: { type: 'text', max: 2000 },
    },
    req.body
  );
  const c = await Customer.findById(req.params.id);
  if (!c) throw new ApiError(404, 'Customer not found');
  c.name = data.name;
  c.phone = data.phone || '';
  c.phoneKey = phoneKey(data.phone);
  c.email = data.email || '';
  c.address = data.address || '';
  c.notes = data.notes || '';
  await c.save();
  logActivity(req, { action: 'update', entity: 'customer', entityId: c._id, summary: `Updated customer ${c.name}` });
  res.json(c);
});

export const remove = asyncHandler(async (req, res) => {
  const c = await Customer.findById(req.params.id);
  if (!c) throw new ApiError(404, 'Customer not found');
  await c.deleteOne(); // orders/bookings keep their own contact snapshot
  logActivity(req, { action: 'delete', entity: 'customer', entityId: c._id, summary: `Deleted customer ${c.name}` });
  res.json({ ok: true });
});
