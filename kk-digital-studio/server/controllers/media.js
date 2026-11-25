import mongoose from 'mongoose';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { v2 as cloudinary } from 'cloudinary';
import Media from '../models/Media.js';
import { ApiError, asyncHandler, escapeRegex, parsePaging } from '../utils/helpers.js';
import { validate } from '../middleware/validate.js';
import { env } from '../config/env.js';
import { storeUpload, removeStored, findMediaUsage, PRIVATE_UPLOAD_ROOT, resolveStoredPath } from '../services/media.js';
import { getBackblazeStorage } from '../services/backblaze.js';
import { replaceMediaReferences } from '../services/mediaReferences.js';
import { logActivity } from '../services/activity.js';
import { getConfig, patchConfigPath } from '../services/siteConfig.js';

async function streamStorageResponse(body, res, message) {
  try {
    await pipeline(body, res);
  } catch {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    throw new ApiError(502, message);
  }
}

function publicPreviewDetails(req) {
  const key = String(req.query.key || '');
  if (!/^previews\/[a-f0-9]{32}(?:-poster)?\.(?:webp|mp4|jpg)$/.test(key)) {
    throw new ApiError(404, 'Media preview not found');
  }
  const extension = path.extname(key);
  return {
    key,
    contentType: extension === '.mp4' ? 'video/mp4' : extension === '.jpg' ? 'image/jpeg' : 'image/webp',
  };
}

function setPublicPreviewHeaders(res, contentType, contentLength) {
  res.set({
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
  });
  if (contentLength !== undefined) res.set('Content-Length', String(contentLength));
}

export const backblazePreviewHead = asyncHandler(async (req, res) => {
  const { key, contentType } = publicPreviewDetails(req);
  const result = await getBackblazeStorage().headObject(key);
  setPublicPreviewHeaders(res, contentType, result.ContentLength);
  res.status(200).end();
});

export const backblazePreview = asyncHandler(async (req, res) => {
  const { key, contentType } = publicPreviewDetails(req);
  const result = await getBackblazeStorage().getObject(key, req.get('range'));
  if (!result?.Body) throw new ApiError(404, 'Media preview not found');

  res.status(result.ContentRange ? 206 : 200);
  setPublicPreviewHeaders(res, contentType, result.ContentLength);
  if (result.ContentRange) res.set('Content-Range', result.ContentRange);
  await streamStorageResponse(result.Body, res, 'Media preview could not be streamed');
});

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

export const downloadOriginal = asyncHandler(async (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid media id');
  const media = await Media.findById(req.params.id);
  if (!media) throw new ApiError(404, 'Media not found');
  if (!media.originalProvider) throw new ApiError(409, 'This original has not been migrated to private storage yet');

  const filename = media.originalFilename || `${media.title || 'original'}.${media.type === 'video' ? 'mp4' : 'jpg'}`;
  res.set('Cache-Control', 'private, no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Content-Type', media.originalMime || media.mime || 'application/octet-stream');
  if (media.originalBytes) res.set('Content-Length', String(media.originalBytes));

  if (media.originalProvider === 'local') {
    const originalPath = resolveStoredPath(PRIVATE_UPLOAD_ROOT, media.originalPath);
    return res.download(originalPath, filename, (error) => {
      if (error && !res.headersSent) next(error);
    });
  }

  if (media.originalProvider === 'backblaze') {
    const signedUrl = await getBackblazeStorage().createDownloadUrl(media.originalPublicId, 60);
    let upstream;
    try {
      upstream = await fetch(signedUrl);
    } catch {
      throw new ApiError(502, 'The private original could not be retrieved from storage');
    }
    if (!upstream.ok || !upstream.body) throw new ApiError(502, 'The private original could not be retrieved from storage');
    res.attachment(filename);
    res.set('Content-Type', media.originalMime || media.mime || 'application/octet-stream');
    await streamStorageResponse(Readable.fromWeb(upstream.body), res, 'The private original could not be streamed');
    return;
  }

  if (!env.cloudinaryEnabled) throw new ApiError(503, 'Cloudinary is not configured to serve this original');
  const format = path.extname(filename).slice(1);
  const downloadUrl = cloudinary.utils.private_download_url(media.originalPublicId, format, {
    resource_type: media.type === 'video' ? 'video' : 'image',
    type: 'authenticated',
    expires_at: Math.floor(Date.now() / 1000) + 60,
    attachment: filename,
    secure: true,
  });
  const upstream = await fetch(downloadUrl);
  if (!upstream.ok || !upstream.body) throw new ApiError(502, 'The private original could not be retrieved from storage');
  res.attachment(filename);
  res.set('Content-Type', media.originalMime || media.mime || 'application/octet-stream');
  await pipeline(Readable.fromWeb(upstream.body), res);
});

