import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { onRequestGet } from '../functions/sitemap.xml.js';

test('sitemap handler is query-agnostic, filters confirmed test products, and fails safely', async () => {
  const originalFetch = globalThis.fetch;
  const fetchCalls = [];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://kkdigitalstudioframes.com/</loc></url>
  <url><loc>https://kkdigitalstudioframes.com/photo-frames/frames</loc></url>
  <url><loc>https://kkdigitalstudioframes.com/photo-frames/srsasikumar987-gmail-com</loc></url>
</urlset>`;

  try {
    globalThis.fetch = async (url) => {
      fetchCalls.push(String(url));
      return new Response(xml, {
        status: 200,
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
      });
    };

    for (const requestUrl of [
      'https://kkdigitalstudioframes.com/sitemap.xml',
      'https://kkdigitalstudioframes.com/sitemap.xml?utm_source=chatgpt.com',
    ]) {
      const response = await onRequestGet({ request: new Request(requestUrl) });
      const body = await response.text();
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('Content-Type'), 'application/xml; charset=utf-8');
      assert.equal(response.headers.get('Cache-Control'), 'no-store, max-age=0');
      assert.match(body, /<urlset\b/);
      assert.match(body, /photo-frames\/frames/);
      assert.doesNotMatch(body, /srsasikumar987-gmail-com/);
    }
    assert.deepEqual(fetchCalls, [
      'https://kk-digital-studio-backend.onrender.com/sitemap.xml',
      'https://kk-digital-studio-backend.onrender.com/sitemap.xml',
    ]);

    globalThis.fetch = async () => new Response('<!doctype html><html>unavailable</html>', {
      status: 503,
      headers: { 'Content-Type': 'text/html' },
    });
    const failure = await onRequestGet({ request: new Request('https://kkdigitalstudioframes.com/sitemap.xml?probe=1') });
    assert.equal(failure.status, 502);
    assert.match(failure.headers.get('Content-Type'), /^text\/plain/);
    assert.match(failure.headers.get('Cache-Control'), /no-store/);
    assert.doesNotMatch(await failure.text(), /<html/i);

    globalThis.fetch = async () => new Response('<urlset><url></urlset>', {
      status: 200,
      headers: { 'Content-Type': 'application/xml' },
    });
    assert.equal((await onRequestGet({ request: new Request('https://kkdigitalstudioframes.com/sitemap.xml') })).status, 502);

    let coldStartAttempts = 0;
    globalThis.fetch = async () => {
      coldStartAttempts += 1;
      return coldStartAttempts === 1
        ? new Response('starting', { status: 503, headers: { 'Content-Type': 'text/plain' } })
        : new Response(xml, { status: 200, headers: { 'Content-Type': 'application/xml' } });
    };
    const recovered = await onRequestGet({ request: new Request('https://kkdigitalstudioframes.com/sitemap.xml?probe=cold-start') });
    assert.equal(recovered.status, 200);
    assert.equal(coldStartAttempts, 2);
    assert.match(await recovered.text(), /photo-frames\/frames/);

    let networkAttempts = 0;
    globalThis.fetch = async () => {
      networkAttempts += 1;
      throw new Error('temporary network failure');
    };
    assert.equal((await onRequestGet({ request: new Request('https://kkdigitalstudioframes.com/sitemap.xml') })).status, 502);
    assert.equal(networkAttempts, 2);

    const rootFunction = await readFile(new URL('../../functions/sitemap.xml.js', import.meta.url), 'utf8');
    const clientFunction = await readFile(new URL('../functions/sitemap.xml.js', import.meta.url), 'utf8');
    assert.match(rootFunction, /handleSitemap/);
    assert.match(clientFunction, /handleSitemap/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
