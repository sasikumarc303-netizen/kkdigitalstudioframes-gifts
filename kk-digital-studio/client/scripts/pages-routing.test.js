import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const publicDir = new URL('../public/', import.meta.url);

test('Cloudflare SPA routes proxy to the root asset without index clean-URL loops', async () => {
  const redirects = (await readFile(new URL('_redirects', publicDir), 'utf8'))
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .filter((line) => line && !line.startsWith('#'));

  for (const route of [
    '/admin / 200',
    '/admin/* / 200',
    '/cart / 200',
    '/cart/ / 200',
    '/checkout / 200',
    '/checkout/ / 200',
    '/orders / 200',
    '/orders/ / 200',
    '/track-order / 200',
    '/track-order/ / 200',
    '/photo-frames/* / 200',
  ]) {
    assert.ok(redirects.includes(route), `Missing Cloudflare SPA rule: ${route}`);
  }

  assert.ok(!redirects.some((line) => line.startsWith('/* ')), 'Unknown paths must not be rewritten to the app shell.');
  assert.ok(!redirects.some((line) => line.endsWith(' /index.html 200')), 'Pages clean URLs normalize /index.html and can loop.');
});

test('admin SPA routes remain noindex and genuine unknown routes keep the custom 404', async () => {
  const headers = await readFile(new URL('_headers', publicDir), 'utf8');
  const notFound = await readFile(new URL('404.html', publicDir), 'utf8');
  const functionRoutes = JSON.parse(await readFile(new URL('_routes.json', publicDir), 'utf8'));

  assert.match(headers, /\/admin\/\*\s+X-Robots-Tag: noindex, nofollow/);
  assert.match(notFound, /<meta name="robots" content="noindex, nofollow" \/>/);
  assert.match(notFound, /<h1>This page has wandered out of frame<\/h1>/);
  assert.deepEqual(functionRoutes.include, ['/sitemap.xml', '/photo-frames/*']);
  assert.deepEqual(functionRoutes.exclude, []);
});
