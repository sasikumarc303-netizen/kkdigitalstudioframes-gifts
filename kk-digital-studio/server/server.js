import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { env, PROJECT_ROOT } from './config/env.js';
import { connectDB } from './config/db.js';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import { sitemap, robots } from './controllers/seo.js';
import { errorHandler, notFoundApi } from './middleware/errors.js';
import { UPLOAD_ROOT } from './services/media.js';
import { getConfig, ensureConfigExists } from './services/siteConfig.js';
import Product from './models/Product.js';
import AdminUser from './models/AdminUser.js';

const app = express();
app.disable('x-powered-by');
if (env.trustProxy) app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
        'img-src': ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
        'media-src': ["'self'", 'blob:', 'https://res.cloudinary.com'],
        'connect-src': ["'self'"],
        'frame-src': ['https://www.google.com'],
        'object-src': ["'none'"],
        'upgrade-insecure-requests': env.isProd ? [] : null,
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
  })
);
app.use(compression());
if (env.clientOrigins.length) app.use(cors({ origin: env.clientOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, standardHeaders: true, legacyHeaders: false }));
app.get('/api/health', (_req, res) => res.json({ ok: true, db: mongoose.connection.readyState === 1 }));
app.use('/api/admin', adminRoutes);
app.use('/api', publicRoutes);
app.use('/api', notFoundApi);

app.get('/sitemap.xml', sitemap);
app.get('/robots.txt', robots);

// Locally stored uploads (when Cloudinary is not configured). Only validated images/videos are ever written here.
app.use('/uploads', express.static(UPLOAD_ROOT, { maxAge: '30d', setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff') }));

// ---- production: serve the built React app with per-route SEO tags injected for crawlers ----
const distDir = path.join(PROJECT_ROOT, 'client', 'dist');
const indexFile = path.join(distDir, 'index.html');
if (fs.existsSync(indexFile)) {
  const template = fs.readFileSync(indexFile, 'utf8');
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const abs = (u) => (!u ? '' : /^https?:/i.test(u) ? u : `${env.siteUrl}${u.startsWith('/') ? '' : '/'}${u}`);

  async function seoFor(pathname) {
    const cfg = await getConfig();
    let page = cfg.seo.pages[pathname];
    if (!page && pathname.startsWith('/photo-frames/')) {
      const key = decodeURIComponent(pathname.split('/')[2] || '');
      const p = await Product.findOne(/^[a-f\d]{24}$/i.test(key) ? { _id: key, published: true } : { slug: key, published: true }).catch(() => null);
      if (p) page = { title: `${p.name} | ${cfg.general.businessName}`, description: p.shortDescription || p.description.slice(0, 160), ogImage: p.images?.[0] || '' };
    }
    page = page || { title: `${cfg.general.businessName} | ${cfg.general.tagline}`, description: cfg.general.tagline, ogImage: '' };
    const og = abs(page.ogImage || cfg.seo.defaultOgImage);
    const noindex = pathname.startsWith('/admin') || ['/cart', '/checkout'].includes(pathname);
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: cfg.general.businessName,
      url: env.siteUrl,
      description: cfg.general.tagline,
      address: cfg.contact.address,
      ...(cfg.contact.phone ? { telephone: cfg.contact.phone } : {}),
      ...(og ? { image: og } : {}),
      sameAs: Object.values(cfg.contact.social).filter(Boolean),
    };
    const head = [
      `<title>${esc(page.title)}</title>`,
      `<meta name="description" content="${esc(page.description)}" />`,
      noindex ? '<meta name="robots" content="noindex,nofollow" />' : '',
      `<link rel="canonical" href="${esc(env.siteUrl + pathname)}" />`,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:site_name" content="${esc(cfg.general.businessName)}" />`,
      `<meta property="og:title" content="${esc(page.title)}" />`,
      `<meta property="og:description" content="${esc(page.description)}" />`,
      og ? `<meta property="og:image" content="${esc(og)}" />` : '',
      `<meta name="twitter:card" content="summary_large_image" />`,
      cfg.general.favicon ? `<link rel="icon" href="${esc(cfg.general.favicon)}" />` : '',
      `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`,
    ].filter(Boolean).join('\n    ');
    return head;
  }

  app.use('/assets', express.static(path.join(distDir, 'assets'), { immutable: true, maxAge: '1y' }));
  app.use(express.static(distDir, { index: false, maxAge: '1h' }));
  app.get('*', async (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    try {
      const head = await seoFor(req.path.replace(/\/+$/, '') || '/');
      const html = template.replace(/<title>[\s\S]*?<\/title>/i, '').replace('<!--SEO_HEAD-->', head);
      res.set('Cache-Control', 'no-cache').type('html').send(html);
    } catch (e) {
      next(e);
    }
  });
} else {
  app.get('/', (_req, res) => res.type('text').send('KK Digital Studio API is running. Build the client (npm run build) to serve the website from this server, or use `npm run dev` for development.'));
}

app.use(errorHandler);

async function start() {
  try {
    await connectDB();
  } catch (e) {
    console.error(`\n[db] Could not connect to MongoDB at ${env.mongoUri.replace(/\/\/[^@]*@/, '//***@')}\n     ${e.message}\n     Check MONGODB_URI in your .env file and that MongoDB is running.\n`);
    process.exit(1);
  }
  await ensureConfigExists();
  if ((await AdminUser.countDocuments()) === 0) {
    console.warn('[setup] No admin account exists yet. Run `npm run seed` (or `npm run create-admin`) after setting ADMIN_EMAIL and ADMIN_PASSWORD in .env.');
  }
  console.log(`[media] storage: ${env.cloudinaryEnabled ? 'Cloudinary' : 'local disk (server/uploads) – configure CLOUDINARY_* for cloud storage'}`);
  app.listen(env.port, () => console.log(`[server] listening on http://localhost:${env.port}`));
}

process.on('unhandledRejection', (e) => console.error('[unhandledRejection]', e));
start();
