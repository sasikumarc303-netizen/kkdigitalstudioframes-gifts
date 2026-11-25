import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { test } from 'node:test';

process.env.CLOUDINARY_CLOUD_NAME = '';
process.env.CLOUDINARY_API_KEY = '';
process.env.CLOUDINARY_API_SECRET = '';

const { env } = await import('../config/env.js');
const {
  getMediaStorageProvider,
  removeStored,
  resolveStoredPath,
  storeUpload,
} = await import('./media.js');

const fixtures = [
  { extension: 'jpg', mime: 'image/jpeg', format: 'jpeg' },
  { extension: 'jpeg', mime: 'image/jpeg', format: 'jpeg' },
  { extension: 'png', mime: 'image/png', format: 'png' },
  { extension: 'webp', mime: 'image/webp', format: 'webp' },
];

test('Backblaze is selected for images while videos retain the previous provider', () => {
  const previous = {
    storageProvider: env.storageProvider,
    cloudinaryEnabled: env.cloudinaryEnabled,
    isProd: env.isProd,
    backblaze: { ...env.backblaze },
  };
  Object.assign(env, {
    storageProvider: 'backblaze',
    cloudinaryEnabled: true,
    isProd: true,
    backblaze: {},
  });

  try {
    assert.equal(getMediaStorageProvider('video'), 'cloudinary');
    assert.throws(() => getMediaStorageProvider('image'), /Backblaze B2 storage is not configured/);
    env.backblaze = {
      bucketName: 'kk-digital-studio-staging',
      endpoint: 'https://s3.us-east-005.backblazeb2.com',
      region: 'us-east-005',
      keyId: 'test-key-id',
      applicationKey: 'test-application-key',
    };
    assert.equal(getMediaStorageProvider('image'), 'backblaze');
    env.cloudinaryEnabled = false;
    assert.throws(() => getMediaStorageProvider('video'), /Cloudinary must be configured/);
    env.isProd = false;
    assert.equal(getMediaStorageProvider('video'), 'local');
  } finally {
    Object.assign(env, previous);
  }
});

test('image uploads create watermarked WebP previews and keep source files private', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kk-media-test-'));
  const uploadRoot = path.join(tempDir, 'storage');
  const privateRoot = path.join(uploadRoot, 'private');
  try {
    for (const fixture of fixtures) {
      const sourcePath = path.join(tempDir, `source.${fixture.extension}`);
      let stored;
      try {
        const source = await sharp({
          create: {
            width: 480,
            height: 320,
            channels: 3,
            background: { r: 45, g: 85, b: 125 },
          },
        })[fixture.format]().toBuffer();
        await fs.writeFile(sourcePath, source);
        stored = await storeUpload({
          path: sourcePath,
          originalname: `studio.${fixture.extension}`,
          mimetype: fixture.mime,
          size: source.length,
        }, { folder: 'test', uploadRoot, privateRoot });

        assert.equal(stored.type, 'image');
        assert.equal(stored.mime, fixture.mime);
        assert.equal(stored.width, 480);
        assert.equal(stored.height, 320);
        assert.equal(stored.url.endsWith(`/${path.basename(stored.publicId)}`), true);

        const originalPath = resolveStoredPath(privateRoot, stored.originalPath);
        assert.deepEqual(await fs.readFile(originalPath), source);

        const previewPath = resolveStoredPath(uploadRoot, stored.publicId);
        const previewBytes = await fs.readFile(previewPath);
        const previewMetadata = await sharp(previewBytes).metadata();
        assert.equal(previewMetadata.format, 'webp');
        assert.equal(previewMetadata.width, 480);
        assert.equal(previewMetadata.height, 320);
        const preview = await sharp(previewBytes).raw().toBuffer({ resolveWithObject: true });

        let watermarkPixels = 0;
        for (let y = 256; y < 316; y += 1) {
          for (let x = 96; x < 476; x += 1) {
            const index = (y * preview.info.width + x) * preview.info.channels;
            if (preview.data[index] > 220 && preview.data[index + 1] > 220 && preview.data[index + 2] > 220) {
              watermarkPixels += 1;
            }
          }
        }
        assert.ok(watermarkPixels > 0, `${fixture.extension} preview is missing the white watermark`);
      } finally {
        if (stored) await removeStored(stored, { uploadRoot, privateRoot });
        await fs.rm(sourcePath, { force: true });
      }
    }
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
