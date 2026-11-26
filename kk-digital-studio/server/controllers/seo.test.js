import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import test from 'node:test';
import { BACKEND_ROBOTS_TXT } from '../../seo.mjs';
import { robots } from './seo.js';

test('backend robots.txt returns the fixed API allowlist as plain text with HTTP 200', async () => {
  const app = express();
  app.get('/robots.txt', robots);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/robots.txt`);

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^text\/plain;\s*charset=utf-8$/i);
    assert.equal(await response.text(), `${BACKEND_ROBOTS_TXT}\n`);
    assert.deepEqual(BACKEND_ROBOTS_TXT.split('\n'), [
      'User-agent: *',
      'Allow: /',
      'Allow: /api/home$',
      'Allow: /api/site$',
      'Allow: /api/media/previews/b2?',
      'Disallow: /api/',
      'Sitemap: https://kkdigitalstudioframes.com/sitemap.xml',
    ]);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
