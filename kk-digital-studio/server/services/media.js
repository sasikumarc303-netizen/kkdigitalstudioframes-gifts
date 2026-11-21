import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import ffmpegPath from 'ffmpeg-static';
import { v2 as cloudinary } from 'cloudinary';
import { env, SERVER_ROOT } from '../config/env.js';
import { ApiError } from '../utils/helpers.js';
import Media from '../models/Media.js';
import Service from '../models/Service.js';
import GalleryImage from '../models/GalleryImage.js';
import Package from '../models/Package.js';
import Product from '../models/Product.js';
import Testimonial from '../models/Testimonial.js';
import Order from '../models/Order.js';
import SiteConfig from '../models/SiteConfig.js';

export const UPLOAD_ROOT = path.join(SERVER_ROOT, 'uploads');
export const PRIVATE_UPLOAD_ROOT = path.join(UPLOAD_ROOT, 'private');
export const PUBLIC_MEDIA_ROOT = path.join(UPLOAD_ROOT, 'previews');

const require = createRequire(import.meta.url);
const watermarkFontPath = require.resolve('dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf');

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

const watermarkText = env.mediaWatermarkText || '© KK DIGITAL STUDIO';

async function prepareWatermark(workDir) {
  await Promise.all([
    fs.writeFile(path.join(workDir, 'watermark.txt'), watermarkText, 'utf8'),
    fs.copyFile(watermarkFontPath, path.join(workDir, 'watermark-font.ttf')),
  ]);
}

function watermarkFilter(maxFontSize) {
  return `drawtext=fontfile=watermark-font.ttf:textfile=watermark.txt:expansion=none:fontcolor=white:fontsize='max(12,min(${maxFontSize},w*0.035))':borderw=2:bordercolor=0x1b271f@0.78:x='w-tw-max(14,w*0.025)':y='h-th-max(14,w*0.025)'`;
}

function runFfmpeg(args, label, cwd) {
  if (!ffmpegPath) throw new ApiError(503, 'Media preview processing is unavailable');
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { cwd, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => { stderr = `${stderr}${chunk}`.slice(-3000); });
    child.once('error', () => reject(new ApiError(503, 'Video preview processing could not start')));
    child.once('close', (code) => {
      if (code === 0) return resolve();
      console.error(`[media] ${label} failed (ffmpeg exit ${code}): ${stderr}`);
      return reject(new ApiError(422, `Could not create the protected ${label}`));
    });
  });
}

async function createPreviewFiles(sourcePath, type, workDir) {
  await prepareWatermark(workDir);
  if (type === 'image') {
    const previewPath = path.join(workDir, 'preview.webp');
    const filter = `scale=w='min(1600,iw)':h='min(1600,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,${watermarkFilter(42)}`;
    await runFfmpeg([
      '-y', '-i', sourcePath, '-vf', filter, '-frames:v', '1',
      '-c:v', 'libwebp', '-quality', '84', '-compression_level', '4', previewPath,
    ], 'image preview', workDir);
    return { previewPath };
  }

  const previewPath = path.join(workDir, 'preview.mp4');
  const posterPath = path.join(workDir, 'poster.jpg');
  const filter = `scale=w='min(1280,iw)':h='min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,${watermarkFilter(24)}`;
  await runFfmpeg([
    '-y', '-i', sourcePath, '-vf', filter, '-map', '0:v:0', '-map', '0:a?',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-pix_fmt', 'yuv420p', '-threads', '2',
    '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', previewPath,
  ], 'video preview', workDir);
  await runFfmpeg(['-y', '-i', previewPath, '-frames:v', '1', '-q:v', '3', posterPath], 'video poster', workDir);
  return { previewPath, posterPath };
}

async function uploadCloudinary(filePath, kind, folder, publicId, type) {
  const options = {
    folder,
    public_id: publicId,
    resource_type: kind,
    type,
    use_filename: false,
    unique_filename: false,
    overwrite: false,
  };
  return kind === 'video'
    ? cloudinary.uploader.upload_large(filePath, { ...options, chunk_size: 6_000_000 })
    : cloudinary.uploader.upload(filePath, options);
}

