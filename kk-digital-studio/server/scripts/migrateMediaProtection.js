import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { connectDB, disconnectDB } from '../config/db.js';
import { env } from '../config/env.js';
import Media from '../models/Media.js';
import { storeUpload, removeStored, UPLOAD_ROOT, resolveStoredPath } from '../services/media.js';
import { replaceMediaReferences } from '../services/mediaReferences.js';
import { ApiError } from '../utils/helpers.js';

const EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};

async function copyLegacySource(media, destination) {
  if (media.provider === 'local') {
    await fs.copyFile(resolveStoredPath(UPLOAD_ROOT, media.publicId), destination);
    return;
  }
  if (media.provider !== 'cloudinary' || !env.cloudinaryEnabled) {
    throw new ApiError(503, 'Cloudinary configuration is required to migrate this media');
  }

  let url;
  try {
    url = new URL(media.url);
  } catch {
    throw new ApiError(422, 'Legacy Cloudinary media has an invalid URL');
  }
  if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com') {
    throw new ApiError(422, 'Legacy Cloudinary media URL is not on the expected Cloudinary host');
  }
  const response = await fetch(url, { redirect: 'error' });
  if (!response.ok || !response.body) throw new ApiError(502, 'Could not retrieve a legacy Cloudinary original');
  await pipeline(Readable.fromWeb(response.body), createWriteStream(destination, { flags: 'wx' }));
}

async function finishLegacyMigration(media) {
  await replaceMediaReferences(media.legacyUrl, media.url);
  if (media.legacyPoster && media.poster) await replaceMediaReferences(media.legacyPoster, media.poster);
  await removeStored({
    provider: media.legacyProvider,
    publicId: media.legacyPublicId,
    type: media.legacyType,
  });
  media.legacyProvider = undefined;
  media.legacyPublicId = '';
  media.legacyType = undefined;
  media.legacyUrl = '';
  media.legacyPoster = '';
  await media.save();
}

async function migrateOne(media) {
  if (media.legacyProvider) {
    await finishLegacyMigration(media);
    return 'completed';
  }
  if (media.originalProvider || media.provider === 'static') return 'skipped';
  if (!media.publicId || !['cloudinary', 'local'].includes(media.provider)) {
    throw new ApiError(422, `Media ${media._id} has no migratable source`);
  }

  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kk-media-migration-'));
  const extension = EXT[media.mime] || (media.type === 'video' ? 'mp4' : 'jpg');
  const sourcePath = path.join(workDir, `source.${extension}`);
  let stored;
  let saved = false;
  try {
    await copyLegacySource(media, sourcePath);
    const stat = await fs.stat(sourcePath);
    stored = await storeUpload({
      path: sourcePath,
      originalname: `${media.title || 'legacy-media'}.${extension}`,
      mimetype: media.mime || (media.type === 'video' ? 'video/mp4' : 'image/jpeg'),
      size: stat.size,
    }, { folder: media.folder || 'general' });

    const legacy = {
      provider: media.provider,
      publicId: media.publicId,
      type: media.type,
      url: media.url,
    };
    const preserved = {
      title: media.title,
      alt: media.alt,
      folder: media.folder,
      purpose: media.purpose,
      uploadedBy: media.uploadedBy,
    };
    Object.assign(media, stored, preserved, {
      legacyProvider: legacy.provider,
      legacyPublicId: legacy.publicId,
      legacyType: legacy.type,
      legacyUrl: legacy.url,
      legacyPoster: media.poster,
    });
    await media.save();
    saved = true;
    await finishLegacyMigration(media);
    return 'migrated';
  } catch (error) {
    if (stored && !saved) await removeStored(stored);
    throw error;
  } finally {
    await fs.rm(workDir, { recursive: true, force: true });
  }
}

await connectDB();
let migrated = 0;
let skipped = 0;
const errors = [];
try {
  for await (const media of Media.find().cursor()) {
    try {
      const result = await migrateOne(media);
      if (result === 'migrated' || result === 'completed') migrated += 1;
      else skipped += 1;
    } catch (error) {
      errors.push({ id: String(media._id), message: error.message });
      console.error(`[media-migration] ${media._id}: ${error.message}`);
    }
  }
} finally {
  await disconnectDB();
}

console.log(`Media migration complete: ${migrated} migrated/completed, ${skipped} skipped, ${errors.length} failed.`);
if (errors.length) process.exitCode = 1;
