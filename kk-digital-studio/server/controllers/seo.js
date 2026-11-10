import Product from '../models/Product.js';
import { asyncHandler } from '../utils/helpers.js';
import { getConfig } from '../services/siteConfig.js';
import { env } from '../config/env.js';

const STATIC_ROUTES = [
  ['/', 1.0], ['/about', 0.7], ['/services', 0.9], ['/portfolio', 0.9], ['/packages', 0.8],
  ['/photo-frames', 0.8], ['/booking', 0.9], ['/contact', 0.8],
];

const xml = (s) => String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

export const sitemap = asyncHandler(async (_req, res) => {
  const products = await Product.find({ published: true }, 'slug updatedAt');
  const urls = [
    ...STATIC_ROUTES.map(([p, prio]) => `<url><loc>${xml(env.siteUrl + p)}</loc><priority>${prio}</priority></url>`),
    ...products.map((p) => `<url><loc>${xml(`${env.siteUrl}/photo-frames/${p.slug}`)}</loc><lastmod>${p.updatedAt.toISOString().slice(0, 10)}</lastmod><priority>0.6</priority></url>`),
  ];
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
});

export const robots = asyncHandler(async (_req, res) => {
  const cfg = await getConfig();
  let body = cfg.seo.robotsTxt?.trim();
  if (!body) body = 'User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\nDisallow: /cart\nDisallow: /checkout';
  if (!/^sitemap:/im.test(body)) body += `\nSitemap: ${env.siteUrl}/sitemap.xml`;
  res.type('text/plain').send(`${body}\n`);
});
