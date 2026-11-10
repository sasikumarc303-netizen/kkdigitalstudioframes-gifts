import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import { ApiError, asyncHandler, escapeRegex, parsePaging } from '../utils/helpers.js';
import { validate } from '../middleware/validate.js';
import { BOOKING_STATUSES } from '../config/constants.js';
import { logActivity } from '../services/activity.js';

const byId = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, 'Invalid id');
  const b = await Booking.findById(id).populate('customer', 'name phone email');
  if (!b) throw new ApiError(404, 'Booking not found');
  return b;
};

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query, { defaultLimit: 20 });
  const filter = {};
  if (BOOKING_STATUSES.includes(req.query.status)) filter.status = req.query.status;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(String(req.query.q).slice(0, 60)), 'i');
    filter.$or = [{ reference: rx }, { name: rx }, { phone: rx }, { email: rx }, { serviceTitle: rx }];
  }
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (/^\d{4}-\d{2}-\d{2}$/.test(req.query.from || '')) filter.date.$gte = req.query.from;
    if (/^\d{4}-\d{2}-\d{2}$/.test(req.query.to || '')) filter.date.$lte = req.query.to;
    if (!Object.keys(filter.date).length) delete filter.date;
  }
  const [items, total, counts] = await Promise.all([
    Booking.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Booking.countDocuments(filter),
    Booking.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);
  const statusCounts = Object.fromEntries(BOOKING_STATUSES.map((s) => [s, 0]));
  counts.forEach((c) => { statusCounts[c._id] = c.n; });
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)), statusCounts });
});

export const get = asyncHandler(async (req, res) => res.json(await byId(req.params.id)));

export const setStatus = asyncHandler(async (req, res) => {
  const { status, note } = validate({ status: { type: 'enum', values: BOOKING_STATUSES, required: true }, note: { type: 'text', max: 500 } }, req.body);
  const b = await byId(req.params.id);
  const from = b.status;
  b.status = status;
  b.history.push({ action: 'Status changed', status, note: note || `${from} → ${status}`, by: req.user.name, at: new Date() });
  await b.save();
  logActivity(req, { action: 'status', entity: 'booking', entityId: b._id, summary: `Booking ${b.reference}: ${from} → ${status}` });
  res.json(b);
});

export const reschedule = asyncHandler(async (req, res) => {
  const { date, time, note } = validate(
    { date: { type: 'futureDate', required: true }, time: { type: 'time', required: true }, note: { type: 'text', max: 500 } },
    req.body
  );
  const b = await byId(req.params.id);
  const was = `${b.date} ${b.time}`;
  b.date = date;
  b.time = time;
  b.rescheduleRequest = undefined;
  b.history.push({ action: 'Rescheduled', status: b.status, note: note || `${was} → ${date} ${time}`, by: req.user.name, at: new Date() });
  await b.save();
  logActivity(req, { action: 'update', entity: 'booking', entityId: b._id, summary: `Booking ${b.reference} rescheduled to ${date} ${time}` });
  res.json(b);
});

export const update = asyncHandler(async (req, res) => {
  const data = validate({ adminNotes: { type: 'text', max: 2000 }, location: { type: 'text', max: 300 } }, req.body);
  const b = await byId(req.params.id);
  if ('adminNotes' in req.body) b.adminNotes = data.adminNotes || '';
  if ('location' in req.body) b.location = data.location || '';
  await b.save();
  logActivity(req, { action: 'update', entity: 'booking', entityId: b._id, summary: `Updated booking ${b.reference}` });
  res.json(b);
});

export const remove = asyncHandler(async (req, res) => {
  const b = await byId(req.params.id);
  await b.deleteOne();
  logActivity(req, { action: 'delete', entity: 'booking', entityId: b._id, summary: `Deleted booking ${b.reference}` });
  res.json({ ok: true });
});
