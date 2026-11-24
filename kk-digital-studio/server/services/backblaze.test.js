import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { after, before, test } from 'node:test';
import { DeleteObjectCommand, GetObjectCommand, HeadBucketCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { backblazePreviewUrl, createBackblazeStorage, validateBackblazeConfig, validateObjectKey } from './backblaze.js';
import Media from '../models/Media.js';

const config = {
  bucketName: 'kk-digital-studio-staging',
  endpoint: 'https://s3.us-east-005.backblazeb2.com',
  region: 'us-east-005',
  keyId: 'test-key-id',
  applicationKey: 'test-application-key',
};

let workDir;

before(async () => {
  workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kk-b2-test-'));
});

after(async () => {
  if (workDir) await fs.rm(workDir, { recursive: true, force: true });
});

test('requires a valid Backblaze endpoint and complete credentials', () => {
  assert.equal(validateBackblazeConfig(config).bucketName, config.bucketName);
  assert.throws(() => validateBackblazeConfig({ ...config, applicationKey: '' }), /not configured correctly/);
  assert.throws(() => validateBackblazeConfig({ ...config, endpoint: 'https://s3.amazonaws.com' }), /not configured correctly/);
  assert.throws(() => validateBackblazeConfig({ ...config, endpoint: 'http://s3.us-east-005.backblazeb2.com' }), /not configured correctly/);
});

test('accepts safe object keys and rejects traversal or absolute paths', () => {
  assert.equal(validateObjectKey('previews/0123456789abcdef0123456789abcdef.webp'), 'previews/0123456789abcdef0123456789abcdef.webp');
  for (const key of ['../private/file.jpg', '/private/file.jpg', 'private\\file.jpg', 'private//file.jpg']) {
    assert.throws(() => validateObjectKey(key), /Invalid media storage key/);
  }
});

test('streams uploads with content type and non-public original cache policy', async () => {
  const filePath = path.join(workDir, 'source.png');
  await fs.writeFile(filePath, Buffer.from('test-image-bytes'));
  let command;
  let body = '';
  const storage = createBackblazeStorage(config, {
    async send(request) {
      command = request;
      for await (const chunk of request.input.Body) body += chunk.toString();
      return {};
    },
  });

  const result = await storage.uploadFile('private/products/0123456789abcdef0123456789abcdef.png', filePath, {
    contentType: 'image/png',
  });

  assert.ok(command instanceof PutObjectCommand);
  assert.equal(command.input.Bucket, config.bucketName);
  assert.equal(command.input.ContentLength, Buffer.byteLength('test-image-bytes'));
  assert.equal(command.input.ContentType, 'image/png');
  assert.equal(command.input.CacheControl, 'private, no-store');
  assert.equal(body, 'test-image-bytes');
  assert.equal(result.bytes, Buffer.byteLength(body));
});

test('streams ranged downloads and deletes by private bucket object key', async () => {
  const requests = [];
  const storage = createBackblazeStorage(config, {
    async send(request) {
      requests.push(request);
      if (request instanceof GetObjectCommand) {
        return {
          Body: Readable.from(['abc']),
          ContentLength: 3,
          ContentRange: 'bytes 2-4/10',
        };
      }
      return {};
    },
  });

  const result = await storage.getObject('previews/0123456789abcdef0123456789abcdef.mp4', 'bytes=2-4');
  for await (const _chunk of result.Body) { /* consume the test stream */ }
  await storage.headObject('previews/0123456789abcdef0123456789abcdef.mp4');
  await storage.deleteObject('private/products/0123456789abcdef0123456789abcdef.jpg');
  await storage.checkConnection();

  assert.ok(requests[0] instanceof GetObjectCommand);
  assert.equal(requests[0].input.Range, 'bytes=2-4');
  assert.ok(requests[1] instanceof HeadObjectCommand);
  assert.ok(requests[2] instanceof DeleteObjectCommand);
  assert.ok(requests[3] instanceof HeadBucketCommand);
  await assert.rejects(storage.getObject('previews/0123456789abcdef0123456789abcdef.mp4', 'bytes=4-1'), /Invalid media range/);
});

test('creates short-lived signed URLs and stable preview URLs', async () => {
  const storage = createBackblazeStorage(config);
  const signedUrl = await storage.createDownloadUrl('private/products/0123456789abcdef0123456789abcdef.jpg', 60);
  const parsed = new URL(signedUrl);
  assert.equal(parsed.hostname, 's3.us-east-005.backblazeb2.com');
  assert.equal(parsed.searchParams.get('X-Amz-Expires'), '60');
  assert.ok(parsed.searchParams.has('X-Amz-Signature'));
  await assert.rejects(storage.createDownloadUrl('private/original.jpg', 901), /Invalid signed URL expiration/);

  const previewUrl = backblazePreviewUrl('previews/0123456789abcdef0123456789abcdef.webp');
  assert.match(previewUrl, /\/api\/media\/previews\/b2\?key=/);
  assert.doesNotMatch(previewUrl, /X-Amz-/);
  assert.throws(() => backblazePreviewUrl('private/0123456789abcdef0123456789abcdef.jpg'), /Invalid public preview key/);
});

test('serializes B2 media without exposing private original object keys', () => {
  const media = new Media({
    type: 'image',
    url: 'https://api.example.test/api/media/previews/b2?key=previews%2F0123456789abcdef0123456789abcdef.webp',
    provider: 'backblaze',
    publicId: 'previews/0123456789abcdef0123456789abcdef.webp',
    originalProvider: 'backblaze',
    originalPublicId: 'private/products/0123456789abcdef0123456789abcdef.jpg',
  }).toJSON();

  assert.equal(media.provider, 'backblaze');
  assert.equal(media.originalAvailable, true);
  assert.equal(Object.hasOwn(media, 'originalProvider'), false);
  assert.equal(Object.hasOwn(media, 'originalPublicId'), false);
});
