import { DEFAULT_CONFIG } from '../../../server/services/defaults.js';
import { getFallbackPackages, getFallbackServices } from '../../../public-content.mjs';

const PROXY_BASE = '/api';
const PUBLIC_GET_TIMEOUT_MS = 12000;
const PUBLIC_GET_RETRIES = 1;
const publicGetCache = new Map();

export const qs = (params = {}) => {
  const p = new URLSearchParams();

  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      p.set(k, v);
    }
  });

  const s = p.toString();
  return s ? `?${s}` : '';
};

const routePath = (path) => path.split('?')[0];

function isPublicGet(path, method) {
  return method === 'GET' && !path.startsWith('/admin');
}

function cachePublicResponse(path, data) {
  if (
    !data ||
    data.isLocalFallback ||
    data.services?.some?.((item) => item.isLocalFallback) ||
    data.packages?.some?.((item) => item.isLocalFallback) ||
    data.some?.((item) => item.isLocalFallback)
  ) return;
  if (Array.isArray(data) && data.length > 0) {
    publicGetCache.set(path, data);
  } else if (data && typeof data === 'object' && !Array.isArray(data)) {
    publicGetCache.set(path, data);
  }
}

function addServiceFallback(data) {
  if (Array.isArray(data) && data.length === 0) return getFallbackServices();
  return data;
}

function addPackageFallback(data) {
  if (Array.isArray(data) && data.length === 0) return getFallbackPackages();
  return data;
}

function localFallback(path) {
  const endpoint = routePath(path);
  if (endpoint === '/site') {
    return { config: { ...DEFAULT_CONFIG, isLocalFallback: true }, payment: null, isLocalFallback: true };
  }
  if (endpoint === '/services') return getFallbackServices();
  if (endpoint === '/packages') return getFallbackPackages();
  if (
    endpoint === '/gallery' ||
    endpoint === '/categories' ||
    endpoint === '/products' ||
    endpoint === '/testimonials'
  ) return [];
  if (endpoint === '/home') {
    return {
      config: { ...DEFAULT_CONFIG, isLocalFallback: true },
      payment: null,
      services: getFallbackServices(),
      products: [],
      gallery: [],
      packages: getFallbackPackages(),
      testimonials: [],
      isLocalFallback: true,
    };
  }
  return null;
}

function applyKnownFallback(path, data) {
  const endpoint = routePath(path);
  if (endpoint === '/services') return addServiceFallback(data);
  if (endpoint === '/packages') return addPackageFallback(data);
  if (endpoint === '/home' && data && typeof data === 'object') {
    return {
      ...data,
      services: addServiceFallback(data.services || []),
      packages: addPackageFallback(data.packages || []),
    };
  }
  return data;
}

function shouldRetry(error) {
  return error.network || error.status >= 500;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    let data;
    try {
      data = await response.json();
    } catch {
      const error = new Error(`The server returned an invalid response (${response.status}).`);
      error.status = response.status;
      error.invalidResponse = true;
      throw error;
    }
    if (!response.ok) {
      const error = new Error(data?.message || `Request failed (${response.status})`);
      error.status = response.status;
      error.errors = data?.errors || {};
      throw error;
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('The server took too long to respond. Please try again.');
      timeoutError.network = true;
      timeoutError.timeout = true;
      throw timeoutError;
    }
    if (error instanceof TypeError) {
      const networkError = new Error('Cannot reach the server. Please check your connection and try again.');
      networkError.network = true;
      throw networkError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function request(path, { method = 'GET', body, formData } = {}) {
  const isAdmin = path.startsWith('/admin');
  const usePublicFallback = isPublicGet(path, method);

  const headers = {};

  if (!formData && body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  // Preserve the existing admin CSRF protection.
  if (isAdmin) {
    headers['X-Requested-With'] = 'kk-admin';
  }

  const fetchOptions = {
      method,
      headers,
      credentials: 'include',
      body: formData || (
        body !== undefined ? JSON.stringify(body) : undefined
      ),
  };

  let data;
  let failure;
  const attempts = usePublicFallback ? PUBLIC_GET_RETRIES + 1 : 1;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      data = await fetchJson(PROXY_BASE + path, fetchOptions, usePublicFallback ? PUBLIC_GET_TIMEOUT_MS : 30000);
      if (usePublicFallback) {
        const resolved = applyKnownFallback(path, data);
        cachePublicResponse(path, resolved);
        return resolved;
      }
      return data;
    } catch (error) {
      failure = error;
      if (error.status === 401 && isAdmin && !path.startsWith('/admin/auth/login')) {
        window.dispatchEvent(new CustomEvent('kk:unauthorized'));
      }
      if (!usePublicFallback || attempt >= attempts - 1 || !shouldRetry(error)) break;
      await delay(500 * (attempt + 1));
    }
  }

  if (usePublicFallback) {
    if (publicGetCache.has(path)) return publicGetCache.get(path);
    const fallback = localFallback(path);
    if (fallback !== null) return fallback;
  }
  throw failure;
}

export const api = {
  get: (p) => request(p),
  post: (p, body) =>
    request(p, { method: 'POST', body: body ?? {} }),
  put: (p, body) =>
    request(p, { method: 'PUT', body }),
  patch: (p, body) =>
    request(p, { method: 'PATCH', body }),
  del: (p) =>
    request(p, { method: 'DELETE' }),
  upload: (p, formData) =>
    request(p, { method: 'POST', formData }),
};
