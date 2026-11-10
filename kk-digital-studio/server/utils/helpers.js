import crypto from 'node:crypto';

export class ApiError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function slugify(text) {
  const s = String(text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return s || 'item';
}

export const pick = (obj, keys) => {
  const out = {};
  for (const k of keys) if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined) out[k] = obj[k];
  return out;
};

export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

/** Last 10 digits of a phone number – used to match returning customers / verify lookups. */
export const phoneKey = (phone) => String(phone || '').replace(/\D/g, '').slice(-10);

const IST_OFFSET_MIN = 330;
/** Today's date (YYYY-MM-DD) in India Standard Time. */
export function todayIST() {
  return new Date(Date.now() + IST_OFFSET_MIN * 60000).toISOString().slice(0, 10);
}

/** Human-friendly reference like KK-BK-241109-7F3A */
export function makeReference(prefix) {
  const d = new Date(Date.now() + IST_OFFSET_MIN * 60000).toISOString().slice(2, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 4);
  return `KK-${prefix}-${d}-${rand}`;
}

export function parsePaging(query, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export const isObjectId = (v) => /^[a-f\d]{24}$/i.test(String(v || ''));
