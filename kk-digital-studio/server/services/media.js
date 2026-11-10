import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import { env, SERVER_ROOT } from '../config/env.js';
import { ApiError } from '../utils/helpers.js';
import Media from '../models/Media.js';
import Service from '../models/Service.js';
import GalleryImage from '../models/GalleryImage.js';
import Package from '../models/Package.js';
import Product from '../models/Product.js';
import Testimonial from '../models/Testimonial.js';
import SiteConfig from '../models/SiteConfig.js';

export const UPLOAD_ROOT = path.join(SERVER_ROOT, 'uploads');

if (env.cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  });
}

const EXT = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
};

/** Detect real file type from magic bytes – never trust the client-supplied mimetype alone. */
export function sniffMime(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (buf.subarray(0, 3).toString('ascii') === 'GIF') return 'image/gif';
  if (buf.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = buf.subarray(8, 12).toString('ascii');
    if (brand === 'avif' || brand === 'avis') return 'image/avif';
    if (brand === 'qt  ') return 'video/quicktime';
    return 'video/mp4';
  }
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return 'video/webm';
  return null;
}

async function readHead(file) {
  const fh = await fs.open(file, 'r');
  try {
    const buf = Buffer.alloc(16);
    await fh.read(buf, 0, 16, 0);
    return buf;
  } finally {
    await fh.close();
  }
}

const safeName = (n) =>
  String(n || 'file')
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'file';

/**
 * Validates one multer file and stores it (Cloudinary when configured, otherwise server/uploads).
 * Always removes the temporary file. Returns fields for a Media document.
 */
export async function storeUpload(file, { folder = 'general' } = {}) {
  try {
    const sniffed = sniffMime(await readHead(file.path));
    if (!sniffed) throw new ApiError(415, `"${file.originalname}" is not a supported image or video file`);
    const kind = sniffed.startsWith('video/') ? 'video' : 'image';
    const claimedKind = file.mimetype.startsWith('video/') ? 'video' : 'image';
    if (kind !== claimedKind) throw new ApiError(415, `"${file.originalname}" content does not match its file type`);
    const limitMB = kind === 'video' ? env.maxVideoMB : env.maxImageMB;
    if (file.size > limitMB * 1024 * 1024) throw new ApiError(413, `"${file.originalname}" exceeds the ${limitMB} MB ${kind} limit`);

    const folderSlug = safeName(folder);
    const base = {
      type: kind,
      title: safeName(file.originalname).replace(/-/g, ' '),
      folder: folderSlug,
      mime: sniffed,
      bytes: file.size,
    };

    if (env.cloudinaryEnabled) {
      const opts = { folder: `kk-digital-studio/${folderSlug}`, resource_type: kind, use_filename: false, unique_filename: true };
      const res = kind === 'video'
        ? await cloudinary.uploader.upload_large(file.path, { ...opts, chunk_size: 6_000_000 })
        : await cloudinary.uploader.upload(file.path, opts);
      return {
        ...base,
        provider: 'cloudinary',
        url: res.secure_url,
        publicId: res.public_id,
        width: res.width,
        height: res.height,
        duration: res.duration,
        poster: kind === 'video' ? res.secure_url.replace('/video/upload/', '/video/upload/so_0/').replace(/\.[a-z0-9]+$/i, '.jpg') : '',
      };
    }

    const now = new Date();
    const rel = path.posix.join(String(now.getUTCFullYear()), String(now.getUTCMonth() + 1).padStart(2, '0'));
    const filename = `${crypto.randomBytes(6).toString('hex')}-${safeName(file.originalname)}.${EXT[sniffed]}`;
    await fs.mkdir(path.join(UPLOAD_ROOT, rel), { recursive: true });
    await fs.copyFile(file.path, path.join(UPLOAD_ROOT, rel, filename));
    return { ...base, provider: 'local', url: `/uploads/${rel}/${filename}`, publicId: `${rel}/${filename}` };
  } finally {
    fs.unlink(file.path).catch(() => {});
  }
}

export async function removeStored(media) {
  if (media.provider === 'cloudinary' && env.cloudinaryEnabled) {
    await cloudinary.uploader.destroy(media.publicId, { resource_type: media.type, invalidate: true });
  } else if (media.provider === 'local') {
    const target = path.resolve(UPLOAD_ROOT, media.publicId);
    if (target.startsWith(UPLOAD_ROOT + path.sep)) await fs.unlink(target).catch(() => {});
  }
  // 'static' assets ship with the client build and are never deleted from disk.
}

/** Where is this media URL used? Returns human-readable labels (empty array = unused). */
export async function findMediaUsage(url) {
  const used = [];
  const [svc, gal, pkg, prod, tst, vid, cfg] = await Promise.all([
    Service.countDocuments({ image: url }),
    GalleryImage.countDocuments({ image: url }),
    Package.countDocuments({ image: url }),
    Product.countDocuments({ images: url }),
    Testimonial.countDocuments({ avatar: url }),
    Media.countDocuments({ poster: url }),
    SiteConfig.findOne({ key: 'main' }).lean(),
  ]);
  if (svc) used.push(`${svc} service(s)`);
  if (gal) used.push(`${gal} gallery photo(s)`);
  if (pkg) used.push(`${pkg} package(s)`);
  if (prod) used.push(`${prod} product(s)`);
  if (tst) used.push(`${tst} testimonial(s)`);
  if (vid) used.push(`${vid} video poster(s)`);
  if (cfg && JSON.stringify(cfg.data || {}).includes(JSON.stringify(url).slice(1, -1))) used.push('website settings / homepage');
  return used;
}
