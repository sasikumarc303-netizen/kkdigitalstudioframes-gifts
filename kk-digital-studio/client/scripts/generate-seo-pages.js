import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEO_ORIGIN, SEO_PAGES, SITE_DESCRIPTION } from '../../seo.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.resolve(scriptDir, '..');
const distDir = path.join(clientDir, 'dist');
const template = await readFile(path.join(distDir, 'index.html'), 'utf8');

if (!template.includes('<!--SEO_HEAD-->')) {
  throw new Error('Production index.html is missing the SEO_HEAD marker.');
}

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[char]);

const escapeJsonForHtml = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

function renderPage(pathname, { title, description }) {
  const canonical = `${SEO_ORIGIN}${pathname === '/' ? '/' : pathname}`;
  const image = `${SEO_ORIGIN}/images/hero-poster.jpg`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: 'KK Digital Studio',
        url: `${SEO_ORIGIN}/`,
        description: SITE_DESCRIPTION,
      },
      {
        '@type': 'Organization',
        name: 'KK Digital Studio',
        url: `${SEO_ORIGIN}/`,
      },
    ],
  };
  const head = [
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="KK Digital Studio" />',
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
    `<script id="kk-structured-data" type="application/ld+json">${escapeJsonForHtml(structuredData)}</script>`,
  ].join('\n    ');
  const html = template
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace('<!--SEO_HEAD-->', head);

  return html;
}

for (const [pathname, metadata] of Object.entries(SEO_PAGES)) {
  const outputPath = pathname === '/'
    ? path.join(distDir, 'index.html')
    : path.join(distDir, pathname.slice(1), 'index.html');
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, renderPage(pathname, metadata), 'utf8');
}

const sitemap = await readFile(path.join(distDir, 'sitemap.xml'), 'utf8');
const sitemapLocations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
const expectedLocations = Object.keys(SEO_PAGES).map((pathname) =>
  `${SEO_ORIGIN}${pathname === '/' ? '/' : pathname}`
);
if (
  !sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>') ||
  !sitemap.includes('<urlset ') ||
  new Set(sitemapLocations).size !== sitemapLocations.length ||
  sitemapLocations.length !== expectedLocations.length ||
  expectedLocations.some((location) => !sitemapLocations.includes(location)) ||
  sitemapLocations.some((location) => !location.startsWith(`${SEO_ORIGIN}/`))
) {
  throw new Error('The static sitemap is invalid, contains duplicate URLs, or does not match the public route list.');
}

const robots = await readFile(path.join(distDir, 'robots.txt'), 'utf8');
if (!robots.includes(`Sitemap: ${SEO_ORIGIN}/sitemap.xml`)) {
  throw new Error('robots.txt is missing the production sitemap URL.');
}

const headers = (await readFile(path.join(distDir, '_headers'), 'utf8')).replace(/\r\n/g, '\n');
for (const requiredHeader of [
  '/sitemap.xml\n  Content-Type: application/xml; charset=utf-8',
  '/robots.txt\n  Content-Type: text/plain; charset=utf-8',
  '/admin/*\n  X-Robots-Tag: noindex, nofollow',
]) {
  if (!headers.includes(requiredHeader)) {
    throw new Error(`Netlify _headers is missing the expected rule: ${requiredHeader.split('\n')[0]}`);
  }
}

const redirects = (await readFile(path.join(distDir, '_redirects'), 'utf8'))
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#'));
if (!redirects[0]?.startsWith('/api/* ') || redirects.at(-1) !== '/*  /index.html  200') {
  throw new Error('Netlify redirects must keep the API proxy first and the SPA fallback last.');
}

console.log(`Generated static SEO metadata for ${Object.keys(SEO_PAGES).length} public routes.`);
