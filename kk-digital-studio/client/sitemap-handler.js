const BACKEND_SITEMAP_URL = 'https://kk-digital-studio-backend.onrender.com/sitemap.xml';
const SITE_ORIGIN = 'https://kkdigitalstudioframes.com';
const CONFIRMED_TEST_PRODUCT_SLUGS = new Set(['srsasikumar987-gmail-com']);
const XML_CONTENT_TYPE = 'application/xml; charset=utf-8';

function failure(message) {
  return new Response(message, {
    status: 502,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'CDN-Cache-Control': 'no-store',
      'Cloudflare-CDN-Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function excludeConfirmedTestProducts(xml) {
  return xml.replace(/<url\b[^>]*>[\s\S]*?<\/url>/gi, (entry) => {
    const location = entry.match(/<loc>\s*([^<]+?)\s*<\/loc>/i)?.[1]?.trim();
    if (!location) return entry;

    let url;
    try {
      url = new URL(location);
    } catch {
      return entry;
    }

    const segments = url.pathname.split('/').filter(Boolean);
    if (
      url.origin === SITE_ORIGIN &&
      segments.length === 2 &&
      segments[0] === 'photo-frames' &&
      CONFIRMED_TEST_PRODUCT_SLUGS.has(segments[1])
    ) {
      return '';
    }
    return entry;
  });
}

export async function handleSitemap() {
  let upstream;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      upstream = await fetch(BACKEND_SITEMAP_URL, {
        headers: { Accept: 'application/xml, text/xml;q=0.9' },
      });
    } catch {
      if (attempt === 0) {
        await delay(1000);
        continue;
      }
      return failure('Sitemap service is temporarily unavailable.');
    }

    if (upstream.ok) break;
    if (attempt === 0 && [502, 503, 504].includes(upstream.status)) {
      await upstream.body?.cancel();
      await delay(1000);
      continue;
    }
    return failure('Sitemap service returned an invalid response.');
  }

  const contentType = upstream.headers.get('content-type') || '';
  if (!/^(application|text)\/xml(?:\s*;|$)/i.test(contentType)) {
    return failure('Sitemap service returned an invalid response.');
  }

  let xml;
  try {
    xml = await upstream.text();
  } catch {
    return failure('Sitemap service returned an unreadable response.');
  }

  const body = xml.replace(/^\uFEFF/, '').trim();
  if (
    !body.startsWith('<?xml') ||
    !/<urlset\b[^>]*>[\s\S]*<\/urlset>\s*$/.test(body) ||
    /<!doctype\s+html|<html(?:\s|>)/i.test(body)
  ) {
    return failure('Sitemap service returned invalid XML.');
  }

  const filteredXml = excludeConfirmedTestProducts(body);
  return new Response(`${filteredXml}\n`, {
    status: 200,
    headers: {
      'Content-Type': XML_CONTENT_TYPE,
      'Cache-Control': 'no-store, max-age=0',
      'CDN-Cache-Control': 'no-store',
      'Cloudflare-CDN-Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
