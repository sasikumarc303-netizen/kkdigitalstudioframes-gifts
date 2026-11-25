import assert from 'node:assert/strict';
import test from 'node:test';
import { onRequestGet } from '../functions/photo-frames/[id].js';

const shellHtml = `<!doctype html><html><head>
<title>Homepage</title>
<meta name="description" content="Home description" />
<link rel="canonical" href="https://kkdigitalstudioframes.com/" />
<meta property="og:title" content="Homepage" />
<meta property="og:description" content="Home description" />
<meta property="og:url" content="https://kkdigitalstudioframes.com/" />
<meta property="og:image" content="https://example.com/home.jpg" />
<meta name="twitter:title" content="Homepage" />
<meta name="twitter:description" content="Home description" />
<meta name="twitter:image" content="https://example.com/home.jpg" />
</head><body><div id="root"><main>Homepage content</main></div>
<noscript>Enable JavaScript</noscript></body></html>`;

const productPayload = {
  product: {
    id: '6b0449870685009f695ac05d',
    slug: 'frames',
    name: 'Frames',
    shortDescription: 'Finishing your photos in multiple sizes of frames.',
    description: 'Photo frame product details.',
    images: ['https://res.cloudinary.com/example/frame-preview.jpg'],
    category: { name: 'Photo Frames' },
  },
  related: [],
};

function contextFor(id, { assetHandler } = {}) {
  const assetCalls = [];
  return {
    context: {
      request: new Request(`https://kkdigitalstudioframes.com/photo-frames/${id}`),
      params: { id },
      env: {
        ASSETS: {
          async fetch(url) {
            const pathname = new URL(url).pathname;
            assetCalls.push(pathname);
            if (assetHandler) return assetHandler(pathname);
            return pathname === '/'
              ? new Response(shellHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
              : new Response('<!doctype html><html><head><meta name="robots" content="noindex, nofollow"></head><body>Custom 404</body></html>', {
                status: 404,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
              });
          },
        },
      },
    },
    assetCalls,
  };
}

test('published product slugs serve the SEO-ready app shell with HTTP 200', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  try {
    globalThis.fetch = async (url) => {
      calls.push(String(url));
      return new Response(JSON.stringify(productPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    const { context, assetCalls } = contextFor('frames');
    const response = await onRequestGet(context);
    const html = await response.text();

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Content-Type'), 'text/html; charset=utf-8');
    assert.match(response.headers.get('Cache-Control'), /no-store/);
    assert.deepEqual(calls, ['https://kk-digital-studio-backend.onrender.com/api/products/frames']);
    assert.deepEqual(assetCalls, ['/']);
    assert.match(html, /<title>Frames \| Photo Frames \| KK Digital Studio<\/title>/);
    assert.match(html, /<link rel="canonical" href="https:\/\/kkdigitalstudioframes\.com\/photo-frames\/frames" \/>/);
    assert.match(html, /<h1>Frames<\/h1>/);
    assert.match(html, /Finishing your photos in multiple sizes of frames\./);
    assert.match(html, /https:\/\/res\.cloudinary\.com\/example\/frame-preview\.jpg/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('unknown or unpublished product slugs return the custom HTTP 404 page', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(
      JSON.stringify({ message: 'Product not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    );

    const { context, assetCalls } = contextFor('not-a-product');
    const response = await onRequestGet(context);
    const html = await response.text();

    assert.equal(response.status, 404);
    assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
    assert.match(html, /Custom 404/);
    assert.deepEqual(assetCalls, ['/__kk-product-route-not-found__']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('backend failures remain temporary errors rather than false 404s', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response('Backend unavailable', { status: 503 });
    const { context, assetCalls } = contextFor('frames');
    const response = await onRequestGet(context);

    assert.equal(response.status, 503);
    assert.equal(response.headers.get('Retry-After'), '30');
    assert.deepEqual(assetCalls, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('a transient backend cold start is retried once before serving a valid product', async () => {
  const originalFetch = globalThis.fetch;
  let attempts = 0;
  try {
    globalThis.fetch = async () => {
      attempts += 1;
      return attempts === 1
        ? new Response('Starting', { status: 503 })
        : new Response(JSON.stringify(productPayload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
    };

    const response = await onRequestGet(contextFor('frames').context);
    assert.equal(response.status, 200);
    assert.equal(attempts, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('malformed upstream products and missing app shells fail explicitly', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ product: { id: '1', slug: 'frames' } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    const malformed = await onRequestGet(contextFor('frames').context);
    assert.equal(malformed.status, 502);

    globalThis.fetch = async () => new Response(JSON.stringify(productPayload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    const missingShell = contextFor('frames', {
      assetHandler: async () => new Response('missing', { status: 404, headers: { 'Content-Type': 'text/plain' } }),
    });
    assert.equal((await onRequestGet(missingShell.context)).status, 503);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
