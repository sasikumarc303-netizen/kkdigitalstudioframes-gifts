import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import { DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';
import { ApiError } from '../utils/helpers.js';

const MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
]);

export function validateBackblazeConfig(config) {
  const region = String(config?.region || '');
  const bucket = String(config?.bucketName || '');
  let endpoint;
  try {
    endpoint = new URL(config?.endpoint);
  } catch {
    throw new ApiError(503, 'Backblaze B2 storage is not configured correctly');
  }
  if (
    !config?.keyId ||
    !config?.applicationKey ||
    /\s/.test(config.keyId) ||
    /\s/.test(config.applicationKey) ||
    config.keyId !== config.keyId.trim() ||
    config.applicationKey !== config.applicationKey.trim() ||
    !/^[a-z]{2}-[a-z]+-\d{3}$/.test(region) ||
    !/^[a-z0-9][a-z0-9.-]{4,48}[a-z0-9]$/.test(bucket) ||
    endpoint.protocol !== 'https:' ||
    endpoint.hostname !== `s3.${region}.backblazeb2.com` ||
    endpoint.port ||
    endpoint.username ||
    endpoint.password ||
    endpoint.pathname !== '/' ||
    endpoint.search ||
    endpoint.hash
  ) {
    throw new ApiError(503, 'Backblaze B2 storage is not configured correctly');
  }
  return { ...config, region, bucketName: bucket, endpoint: endpoint.origin };
}

export function validateObjectKey(key) {
  if (
    typeof key !== 'string' ||
    !key ||
    key.length > 1024 ||
    key.startsWith('/') ||
    key.includes('\\') ||
    /[\u0000-\u001f]/.test(key) ||
    !/^[A-Za-z0-9._/-]+$/.test(key) ||
    key.split('/').some((part) => !part || part === '.' || part === '..')
  ) {
    throw new ApiError(400, 'Invalid media storage key');
  }
  return key;
}

function storageFailure(error, operation) {
  const status = error?.$metadata?.httpStatusCode;
  const code = typeof error?.name === 'string' ? error.name.slice(0, 80) : 'StorageError';
  console.error(`[b2] ${operation} failed`, { code, status });
  if (status === 404 || code === 'NoSuchKey' || code === 'NotFound') {
    return new ApiError(404, 'Stored media was not found');
  }
  if (status === 416) return new ApiError(416, 'Requested media range is not satisfiable');
  return new ApiError(502, 'Media storage request failed');
}

export function createBackblazeStorage(config, client) {
  const validated = validateBackblazeConfig(config);
  const s3 = client || new S3Client({
    region: validated.region,
    endpoint: validated.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: validated.keyId,
      secretAccessKey: validated.applicationKey,
    },
  });

  async function send(operation, command) {
    try {
      return await s3.send(command);
    } catch (error) {
      throw storageFailure(error, operation);
    }
  }

  return {
    async uploadFile(key, filePath, { contentType, isPreview = false } = {}) {
      validateObjectKey(key);
      if (!MIME_TYPES.has(contentType)) throw new ApiError(415, 'Unsupported media content type');
      let stat;
      try {
        stat = await fs.stat(filePath);
      } catch {
        throw new ApiError(500, 'Uploaded media could not be read');
      }
      if (!stat.isFile()) throw new ApiError(400, 'Uploaded media is not a file');
      await send('upload', new PutObjectCommand({
        Bucket: validated.bucketName,
        Key: key,
        Body: createReadStream(filePath),
        ContentLength: stat.size,
        ContentType: contentType,
        CacheControl: isPreview ? 'public, max-age=31536000, immutable' : 'private, no-store',
      }));
      return { key, bytes: stat.size };
    },

    async getObject(key, range) {
      validateObjectKey(key);
      if (range) {
        const match = typeof range === 'string' ? /^bytes=(\d*)-(\d*)$/.exec(range) : null;
        if (!match || (!match[1] && !match[2]) || (match[1] && match[2] && Number(match[1]) > Number(match[2]))) {
          throw new ApiError(416, 'Invalid media range');
        }
      }
      return send('download', new GetObjectCommand({
        Bucket: validated.bucketName,
        Key: key,
        ...(range ? { Range: range } : {}),
      }));
    },

    async headObject(key) {
      validateObjectKey(key);
      return send('metadata lookup', new HeadObjectCommand({
        Bucket: validated.bucketName,
        Key: key,
      }));
    },

    async deleteObject(key) {
      validateObjectKey(key);
      await send('delete', new DeleteObjectCommand({
        Bucket: validated.bucketName,
        Key: key,
      }));
    },

    async createDownloadUrl(key, expiresIn = 60) {
      validateObjectKey(key);
      if (!Number.isInteger(expiresIn) || expiresIn < 1 || expiresIn > 900) {
        throw new ApiError(400, 'Invalid signed URL expiration');
      }
      try {
        return await getSignedUrl(s3, new GetObjectCommand({
          Bucket: validated.bucketName,
          Key: key,
        }), { expiresIn });
      } catch {
        throw new ApiError(502, 'Could not create a secure media download link');
      }
    },

    async checkConnection() {
      await send('connection check', new HeadBucketCommand({ Bucket: validated.bucketName }));
    },
  };
}

let storage;

export function getBackblazeStorage() {
  if (!storage) storage = createBackblazeStorage(env.backblaze);
  return storage;
}

export function backblazePreviewUrl(key) {
  validateObjectKey(key);
  if (!/^previews\/[a-f0-9]{32}(?:-poster)?\.(?:webp|mp4|jpg)$/.test(key)) {
    throw new ApiError(400, 'Invalid public preview key');
  }
  return `${env.mediaBaseUrl}/api/media/previews/b2?key=${encodeURIComponent(key)}`;
}

export async function checkBackblazeConnection() {
  await getBackblazeStorage().checkConnection();
}
