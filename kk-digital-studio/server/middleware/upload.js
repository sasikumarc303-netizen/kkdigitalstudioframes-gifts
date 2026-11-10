import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/helpers.js';

export const TMP_DIR = path.join(os.tmpdir(), 'kk-digital-uploads');
fs.mkdirSync(TMP_DIR, { recursive: true });

export const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
export const VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime'];

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, TMP_DIR),
  filename: (_req, _file, cb) => cb(null, crypto.randomBytes(16).toString('hex')),
});

/** multipart parser: accepts images + videos, hard limit is the video limit; per-kind limits are enforced in media service. */
export const upload = multer({
  storage,
  limits: { fileSize: env.maxVideoMB * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, cb) => {
    if ([...IMAGE_MIMES, ...VIDEO_MIMES].includes(file.mimetype)) return cb(null, true);
    cb(new ApiError(415, 'Unsupported file type. Allowed: JPG, PNG, WebP, GIF, AVIF, MP4, WebM, MOV.'));
  },
});

export const uploadImagesOnly = multer({
  storage,
  limits: { fileSize: env.maxImageMB * 1024 * 1024, files: 30 },
  fileFilter: (_req, file, cb) => {
    if (IMAGE_MIMES.includes(file.mimetype)) return cb(null, true);
    cb(new ApiError(415, 'Only JPG, PNG, WebP, GIF or AVIF images are allowed.'));
  },
});
