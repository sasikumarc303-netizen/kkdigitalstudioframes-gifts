import ActivityLog from '../models/ActivityLog.js';
import { asyncHandler, escapeRegex, parsePaging } from '../utils/helpers.js';

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query, { defaultLimit: 40, maxLimit: 100 });
  const filter = {};
  if (req.query.action) filter.action = String(req.query.action);
  if (req.query.actorType) filter.actorType = String(req.query.actorType);
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(String(req.query.q).slice(0, 60)), 'i');
    filter.$or = [{ summary: rx }, { actorName: rx }, { entity: rx }];
  }
  const [items, total] = await Promise.all([
    ActivityLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ActivityLog.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});
