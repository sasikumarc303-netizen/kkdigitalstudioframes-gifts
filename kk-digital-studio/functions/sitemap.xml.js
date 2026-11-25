const BACKEND_SITEMAP_URL = 'https://kk-digital-studio-backend.onrender.com/sitemap.xml';

function failure(message) {
  return new Response(message, {
    status: 502,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function onRequestGet() {
  let upstream;
  try {
    upstream = await fetch(BACKEND_SITEMAP_URL, {
      headers: { Accept: 'application/xml, text/xml;q=0.9' },
    });
  } catch {
    return failure('Sitemap service is temporarily unavailable.');
  }

  const contentType = upstream.headers.get('content-type') || '';
  if (!upstream.ok || !/^(application|text)\/xml(?:\s*;|$)/i.test(contentType)) {
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

  return new Response(`${body}\n`, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
