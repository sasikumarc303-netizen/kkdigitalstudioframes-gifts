import dotenv from 'dotenv';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SERVER_ROOT = path.resolve(here, '..');
export const PROJECT_ROOT = path.resolve(SERVER_ROOT, '..');

// Root .env first, then server/.env (dotenv never overrides values that are already set).
dotenv.config({ path: path.join(PROJECT_ROOT, '.env') });
dotenv.config({ path: path.join(SERVER_ROOT, '.env') });

const bool = (v, d = false) => (v === undefined || v === '' ? d : ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase()));
const int = (v, d) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};
const list = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);

const isProd = process.env.NODE_ENV === 'production';

let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  if (isProd) {
    throw new Error('JWT_SECRET must be set to a random string of at least 32 characters in production.');
  }
  jwtSecret = crypto.randomBytes(48).toString('hex');
  console.warn('[env] JWT_SECRET missing or shorter than 32 chars – using a temporary secret. Admin sessions reset on every restart.');
}

export const env = {
  isProd,
  port: int(process.env.PORT, 5000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kk-digital-studio',
  jwtSecret,
  jwtExpiresHours: int(process.env.JWT_EXPIRES_HOURS, 8),
  // Public URL of the site (used for sitemap, absolute links in emails)
  siteUrl: (process.env.SITE_URL || `http://localhost:${int(process.env.PORT, 5000)}`).replace(/\/+$/, ''),
  // Extra origins allowed to call the API with cookies (only needed if the client is hosted on another origin)
  clientOrigins: list(process.env.CLIENT_URL),
  cookieSecure: bool(process.env.COOKIE_SECURE, isProd),
  trustProxy: bool(process.env.TRUST_PROXY, isProd),
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  maxImageMB: int(process.env.MAX_IMAGE_MB, 10),
  maxVideoMB: int(process.env.MAX_VIDEO_MB, 100),
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: int(process.env.SMTP_PORT, 587),
    secure: bool(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || '',
  },
  // Used only by scripts/seed.js and scripts/createAdmin.js
  seedAdmin: {
    name: process.env.ADMIN_NAME || 'Studio Owner',
    email: (process.env.ADMIN_EMAIL || '').toLowerCase(),
    password: process.env.ADMIN_PASSWORD || '',
  },
  paymentProvider: (process.env.PAYMENT_PROVIDER || 'none').toLowerCase(),
  // Seed values for contact details (editable later in the admin panel). Never invented.
  seedContact: {
    phone: process.env.BUSINESS_PHONE || '',
    whatsapp: process.env.BUSINESS_WHATSAPP || '',
    email: process.env.BUSINESS_EMAIL || '',
  },
};

env.cloudinaryEnabled = Boolean(env.cloudinary.cloudName && env.cloudinary.apiKey && env.cloudinary.apiSecret);
env.smtpEnabled = Boolean(env.smtp.host && env.smtp.from);