async function storePrivateOriginal(file, kind, mime, folderSlug, id) {
  const extension = EXT[mime];
  if (env.cloudinaryEnabled) {
    const asset = await uploadCloudinary(
      file.path,
      kind,
      `kk-digital-studio/private/${folderSlug}`,
      id,
      'authenticated'
    );
    return {
      originalProvider: 'cloudinary',
      originalPublicId: asset.public_id,
      originalMime: mime,
      originalBytes: file.size,
      originalFilename: `${safeName(file.originalname)}.${extension}`,
    };
  }

  await fs.mkdir(PRIVATE_UPLOAD_ROOT, { recursive: true });
  const filename = `${id}.${extension}`;
  await fs.copyFile(file.path, path.join(PRIVATE_UPLOAD_ROOT, filename));
  return {
    originalProvider: 'local',
    originalPath: filename,
    originalMime: mime,
    originalBytes: file.size,
    originalFilename: `${safeName(file.originalname)}.${extension}`,
  };
}

async function storePublicPreview(files, kind, id) {
  const { previewPath, posterPath, width, height } = files;
  if (env.cloudinaryEnabled) {
    let preview;
    let poster = null;
    try {
      preview = await uploadCloudinary(
        previewPath,
        kind,
        'kk-digital-studio/previews',
        id,
        'upload'
      );
      if (posterPath) {
        poster = await uploadCloudinary(
          posterPath,
          'image',
          'kk-digital-studio/previews',
          `${id}-poster`,
          'upload'
        );
      }
    } catch (error) {
      const cleanup = [];
      if (preview?.public_id) cleanup.push(destroyCloudinary(preview.public_id, kind, 'upload'));
      if (poster?.public_id) cleanup.push(destroyCloudinary(poster.public_id, 'image', 'upload'));
      const results = await Promise.allSettled(cleanup);
      results.filter((result) => result.status === 'rejected').forEach((result) => {
        console.error('[media] Failed to remove an incomplete preview:', result.reason);
      });
      throw error;
    }
    return {
      provider: 'cloudinary',
      url: preview.secure_url,
      publicId: preview.public_id,
      poster: poster?.secure_url || '',
      posterPublicId: poster?.public_id || '',
      width: width || preview.width,
      height: height || preview.height,
      duration: preview.duration,
    };
  }

  await fs.mkdir(PUBLIC_MEDIA_ROOT, { recursive: true });
  const extension = kind === 'video' ? 'mp4' : 'webp';
  const filename = `${id}.${extension}`;
  const previewRelativePath = path.posix.join('previews', filename);
  const previewFile = path.join(PUBLIC_MEDIA_ROOT, filename);
  let posterFile = '';
  try {
    await fs.copyFile(previewPath, previewFile);
    if (posterPath) {
      const posterFilename = `${id}-poster.jpg`;
      posterFile = path.join(PUBLIC_MEDIA_ROOT, posterFilename);
      await fs.copyFile(posterPath, posterFile);
    }
  } catch (error) {
    await Promise.all([
      fs.rm(previewFile, { force: true }),
      posterFile ? fs.rm(posterFile, { force: true }) : Promise.resolve(),
    ]);
    throw error;
  }
  let poster = '';
  let posterPublicId = '';
  if (posterPath) {
    const posterFilename = `${id}-poster.jpg`;
    posterPublicId = path.posix.join('previews', posterFilename);
    poster = `${env.mediaBaseUrl}/api/media/previews/${posterFilename}`;
  }
  return {
    provider: 'local',
    url: `${env.mediaBaseUrl}/api/media/previews/${filename}`,
    publicId: previewRelativePath,
    poster,
    posterPublicId,
    width,
    height,
  };
}

async function destroyCloudinary(publicId, resourceType, type) {
  if (!publicId) return;
  if (!env.cloudinaryEnabled) throw new ApiError(503, 'Cloudinary is not configured to manage this media');
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType, type, invalidate: true });
}

