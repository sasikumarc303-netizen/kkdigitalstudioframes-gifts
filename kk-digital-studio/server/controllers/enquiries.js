import mongoose from 'mongoose';
import Enquiry from '../models/Enquiry.js';
import { ApiError, asyncHandler, escapeRegex, parsePaging } from '../utils/helpers.js';
import { validate } from '../middleware/validate.js';
import { ENQUIRY_STATUSES } from '../config/constants.js';
import { logActivity } from '../services/activity.js';

const byId = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, 'Invalid id');
  const e = await Enquiry.findById(id);
  if (!e) throw new ApiError(404, 'Enquiry not found');
  return e;
};

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query, { defaultLimit: 20 });
  const filter = {};
  if (ENQUIRY_STATUSES.includes(req.query.status)) filter.status = req.query.status;
  if (['contact', 'product', 'service', 'whatsapp'].includes(req.query.type)) filter.type = req.query.type;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(String(req.query.q).slice(0, 60)), 'i');
    filter.$or = [{ name: rx }, { phone: rx }, { email: rx }, { subject: rx }, { message: rx }, { reference: rx }];
  }
  const [items, total, counts] = await Promise.all([
    Enquiry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Enquiry.countDocuments(filter),
    Enquiry.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
  ]);
  const statusCounts = Object.fromEntries(ENQUIRY_STATUSES.map((s) => [s, 0]));
  counts.forEach((c) => { statusCounts[c._id] = c.n; });
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)), statusCounts });
});

export const get = asyncHandler(async (req, res) => res.json(await byId(req.params.id)));

export const setStatus = asyncHandler(async (req, res) => {
  const { status } = validate({ status: { type: 'enum', values: ENQUIRY_STATUSES, required: true } }, req.body);
  const e = await byId(req.params.id);
  const from = e.status;
  e.status = status;
  await e.save();
  logActivity(req, { action: 'status', entity: 'enquiry', entityId: e._id, summary: `Enquiry from ${e.name}: ${from} → ${status}` });
  res.json(e);
});

export const addNote = asyncHandler(async (req, res) => {
  const { text } = validate({ text: { type: 'text', required: true, max: 1000 } }, req.body);
  const e = await byId(req.params.id);
  e.notes.push({ text, by: req.user.name, at: new Date() });
  await e.save();
  logActivity(req, { action: 'update', entity: 'enquiry', entityId: e._id, summary: `Added a note to enquiry from ${e.name}` });
  res.json(e);
});

export const remove = asyncHandler(async (req, res) => {
  const e = await byId(req.params.id);
  await e.deleteOne();
  logActivity(req, { action: 'delete', entity: 'enquiry', entityId: e._id, summary: `Deleted enquiry from ${e.name}` });
  res.json({ ok: true });
});
