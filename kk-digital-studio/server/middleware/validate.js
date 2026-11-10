import { ApiError, todayIST } from '../utils/helpers.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9][0-9\s\-()]{6,18}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Tiny schema validator. Returns a cleaned object containing ONLY the keys in the schema.
 * Rule options: type (string|text|email|phone|date|futureDate|time|number|int|boolean|enum|id),
 * required, min, max, values (enum), default.
 */
export function validate(schema, input = {}) {
  const errors = {};
  const out = {};
  for (const [key, rule] of Object.entries(schema)) {
    let val = input[key];
    const empty = val === undefined || val === null || (typeof val === 'string' && val.trim() === '');
    if (empty) {
      if (rule.required) errors[key] = rule.message || 'This field is required';
      else if (rule.default !== undefined) out[key] = rule.default;
      continue;
    }
    switch (rule.type || 'string') {
      case 'string':
      case 'text': {
        val = String(val).trim();
        if (rule.min && val.length < rule.min) errors[key] = `Must be at least ${rule.min} characters`;
        else if (val.length > (rule.max || 500)) errors[key] = `Must be at most ${rule.max || 500} characters`;
        else out[key] = val;
        break;
      }
      case 'email': {
        val = String(val).trim().toLowerCase();
        if (!EMAIL_RE.test(val) || val.length > 160) errors[key] = 'Enter a valid email address';
        else out[key] = val;
        break;
      }
      case 'phone': {
        val = String(val).trim();
        const digits = val.replace(/\D/g, '');
        if (!PHONE_RE.test(val) || digits.length < 7 || digits.length > 15) errors[key] = 'Enter a valid phone number';
        else out[key] = val;
        break;
      }
      case 'date':
      case 'futureDate': {
        val = String(val).trim();
        const d = new Date(`${val}T00:00:00Z`);
        if (!DATE_RE.test(val) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== val) errors[key] = 'Enter a valid date';
        else if (rule.type === 'futureDate' && val < todayIST()) errors[key] = 'Date cannot be in the past';
        else out[key] = val;
        break;
      }
      case 'time': {
        val = String(val).trim();
        if (!TIME_RE.test(val)) errors[key] = 'Enter a valid time';
        else out[key] = val;
        break;
      }
      case 'number':
      case 'int': {
        const n = Number(val);
        if (!Number.isFinite(n) || (rule.type === 'int' && !Number.isInteger(n))) errors[key] = 'Enter a valid number';
        else if (rule.min !== undefined && n < rule.min) errors[key] = `Must be at least ${rule.min}`;
        else if (rule.max !== undefined && n > rule.max) errors[key] = `Must be at most ${rule.max}`;
        else out[key] = n;
        break;
      }
      case 'boolean':
        out[key] = val === true || val === 'true' || val === 1 || val === '1';
        break;
      case 'enum':
        if (!rule.values.includes(val)) errors[key] = `Must be one of: ${rule.values.join(', ')}`;
        else out[key] = val;
        break;
      case 'id':
        if (!/^[a-f\d]{24}$/i.test(String(val))) errors[key] = 'Invalid reference';
        else out[key] = String(val);
        break;
      default:
        out[key] = val;
    }
  }
  if (Object.keys(errors).length) throw new ApiError(422, 'Please correct the highlighted fields', errors);
  return out;
}

export const validateBody = (schema) => (req, _res, next) => {
  try {
    req.body = validate(schema, req.body || {});
    next();
  } catch (e) {
    next(e);
  }
};

/** Honeypot: bots fill the hidden `website` field. Silently accept but do nothing. */
export const honeypot = (req, res, next) => {
  if (req.body && typeof req.body.website === 'string' && req.body.website.trim() !== '') {
    return res.status(201).json({ ok: true });
  }
  next();
};

export const PASSWORD_RULE = (pw) =>
  typeof pw === 'string' && pw.length >= 10 && pw.length <= 128 && /[A-Za-z]/.test(pw) && /\d/.test(pw);
export const PASSWORD_MESSAGE = 'Password must be 10–128 characters and include at least one letter and one number';
