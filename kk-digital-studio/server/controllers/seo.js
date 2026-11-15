import Product from '../models/Product.js';
import { asyncHandler } from '../utils/helpers.js';
import { getConfig } from '../services/siteConfig.js';
import { env } from '../config/env.js';
import { createRobotsTxt, SEO_ORIGIN, SITEMAP_ROUTES } from '../../seo.mjs';

const xml = (s) => String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

export const sitemap = asyncHandler(async (_req, res) => {
  const products = env.isProd
    ? await Product.find({ published: true, slug: { $type: 'string', $ne: '' } }, 'slug updatedAt')
    : [];
  const urls = [
    ...SITEMAP_ROUTES.map(([route, priority]) => `<url><loc>${xml(`${SEO_ORIGIN}${route}`)}</loc><priority>${priority}</priority></url>`),
    ...products.map((product) => `<url><loc>${xml(`${SEO_ORIGIN}/photo-frames/${product.slug}`)}</loc><lastmod>${product.updatedAt.toISOString().slice(0, 10)}</lastmod><priority>0.6</priority></url>`),
  ];
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
});

export const robots = asyncHandler(async (_req, res) => {
  const cfg = await getConfig();
  res.type('text/plain').send(createRobotsTxt(cfg.seo.robotsTxt));
});
