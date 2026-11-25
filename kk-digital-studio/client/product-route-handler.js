const API_ORIGIN = 'https://kk-digital-studio-backend.onrender.com';
const SITE_ORIGIN = 'https://kkdigitalstudioframes.com';
const PRODUCT_LOOKUP_TIMEOUT_MS = 10_000;
const PRODUCT_LOOKUP_ATTEMPTS = 2;

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
})[character]);

const htmlResponse = (body, status = 200, extraHeaders = {}) => new Response(body, {
  status,
  headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  },
});

function unavailable(status = 503) {
  return new Response('Product pages are temporarily unavailable. Please try again shortly.', {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'Retry-After': '30',
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

async function notFound(context) {
  try {
    const url = new URL('/__kk-product-route-not-found__', context.request.url);
    const asset = await context.env.ASSETS.fetch(url);
    const html = await asset.text();
    if (asset.headers.get('content-type')?.includes('text/html') && html) {
      return htmlResponse(html, 404, { 'X-Robots-Tag': 'noindex, nofollow' });
    }
  } catch (error) {
    console.error('Could not load the custom product 404 page.', error);
  }

  return htmlResponse(
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><title>Page not found | KK Digital Studio Frames &amp; Gifts</title></head><body><main><h1>This page has wandered out of frame</h1><p>The requested product could not be found.</p><a href="/photo-frames">Browse photo frames</a></main></body></html>',
    404,
    { 'X-Robots-Tag': 'noindex, nofollow' },
  );
}

function safeImageUrl(value) {
  const image = String(value ?? '');
  return /^https?:\/\//i.test(image) || /^\/(?!\/)/.test(image) ? image : '';
}

function updateTag(html, pattern, replacement) {
  if (!pattern.test(html)) return null;
  return html.replace(pattern, replacement);
}

function renderProductPage(template, product, requestedId) {
  const productName = escapeHtml(product.name);
  const descriptionText = String(
    product.shortDescription || product.description ||
      `Ask KK Digital Studio about ${product.name}.`,
  );
  const description = escapeHtml(descriptionText.slice(0, 160));
  const canonicalSlug = product.slug || requestedId;
  const canonical = `${SITE_ORIGIN}/photo-frames/${encodeURIComponent(canonicalSlug)}`;
  const imageUrl = safeImageUrl(product.images?.[0]);
  const image = imageUrl ? escapeHtml(imageUrl) : '';
  const title = `${productName} | Photo Frames | KK Digital Studio`;
  const category = product.category?.name
    ? `<p class="eyebrow">${escapeHtml(product.category.name)}</p>`
    : '';
  const productContent = `
    <main id="main" class="page">
      <section class="section section--ivory section--tight"><div class="container">
        <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/photo-frames">Photo frames</a><span aria-current="page">${productName}</span></nav>
        ${category}<h1>${productName}</h1>
        <p>${description}</p>
        ${image ? `<img src="${image}" alt="${productName}" width="640" loading="eager" />` : ''}
      </div></section>
    </main>`;

  let html = template;
  const replacements = [
    [/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`],
    [/<meta name="description" content="[^"]*"\s*\/>/i, `<meta name="description" content="${description}" />`],
    [/<link rel="canonical" href="[^"]*"\s*\/>/i, `<link rel="canonical" href="${escapeHtml(canonical)}" />`],
    [/<meta property="og:title" content="[^"]*"\s*\/>/i, `<meta property="og:title" content="${title}" />`],
    [/<meta property="og:description" content="[^"]*"\s*\/>/i, `<meta property="og:description" content="${description}" />`],
    [/<meta property="og:url" content="[^"]*"\s*\/>/i, `<meta property="og:url" content="${escapeHtml(canonical)}" />`],
  ];

  for (const [pattern, replacement] of replacements) {
    html = updateTag(html, pattern, replacement);
    if (!html) return null;
  }

  if (image) {
    html = updateTag(html, /<meta property="og:image" content="[^"]*"\s*\/>/i, `<meta property="og:image" content="${image}" />`);
    if (!html) return null;
    html = updateTag(html, /<meta name="twitter:image" content="[^"]*"\s*\/>/i, `<meta name="twitter:image" content="${image}" />`);
    if (!html) return null;
  }
  html = updateTag(html, /<meta name="twitter:title" content="[^"]*"\s*\/>/i, `<meta name="twitter:title" content="${title}" />`);
  if (!html) return null;
  html = updateTag(html, /<meta name="twitter:description" content="[^"]*"\s*\/>/i, `<meta name="twitter:description" content="${description}" />`);
  if (!html) return null;

  const rootPattern = /(<div id="root">)[\s\S]*?(<\/div>\s*<noscript>)/i;
  if (!rootPattern.test(html)) return null;
  html = html.replace(rootPattern, (_match, open, close) => `${open}${productContent}${close}`);
  return html;
}

export async function handleProductRoute(context) {
  const requestedId = String(context.params?.id ?? '').trim();
  if (!requestedId || requestedId.includes('/')) return notFound(context);

  let upstream;
  let timedOut = false;
  for (let attempt = 1; attempt <= PRODUCT_LOOKUP_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PRODUCT_LOOKUP_TIMEOUT_MS);
    try {
      upstream = await fetch(
        `${API_ORIGIN}/api/products/${encodeURIComponent(requestedId)}`,
        {
          headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
          signal: controller.signal,
        },
      );
    } catch (error) {
      timedOut = controller.signal.aborted;
      if (attempt === PRODUCT_LOOKUP_ATTEMPTS) {
        console.error('Product lookup failed.', error);
        return unavailable(timedOut ? 504 : 503);
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
      continue;
    } finally {
      clearTimeout(timeoutId);
    }

    if (upstream?.status === 404) return notFound(context);
    if (upstream?.ok) break;
    if (attempt === PRODUCT_LOOKUP_ATTEMPTS || ![502, 503, 504].includes(upstream?.status)) {
      return unavailable();
    }

    try {
      await upstream.body?.cancel();
    } catch (error) {
      console.error('Could not close the temporary product API response.', error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  let payload;
  try {
    payload = await upstream.json();
  } catch (error) {
    console.error('The product API returned invalid JSON.', error);
    return unavailable(502);
  }

  const product = payload?.product;
  if (
    !product ||
    typeof product.id !== 'string' ||
    typeof product.slug !== 'string' ||
    typeof product.name !== 'string'
  ) {
    return unavailable(502);
  }

  const normalizedId = requestedId.toLowerCase();
  if (product.slug.toLowerCase() !== normalizedId && product.id.toLowerCase() !== normalizedId) {
    return notFound(context);
  }

  let shell;
  try {
    shell = await context.env.ASSETS.fetch(new URL('/', context.request.url));
  } catch (error) {
    console.error('Could not load the storefront application shell.', error);
    return unavailable();
  }
  if (!shell.ok || !shell.headers.get('content-type')?.includes('text/html')) {
    return unavailable();
  }

  const html = renderProductPage(await shell.text(), product, requestedId);
  if (!html) return unavailable(502);

  return htmlResponse(html);
}
