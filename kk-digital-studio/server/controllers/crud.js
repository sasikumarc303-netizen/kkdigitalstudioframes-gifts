import mongoose from 'mongoose';
import { ApiError, asyncHandler, escapeRegex, parsePaging, pick } from '../utils/helpers.js';
import { logActivity } from '../services/activity.js';

const objectIdPaths = (Model) =>
  Object.entries(Model.schema.paths)
    .filter(([, p]) => p.instance === 'ObjectId' || p.instance === 'ObjectID')
    .map(([k]) => k);

const stringArray = (v) => (Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : []);

/**
 * Generic admin CRUD handlers for a Mongoose model.
 * Returns { list, get, create, update, remove, bulk } – permissions are applied in the router.
 */
export function crud({
  Model,
  entity,
  fields,
  stringArrays = [],
  searchFields = [],
  filters = [],
  sort = { order: 1, createdAt: -1 },
  populate,
  label = (d) => d.title || d.name || String(d._id),
  sanitize,
  beforeDelete,
}) {
  const idPaths = objectIdPaths(Model);

  const normalize = async (body) => {
    const data = pick(body, fields);
    for (const k of idPaths) if (k in data && (data[k] === '' || data[k] === null)) data[k] = null;
    for (const k of stringArrays) if (k in data) data[k] = stringArray(data[k]);
    if (sanitize) return sanitize(data);
    return data;
  };

  const find = (id) => {
    if (!mongoose.isValidObjectId(id)) throw new ApiError(400, 'Invalid id');
    let q = Model.findById(id);
    if (populate) q = q.populate(populate);
    return q;
  };

  const list = asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePaging(req.query, { defaultLimit: 24, maxLimit: 200 });
    const filter = {};
    if (req.query.q && searchFields.length) {
      const rx = new RegExp(escapeRegex(String(req.query.q).slice(0, 80)), 'i');
      filter.$or = searchFields.map((f) => ({ [f]: rx }));
    }
    if (req.query.published === 'true' || req.query.published === 'false') filter.published = req.query.published === 'true';
    for (const f of filters) if (req.query[f] !== undefined && req.query[f] !== '') filter[f] = req.query[f];
    let q = Model.find(filter).sort(sort).skip(skip).limit(limit);
    if (populate) q = q.populate(populate);
    const [items, total] = await Promise.all([q, Model.countDocuments(filter)]);
    res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  });

  const get = asyncHandler(async (req, res) => {
    const doc = await find(req.params.id);
    if (!doc) throw new ApiError(404, 'Not found');
    res.json(doc);
  });

  const create = asyncHandler(async (req, res) => {
    const doc = new Model(await normalize(req.body));
    await doc.save();
    logActivity(req, { action: 'create', entity, entityId: doc._id, summary: `Created ${entity} “${label(doc)}”` });
    res.status(201).json(populate ? await find(doc._id) : doc);
  });

  const update = asyncHandler(async (req, res) => {
    const doc = await Model.findById(req.params.id);
    if (!doc) throw new ApiError(404, 'Not found');
    doc.set(await normalize(req.body));
    await doc.save();
    logActivity(req, { action: 'update', entity, entityId: doc._id, summary: `Updated ${entity} “${label(doc)}”` });
    res.json(populate ? await find(doc._id) : doc);
  });

  const remove = asyncHandler(async (req, res) => {
    const doc = await Model.findById(req.params.id);
    if (!doc) throw new ApiError(404, 'Not found');
    if (beforeDelete) await beforeDelete(doc);
    await doc.deleteOne();
    logActivity(req, { action: 'delete', entity, entityId: doc._id, summary: `Deleted ${entity} “${label(doc)}”` });
    res.json({ ok: true });
  });

  /** POST /bulk { ids:[], action:'publish'|'unpublish'|'delete' } */
  const bulk = asyncHandler(async (req, res) => {
    const ids = (Array.isArray(req.body.ids) ? req.body.ids : []).filter((i) => mongoose.isValidObjectId(i)).slice(0, 200);
    if (!ids.length) throw new ApiError(400, 'No items selected');
    const { action } = req.body;
    if (action === 'publish' || action === 'unpublish') {
      await Model.updateMany({ _id: { $in: ids } }, { $set: { published: action === 'publish' } });
    } else if (action === 'delete') {
      if (beforeDelete) {
        const docs = await Model.find({ _id: { $in: ids } });
        for (const d of docs) await beforeDelete(d);
      }
      await Model.deleteMany({ _id: { $in: ids } });
    } else throw new ApiError(400, 'Unknown bulk action');
    logActivity(req, { action: 'update', entity, summary: `Bulk ${action} on ${ids.length} ${entity}(s)` });
    res.json({ ok: true, count: ids.length });
  });

  return { list, get, create, update, remove, bulk };
}
