import mongoose from 'mongoose';
import Media from '../models/Media.js';
import { ApiError, asyncHandler, escapeRegex, parsePaging } from '../utils/helpers.js';
import { validate } from '../middleware/validate.js';
import { storeUpload, removeStored, findMediaUsage } from '../services/media.js';
import { logActivity } from '../services/activity.js';
import { getConfig, patchConfigPath } from '../services/siteConfig.js';

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePaging(req.query, { defaultLimit: 30, maxLimit: 100 });
  const filter = {};
  if (['image', 'video'].includes(req.query.type)) filter.type = req.query.type;
  if (['general', 'hero', 'promo'].includes(req.query.purpose)) filter.purpose = req.query.purpose;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(String(req.query.q).slice(0, 60)), 'i');
    filter.$or = [{ title: rx }, { alt: rx }, { folder: rx }];
  }
  const [items, total] = await Promise.all([
    Media.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Media.countDocuments(filter),
  ]);
  const cfg = await getConfig();
  res.json({
    items, total, page, pages: Math.max(1, Math.ceil(total / limit)),
    hero: { desktop: cfg.homepage.hero.video, mobile: cfg.homepage.hero.videoMobile },
  });
});

export const upload = asyncHandler(async (req, res) => {
  const files = req.files || [];
  if (!files.length) throw new ApiError(400, 'No file received');
  const folder = String(req.body.folder || 'general');
  const created = [];
  const errors = [];
  for (const file of files) {
    try {
      const stored = await storeUpload(file, { folder });
      const media = await Media.create({
        ...stored,
        alt: String(req.body.alt || '').slice(0, 300),
        purpose: stored.type === 'video' && ['hero', 'promo'].includes(req.body.purpose) ? req.body.purpose : 'general',
        uploadedBy: req.user._id,
      });
      created.push(media);
    } catch (e) {
      errors.push({ file: file.originalname, message: e.message });
    }
  }
  if (created.length) logActivity(req, { action: 'upload', entity: 'media', summary: `Uploaded ${created.length} file(s): ${created.map((m) => m.title).join(', ').slice(0, 200)}` });
  res.status(created.length ? 201 : 400).json(created.length ? { created, errors } : { created, errors, message: errors[0]?.message || 'Upload failed' });
});

export const update = asyncHandler(async (req, res) => {
  const data = validate(
    { title: { type: 'text', max: 160 }, alt: { type: 'text', max: 300 }, poster: { type: 'text', max: 600 }, purpose: { type: 'enum', values: ['general', 'hero', 'promo'] } },
    req.body
  );
  const m = await Media.findById(req.params.id);
  if (!m) throw new ApiError(404, 'Media not found');
  for (const k of ['title', 'alt', 'poster']) if (k in req.body) m[k] = data[k] || '';
  if (data.purpose && m.type === 'video') m.purpose = data.purpose;
  await m.save();
  logActivity(req, { action: 'update', entity: 'media', entityId: m._id, summary: `Updated media “${m.title}”` });
  res.json(m);
});

/** Replace the file behind an existing media record (keeps the record, swaps the asset). */
export const replace = asyncHandler(async (req, res) => {
  const file = (req.files || [])[0];
  if (!file) throw new ApiError(400, 'No file received');
  const m = await Media.findById(req.params.id);
  if (!m) throw new ApiError(404, 'Media not found');
  const stored = await storeUpload(file, { folder: m.folder });
  if (stored.type !== m.type) {
    await removeStored({ ...stored, publicId: stored.publicId });
    throw new ApiError(415, `Replacement must be a ${m.type} file`);
  }
  const oldUrl = m.url;
  const old = { provider: m.provider, publicId: m.publicId, type: m.type };
  Object.assign(m, { url: stored.url, provider: stored.provider, publicId: stored.publicId, bytes: stored.bytes, mime: stored.mime, width: stored.width, height: stored.height, duration: stored.duration });
  if (m.type === 'video' && stored.poster) m.poster = stored.poster;
  await m.save();
  // Anything that pointed at the old URL now points at the new asset.
  const cfg = await getConfig();
  if (cfg.homepage.hero.video === oldUrl) await patchConfigPath('homepage.hero.video', m.url);
  if (cfg.homepage.hero.videoMobile === oldUrl) await patchConfigPath('homepage.hero.videoMobile', m.url);
  await removeStored(old);
  logActivity(req, { action: 'update', entity: 'media', entityId: m._id, summary: `Replaced file for “${m.title}”` });
  res.json(m);
});

export const remove = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid id');
  const m = await Media.findById(req.params.id);
  if (!m) throw new ApiError(404, 'Media not found');
  const used = await findMediaUsage(m.url);
  if (used.length) throw new ApiError(409, `Cannot delete: this file is in use by ${used.join(', ')}. Replace it there first.`);
  await removeStored(m);
  await m.deleteOne();
  logActivity(req, { action: 'delete', entity: 'media', entityId: m._id, summary: `Deleted media “${m.title}”` });
  res.json({ ok: true });
});

/** Make a video the homepage hero. body: { device: 'desktop' | 'mobile' | 'both' } */
export const setHero = asyncHandler(async (req, res) => {
  const { device } = validate({ device: { type: 'enum', values: ['desktop', 'mobile', 'both'], required: true } }, req.body);
  const m = await Media.findById(req.params.id);
  if (!m || m.type !== 'video') throw new ApiError(404, 'Video not found');
  if (device === 'desktop' || device === 'both') {
    await patchConfigPath('homepage.hero.video', m.url);
    if (m.poster) await patchConfigPath('homepage.hero.poster', m.poster);
  }
  if (device === 'mobile' || device === 'both') {
    await patchConfigPath('homepage.hero.videoMobile', m.url);
    if (m.poster) await patchConfigPath('homepage.hero.posterMobile', m.poster);
  }
  await Media.updateMany({ purpose: 'hero', _id: { $ne: m._id } }, { $set: { purpose: 'general' } });
  m.purpose = 'hero';
  await m.save();
  logActivity(req, { action: 'update', entity: 'homepage video', entityId: m._id, summary: `Set “${m.title}” as homepage hero video (${device})` });
  res.json({ ok: true, hero: (await getConfig()).homepage.hero });
});
