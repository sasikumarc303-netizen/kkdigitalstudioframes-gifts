import mongoose from 'mongoose';
import Order from '../models/Order.js';
import { ApiError, asyncHandler, escapeRegex, parsePaging } from '../utils/helpers.js';
import { validate } from '../middleware/validate.js';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '../config/constants.js';
import { logActivity } from '../services/activity.js';
import { restoreStock } from '../services/orders.js';
import { canTransitionOrderStatus } from '../services/orderTracking.js';
import { enqueueOrderNotification, retryOrderNotification } from '../services/orderNotifications.js';
import { withMongoTransaction } from '../services/mongoTransactions.js';
import OrderNotification from '../models/OrderNotification.js';

const byId = async (id, { session } = {}) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, 'Invalid id');
  let query = Order.findById(id).populate('customer', 'name phone email');
  if (session) query = query.session(session);
  const o = await query;
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
  const { status, note, customerNote } = validate({
    status: { type: 'enum', values: ORDER_STATUSES, required: true },
    note: { type: 'text', max: 500 },
    customerNote: { type: 'text', max: 250 },
  }, req.body);
  let o;
  let from;
  let changed = false;
  try {
    await withMongoTransaction(async (session) => {
      changed = false;
      o = await byId(req.params.id, { session });
      from = o.status;
      if (from === status) return;
      if (!canTransitionOrderStatus(from, status, o.fulfilment)) {
        throw new ApiError(409, `Order cannot move from ${from} to ${status}.`);
      }
      o.status = status;
      if (status === 'Cancelled') await restoreStock(o, { session });
      o.history.push({
        status,
        note: note || `${from} → ${status}`,
        customerNote: customerNote || '',
        by: req.user.name,
        at: new Date(),
      });
      await o.save({ session });
      await enqueueOrderNotification(o, status, { session });
      changed = true;
    });
  } catch (error) {
    if (error?.name !== 'VersionError') throw error;
    const current = await byId(req.params.id);
    if (current.status !== status) {
      throw new ApiError(409, 'The order changed while you were updating it. Refresh and try again.');
    }
    o = current;
    changed = false;
  }
  if (!changed) return res.json(o);
  logActivity(req, { action: 'status', entity: 'order', entityId: o._id, summary: `Order ${o.orderNumber}: ${from} → ${status}` });
  res.json(o);
});

export const notifications = asyncHandler(async (req, res) => {
  const o = await byId(req.params.id);
  const items = await OrderNotification.find({ order: o._id })
    .sort({ createdAt: 1 })
    .select('status state attempts nextAttemptAt lastAttemptAt acceptedAt lastError providerMessageId createdAt')
    .lean();
  res.json(items.map(({ _id, ...item }) => ({ id: String(_id), ...item })));
});

export const retryNotification = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.notificationId)) throw new ApiError(400, 'Invalid notification id');
  const notification = await retryOrderNotification(req.params.id, req.params.notificationId);
  res.status(202).json({
    id: notification._id,
    status: notification.status,
    state: notification.state,
    attempts: notification.attempts,
  });
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
