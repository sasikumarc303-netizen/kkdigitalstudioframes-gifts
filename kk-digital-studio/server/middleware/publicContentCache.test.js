import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import express from 'express';
import { publicContentCache } from './publicContentCache.js';

const app = express();
app.use('/api', publicContentCache);
app.get('/api/site', (_req, res) => res.sendStatus(204));
app.get('/api/products/not-found', (_req, res) => res.sendStatus(404));
app.get('/api/products/:slug', (_req, res) => res.sendStatus(204));
app.get('/api/health', (_req, res) => res.sendStatus(204));
app.get('/api/admin/config', (_req, res) => res.sendStatus(204));
app.post('/api/site', (_req, res) => res.sendStatus(204));

const server = app.listen(0);
const baseUrl = await new Promise((resolve) => {
  server.once('listening', () => resolve(`http://127.0.0.1:${server.address().port}`));
});

after(() => new Promise((resolve, reject) => {
  server.close((error) => error ? reject(error) : resolve());
}));

test('caches only safe public content GET endpoints', async () => {
  for (const path of ['/api/site', '/api/products/frame-slug']) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.headers.get('cache-control'), 'public, max-age=60, stale-while-revalidate=300');
  }
});

test('does not cache public endpoint errors', async () => {
  const response = await fetch(`${baseUrl}/api/products/not-found`);
  assert.equal(response.status, 404);
  assert.equal(response.headers.get('cache-control'), null);
});

test('does not cache health, admin, or non-GET endpoints', async () => {
  for (const [path, method] of [
    ['/api/health', 'GET'],
    ['/api/admin/config', 'GET'],
    ['/api/site', 'POST'],
  ]) {
    const response = await fetch(`${baseUrl}${path}`, { method });
    assert.equal(response.headers.get('cache-control'), null);
  }
});
