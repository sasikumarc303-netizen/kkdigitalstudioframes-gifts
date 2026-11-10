import mongoose from 'mongoose';
import Order from '../models/Order.js';
import { ApiError, asyncHandler, escapeRegex, parsePaging } from '../utils/helpers.js';
import { validate } from '../middleware/validate.js';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '../config/constants.js';
import { logActivity } from '../services/activity.js';
import { restoreStock } from '../services/orders.js';

const byId = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, 'Invalid id');
  const o = await Order.findById(id).populate('customer', 'name phone email');
  if (!o) throw new ApiError(404, 'Order not found');
  return o;
};

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query, { defaultLimit: 20 });
  const filter = {};
  if (ORDER_STATUSES.includes(req.query.status)) filter.status = req.query.status;
  if (PAYMENT_STATUSES.includes(req.query.paymentStatus)) filter.paymentStatus = req.query.paymentStatus;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(String(req.query.q).slice(0, 60)), 'i');
    filter.$or = [{ orderNumber: rx }, { 'contact.name': rx }, { 'contact.phone': rx }, { 'contact.email': rx }];
  }
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (/^\d{4}-\d{2}-\d{2}$/.test(req.query.from || '')) filter.createdAt.$gte = new Date(`${req.query.from}T00:00:00+05:30`);
    if (/^\d{4}-\d{2}-\d{2}$/.test(req.query.to || '')) filter.createdAt.$lte = new Date(`${req.query.to}T23:59:59+05:30`);
    if (!Object.keys(filter.createdAt).length) delete filter.createdAt;
  }
  const [items, total, counts] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Order.countDocuments(filter),
    Order.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);
  const statusCounts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0]));
  counts.forEach((c) => { statusCounts[c._id] = c.n; });
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)), statusCounts });
});

export const get = asyncHandler(async (req, res) => res.json(await byId(req.params.id)));

export const setStatus = asyncHandler(async (req, res) => {
  const { status, note } = validate({ status: { type: 'enum', values: ORDER_STATUSES, required: true }, note: { type: 'text', max: 500 } }, req.body);
  const o = await byId(req.params.id);
  const from = o.status;
  if (from === status) return res.json(o);
  if (from === 'Cancelled') throw new ApiError(409, 'A cancelled order cannot be reopened. Ask the customer to place a new order.');
  o.status = status;
  if (status === 'Cancelled') await restoreStock(o);
  o.history.push({ status, note: note || `${from} → ${status}`, by: req.user.name, at: new Date() });
  await o.save();
  logActivity(req, { action: 'status', entity: 'order', entityId: o._id, summary: `Order ${o.orderNumber}: ${from} → ${status}` });
  res.json(o);
});

export const update = asyncHandler(async (req, res) => {
  const data = validate({ adminNotes: { type: 'text', max: 2000 }, paymentStatus: { type: 'enum', values: PAYMENT_STATUSES } }, req.body);
  const o = await byId(req.params.id);
  if ('adminNotes' in req.body) o.adminNotes = data.adminNotes || '';
  if (data.paymentStatus && data.paymentStatus !== o.paymentStatus) {
    o.history.push({ status: o.status, note: `Payment: ${o.paymentStatus} → ${data.paymentStatus}`, by: req.user.name, at: new Date() });
    o.paymentStatus = data.paymentStatus;
  }
  await o.save();
  logActivity(req, { action: 'update', entity: 'order', entityId: o._id, summary: `Updated order ${o.orderNumber}` });
  res.json(o);
});

export const remove = asyncHandler(async (req, res) => {
  const o = await byId(req.params.id);
  if (o.status !== 'Cancelled' && o.status !== 'Delivered') throw new ApiError(409, 'Only cancelled or delivered orders can be deleted. Cancel the order first so stock is restored.');
  await o.deleteOne();
  logActivity(req, { action: 'delete', entity: 'order', entityId: o._id, summary: `Deleted order ${o.orderNumber}` });
  res.json({ ok: true });
});
