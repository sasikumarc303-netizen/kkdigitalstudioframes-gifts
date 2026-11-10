import SiteConfig from '../models/SiteConfig.js';
import { DEFAULT_CONFIG, ARRAY_SHAPES, CONFIG_GROUPS } from './defaults.js';
import { ApiError } from '../utils/helpers.js';

const UNSAFE_URL = /^\s*(javascript|data|vbscript):/i;

function mergeDefaults(def, stored) {
  if (Array.isArray(def)) return Array.isArray(stored) ? stored : def;
  if (def && typeof def === 'object') {
    const out = {};
    const src = stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {};
    for (const k of Object.keys(def)) out[k] = mergeDefaults(def[k], src[k]);
    return out;
  }
  return stored === undefined || stored === null ? def : stored;
}

function clean(tpl, val, path) {
  if (Array.isArray(tpl)) {
    if (!Array.isArray(val)) return tpl;
    const shape = ARRAY_SHAPES[path];
    return val
      .slice(0, 60)
      .map((item) => clean(shape === undefined ? '' : shape, item, `${path}[]`))
      .filter((x) => !(typeof x === 'string' && x === ''));
  }
  if (tpl && typeof tpl === 'object') {
    const src = val && typeof val === 'object' && !Array.isArray(val) ? val : {};
    const out = {};
    for (const k of Object.keys(tpl)) out[k] = clean(tpl[k], src[k] === undefined ? tpl[k] : src[k], path ? `${path}.${k}` : k);
    return out;
  }
  if (typeof tpl === 'boolean') return val === true || val === 'true';
  if (typeof tpl === 'number') {
    const n = Number(val);
    return Number.isFinite(n) && n >= 0 ? n : tpl;
  }
  const s = String(val ?? '').trim().slice(0, 4000);
  return UNSAFE_URL.test(s) ? '' : s;
}

// seo.pages is keyed by route, so it is cleaned page by page against a fixed page shape.
function cleanSeo(input) {
  const base = DEFAULT_CONFIG.seo;
  const pageShape = { title: '', description: '', ogImage: '' };
  const pages = {};
  for (const route of Object.keys(base.pages)) {
    const p = input?.pages?.[route] ?? base.pages[route];
    pages[route] = clean(pageShape, p, 'seo.page');
    pages[route].title = pages[route].title.slice(0, 120);
    pages[route].description = pages[route].description.slice(0, 320);
  }
  return {
    defaultOgImage: clean('', input?.defaultOgImage ?? base.defaultOgImage, 'seo.defaultOgImage'),
    robotsTxt: String(input?.robotsTxt ?? '').slice(0, 4000),
    pages,
  };
}

export async function getConfig() {
  const doc = await SiteConfig.findOne({ key: 'main' }).lean();
  return mergeDefaults(DEFAULT_CONFIG, doc?.data || {});
}

export async function setConfigGroup(group, input) {
  if (!CONFIG_GROUPS.includes(group)) throw new ApiError(404, 'Unknown settings group');
  const value = group === 'seo' ? cleanSeo(input) : clean(DEFAULT_CONFIG[group], input, group);
  await SiteConfig.findOneAndUpdate({ key: 'main' }, { $set: { [`data.${group}`]: value } }, { upsert: true, new: true, setDefaultsOnInsert: true });
  return value;
}

/** Used by seed + media tools to set a nested value without re-sanitising the entire group. */
export async function patchConfigPath(path, value) {
  await SiteConfig.findOneAndUpdate({ key: 'main' }, { $set: { [`data.${path}`]: value } }, { upsert: true, new: true, setDefaultsOnInsert: true });
}

export async function ensureConfigExists() {
  const existing = await SiteConfig.findOne({ key: 'main' });
  if (!existing) await SiteConfig.create({ key: 'main', data: {} });
}

// ----- contact helpers shared by server code -----
export const digits = (s) => String(s || '').replace(/\D/g, '');

export function whatsappLink(config, text = '') {
  const num = digits(config.contact.whatsapp || config.contact.phone);
  if (!num) return '';
  return `https://wa.me/${num}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}
