import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEO_ORIGIN, SEO_PAGES, SITE_DESCRIPTION } from '../../seo.mjs';
import { DEFAULT_CONFIG } from '../../server/services/defaults.js';
import { PACKAGE_SEEDS, SERVICE_SEEDS } from '../../public-content.mjs';

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
const escapeText = (value) => escapeHtml(value ?? '');
const list = (items) => items.map((item) => `<li>${escapeText(item)}</li>`).join('');

function renderPublicFallback(pathname) {
  const sections = DEFAULT_CONFIG.homepage.sections;
  const hero = (eyebrow, title, text) => `
    <section class="page-hero"><div class="container">
      <p class="eyebrow">${escapeText(eyebrow)}</p>
      <h1>${escapeText(title)}</h1>
      <p class="page-hero__text">${escapeText(text)}</p>
    </div></section>`;

  if (pathname === '/') {
    return `
      <main id="main" class="page">
        <section class="hero"><div class="hero__content container">
          <p class="hero__eyebrow">${escapeText(DEFAULT_CONFIG.homepage.hero.eyebrow)}</p>
          <h1 class="hero__title">${escapeText(DEFAULT_CONFIG.homepage.hero.heading)}</h1>
          <p class="hero__sub">${escapeText(DEFAULT_CONFIG.homepage.hero.subheading)}</p>
        </div></section>
        <section class="section section--ivory"><div class="container">
          <h2>${escapeText(sections.intro.title)}</h2><p>${escapeText(sections.intro.text)}</p>
          <h2>${escapeText(sections.about.title)}</h2><p>${escapeText(sections.about.text)}</p>
        </div></section>
      </main>`;
  }
  if (pathname === '/services') {
    return `${hero('What we do', 'Photography services', 'From milestone celebrations to everyday portraits, printing and framing, explore everything we offer.')}
      <main id="main" class="page"><section class="section section--ivory section--tight"><div class="container service-list">
        ${SERVICE_SEEDS.map((service) => `<article class="service-row"><div class="service-row__body">
          <h2>${escapeText(service.title)}</h2><p class="service-row__tag">${escapeText(service.tagline)}</p>
          <p>${escapeText(service.description)}</p><ul class="ticks">${list(service.features)}</ul>
        </div></article>`).join('')}
      </div></section></main>`;
  }
  if (pathname === '/packages') {
    return `${hero('Packages', 'Photography packages', 'Pick a starting point and we’ll tailor it to your occasion, your people and your budget.')}
      <main id="main" class="page"><section class="section section--ivory section--tight"><div class="container grid grid--3">
        ${PACKAGE_SEEDS.map((pkg) => `<article class="card package-card"><h2>${escapeText(pkg.name)}</h2>
          <p>${escapeText(pkg.tagline)}</p><p>Contact for pricing</p><ul class="ticks">${list(pkg.features)}</ul>
        </article>`).join('')}
        <p>Need something different? Every occasion is unique. Tell us what you have in mind and we’ll put together a custom quote.</p>
      </div></section></main>`;
  }
  if (pathname === '/about') {
    return `${hero(`About ${DEFAULT_CONFIG.general.businessName}`, sections.about.title, sections.intro.text)}
      <main id="main" class="page"><section class="section section--white"><div class="container">
        <h2>Our approach</h2><p>${escapeText(sections.about.text)}</p>
        <ul class="ticks">${list(sections.about.points)}</ul>
        <h2>${escapeText(sections.why.title)}</h2>
        <p>${escapeText(sections.why.items.map((item) => `${item.title}: ${item.text}`).join(' '))}</p>
      </div></section></main>`;
  }
  if (pathname === '/portfolio') {
    return `${hero('Selected work', 'Portfolio', 'A look at the stories we’ve had the privilege to photograph.')}
      <main id="main" class="page"><section class="section section--ivory"><div class="container">
        <h2>${escapeText(sections.portfolio.title)}</h2><p>${escapeText(sections.portfolio.subtitle)}</p>
        <p>Photographs are added to the portfolio when they are published by the studio. Contact us to ask about recent work.</p>
      </div></section></main>`;
  }
  if (pathname === '/photo-frames') {
    return `${hero('Photo frame collection', 'Frames & keepsakes', 'Give your favourite photographs a home. Choose a size and finish, or send us your photo and we’ll print and frame it for you.')}
      <main id="main" class="page"><section class="section section--ivory"><div class="container">
        <h2>${escapeText(sections.frames.title)}</h2><p>${escapeText(sections.frames.subtitle)}</p>
        <p>Ask the studio about available frame sizes, finishes and personalized photo gifts.</p>
      </div></section></main>`;
  }
  if (pathname === '/booking') {
    return `${hero('Book your session', 'Let’s plan your shoot', 'Share a few details and your preferred date. Your request is sent to our team, and we’ll confirm with you personally.')}
      <main id="main" class="page"><section class="section section--ivory"><div class="container">
        <h2>Request a photography session</h2><p>${escapeText(sections.booking.text)}</p>
        <p>A booking request is not confirmed until the studio contacts you.</p>
      </div></section></main>`;
  }
  if (pathname === '/contact') {
    return `${hero('Get in touch', 'Contact & location', 'Questions about a session, a print or a frame? Send us a message and we’ll respond as soon as we can.')}
      <main id="main" class="page"><section class="section section--ivory"><div class="container">
        <h2>Contact ${escapeText(DEFAULT_CONFIG.general.businessName)}</h2><p>${escapeText(DEFAULT_CONFIG.contact.address)}</p>
        <p>Ask us about photography sessions, photo printing, framing or customized gifts.</p>
      </div></section></main>`;
  }
  return '';
}

function renderPage(pathname, { title, description }) {
  const canonical = `${SEO_ORIGIN}${pathname === '/' ? '/' : pathname}`;
  const image = `${SEO_ORIGIN}/images/hero-poster.jpg`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: DEFAULT_CONFIG.general.businessName,
        url: `${SEO_ORIGIN}/`,
        description: SITE_DESCRIPTION,
      },
      {
        '@type': 'Organization',
        name: DEFAULT_CONFIG.general.businessName,
        url: `${SEO_ORIGIN}/`,
      },
      {
        '@type': 'LocalBusiness',
        name: DEFAULT_CONFIG.general.businessName,
        url: `${SEO_ORIGIN}/`,
        address: DEFAULT_CONFIG.contact.address,
        hasMap: DEFAULT_CONFIG.contact.mapUrl,
      },
    ],
  };
  const head = [
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:site_name" content="${escapeHtml(DEFAULT_CONFIG.general.businessName)}" />`,
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
    .replace('<!--SEO_HEAD-->', head)
    .replace('<div id="root"></div>', `<div id="root">${renderPublicFallback(pathname)}</div>`);

  return html;
}

for (const [pathname, metadata] of Object.entries(SEO_PAGES)) {
  const outputPath = pathname === '/'
    ? path.join(distDir, 'index.html')
    : path.join(distDir, pathname.slice(1), 'index.html');
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, renderPage(pathname, metadata), 'utf8');
}

for (const [pathname, { title }] of Object.entries(SEO_PAGES)) {
  const outputPath = pathname === '/'
    ? path.join(distDir, 'index.html')
    : path.join(distDir, pathname.slice(1), 'index.html');
  const html = await readFile(outputPath, 'utf8');
  if (!html.includes(`<h1`) || !html.includes(`</h1>`) || !html.includes(`id="main"`) || !html.includes(escapeHtml(title))) {
    throw new Error(`Generated route ${pathname} is missing meaningful public HTML or metadata.`);
  }
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