export function resolveStoredPath(root, relativePath) {
  const resolvedRoot = path.resolve(root);
  const target = path.resolve(resolvedRoot, String(relativePath || ''));
  const relative = path.relative(resolvedRoot, target);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new ApiError(400, 'Invalid media storage path');
  }
  return target;
}

async function removeLocalPath(root, relativePath) {
  if (!relativePath) return;
  await fs.rm(resolveStoredPath(root, relativePath), { force: true });
}

/**
 * Validates an upload, keeps its original private, and stores a separate
 * reduced, watermarked public preview. Temporary and source files are removed.
 */
export async function storeUpload(file, { folder = 'general' } = {}) {
  let workDir;
  let original;
  let preview;
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
    workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kk-protected-media-'));
    const files = await createPreviewFiles(file.path, kind, workDir);
    const id = crypto.randomUUID().replace(/-/g, '');
    original = await storePrivateOriginal(file, kind, sniffed, folderSlug, id);
    preview = await storePublicPreview(files, kind, id);
    return { ...base, ...preview, ...original };
  } catch (error) {
    const cleanup = [];
    if (preview) cleanup.push(removeStored({ ...preview, type: file.mimetype.startsWith('video/') ? 'video' : 'image' }));
    if (original) cleanup.push(removeStored({ ...original, type: file.mimetype.startsWith('video/') ? 'video' : 'image' }));
    const results = await Promise.allSettled(cleanup);
    results.filter((result) => result.status === 'rejected').forEach((result) => {
      console.error('[media] Failed to remove an incomplete upload:', result.reason);
    });
    throw error;
  } finally {
    if (workDir) await fs.rm(workDir, { recursive: true, force: true });
    await fs.rm(file.path, { force: true });
  }
}

export async function removeStored(media) {
  const resourceType = media.type === 'video' ? 'video' : 'image';
  if (media.provider === 'cloudinary' && media.publicId) {
    await destroyCloudinary(media.publicId, resourceType, 'upload');
  } else if (media.provider === 'local' && media.publicId) {
    await removeLocalPath(UPLOAD_ROOT, media.publicId);
  }
  if (media.posterPublicId) {
    if (media.provider === 'cloudinary') await destroyCloudinary(media.posterPublicId, 'image', 'upload');
    else await removeLocalPath(UPLOAD_ROOT, media.posterPublicId);
  }
  if (media.originalProvider === 'cloudinary') {
    await destroyCloudinary(media.originalPublicId, resourceType, 'authenticated');
  } else if (media.originalProvider === 'local') {
    await removeLocalPath(PRIVATE_UPLOAD_ROOT, media.originalPath);
  }
}

/** Where is this media URL used? Returns human-readable labels (empty array = unused). */
export async function findMediaUsage(url) {
  const used = [];
  const [svc, gal, pkg, prod, tst, vid, cfg, orders] = await Promise.all([
    Service.countDocuments({ image: url }),
    GalleryImage.countDocuments({ image: url }),
    Package.countDocuments({ image: url }),
    Product.countDocuments({ images: url }),
    Testimonial.countDocuments({ avatar: url }),
    Media.countDocuments({ poster: url }),
    SiteConfig.findOne({ key: 'main' }).lean(),
    Order.countDocuments({ 'items.image': url }),
  ]);
  if (svc) used.push(`${svc} service(s)`);
  if (gal) used.push(`${gal} gallery photo(s)`);
  if (pkg) used.push(`${pkg} package(s)`);
  if (prod) used.push(`${prod} product(s)`);
  if (tst) used.push(`${tst} testimonial(s)`);
  if (vid) used.push(`${vid} video poster(s)`);
  if (orders) used.push(`${orders} order(s)`);
  if (cfg && JSON.stringify(cfg.data || {}).includes(JSON.stringify(url).slice(1, -1))) used.push('website settings / homepage');
  return used;
}
