import Product from '../models/Product.js';
import { asyncHandler } from '../utils/helpers.js';
import { getConfig } from '../services/siteConfig.js';
import { SEO_ORIGIN, SEO_PAGES } from '../../seo.mjs';

const xml = (s) => String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

export const sitemap = asyncHandler(async (_req, res) => {
  const products = await Product.find({ published: true }, 'slug updatedAt');
  const urls = [
    ...Object.keys(SEO_PAGES).map((pathname) => `<url><loc>${xml(`${SEO_ORIGIN}${pathname === '/' ? '/' : pathname}`)}</loc></url>`),
    ...products.map((p) => `<url><loc>${xml(`${SEO_ORIGIN}/photo-frames/${p.slug}`)}</loc><lastmod>${p.updatedAt.toISOString().slice(0, 10)}</lastmod></url>`),
  ];
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
});

export const robots = asyncHandler(async (_req, res) => {
  const cfg = await getConfig();
  const customLines = (cfg.seo.robotsTxt || '')
    .split(/\r?\n/)
    .filter((line) => !/^sitemap\s*:/i.test(line))
    .filter((line) => !/^\s*disallow\s*:\s*\/api\/?\s*$/i.test(line))
    .filter((line) => line.trim());
  const body = [
    ...customLines,
    ...(customLines.length ? [] : ['User-agent: *', 'Allow: /']),
    'Disallow: /api/admin/',
    'Disallow: /api/cart/',
    'Disallow: /api/orders',
    'Disallow: /api/bookings',
    'Disallow: /api/enquiries',
    'Allow: /api/site',
    'Allow: /api/home',
    'Allow: /api/services',
    'Allow: /api/packages',
    'Allow: /api/testimonials',
    'Allow: /api/categories',
    'Allow: /api/gallery',
    'Allow: /api/products',
    '',
    `Sitemap: ${SEO_ORIGIN}/sitemap.xml`,
  ].join('\n');
  res.type('text/plain').send(`${body}\n`);
});