export const upload = asyncHandler(async (req, res) => {
  const files = req.files || [];
  if (!files.length) throw new ApiError(400, 'No file received');
  const folder = String(req.body.folder || 'general');
  const created = [];
  const errors = [];
  for (const file of files) {
    let stored;
    let media;
    try {
      stored = await storeUpload(file, { folder });
      media = await Media.create({
        ...stored,
        alt: String(req.body.alt || '').slice(0, 300),
        purpose: stored.type === 'video' && ['hero', 'promo'].includes(req.body.purpose) ? req.body.purpose : 'general',
        uploadedBy: req.user._id,
      });
      created.push(media);
    } catch (e) {
      const cleanup = await Promise.allSettled([
        ...(media ? [media.deleteOne()] : []),
        ...(stored ? [removeStored(stored)] : []),
      ]);
      if (cleanup.some((result) => result.status === 'rejected')) {
        console.error('[media] Upload rollback cleanup was incomplete');
      }
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
    const cleanup = await Promise.allSettled([removeStored(stored)]);
    if (cleanup.some((result) => result.status === 'rejected')) {
      console.error('[media] Replacement cleanup was incomplete');
    }
    throw new ApiError(415, `Replacement must be a ${m.type} file`);
  }
  const oldUrl = m.url;
  const oldPoster = m.poster;
  const old = {
    provider: m.provider,
    publicId: m.publicId,
    posterPublicId: m.posterPublicId,
    originalProvider: m.originalProvider,
    originalPublicId: m.originalPublicId,
    originalPath: m.originalPath,
    type: m.type,
  };
  const preserved = { title: m.title, alt: m.alt, folder: m.folder, purpose: m.purpose, uploadedBy: m.uploadedBy };
  Object.assign(m, stored, preserved, {
    legacyProvider: old.provider,
    legacyPublicId: old.publicId,
    legacyPosterPublicId: old.posterPublicId,
    legacyOriginalProvider: old.originalProvider,
    legacyOriginalPublicId: old.originalPublicId,
    legacyOriginalPath: old.originalPath,
    legacyType: old.type,
    legacyUrl: oldUrl,
    legacyPoster: oldPoster,
  });
  try {
    await m.save();
  } catch (error) {
    const cleanup = await Promise.allSettled([removeStored(stored)]);
    if (cleanup.some((result) => result.status === 'rejected')) {
      console.error('[media] Replacement rollback cleanup was incomplete');
    }
    throw error;
  }
  await replaceMediaReferences(oldUrl, m.url);
  if (oldPoster && stored.poster) await replaceMediaReferences(oldPoster, stored.poster);
  await removeStored(old);
  m.legacyProvider = undefined;
  m.legacyPublicId = '';
  m.legacyPosterPublicId = '';
  m.legacyOriginalProvider = undefined;
  m.legacyOriginalPublicId = '';
  m.legacyOriginalPath = '';
  m.legacyType = undefined;
  m.legacyUrl = '';
  m.legacyPoster = '';
  await m.save();
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
