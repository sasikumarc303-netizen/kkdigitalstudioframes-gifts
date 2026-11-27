
const ENV = import.meta.env || {};
const API_ORIGIN = (
  ENV.VITE_API_URL ||
  'https://kk-digital-studio-backend.onrender.com'
).replace(/\/+$/, '').replace(/\/api$/i, '');

const PROXY_BASE = '/api';
const DIRECT_BASE = `${API_ORIGIN}/api`;
const REQUEST_TIMEOUT_MS = 30_000;
const TRANSFER_TIMEOUT_MS = 120_000;
const GET_RETRY_DELAY_MS = 750;
const RETRYABLE_STATUSES = new Set([502, 503, 504]);

function networkError(timedOut) {
  const error = new Error(
    timedOut
      ? 'The server took too long to respond. Please try again.'
      : 'Cannot reach the server. Please wait and try again.'
  );
  error.network = true;
  error.timeout = timedOut;
  return error;
}

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

async function request(path, {
  method = 'GET',
  body,
  formData,
  responseType,
  timeoutMs = REQUEST_TIMEOUT_MS,
} = {}) {
  const isAdmin = path.startsWith('/admin');

  const headers = {};

  if (!formData && body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  // Preserve the existing admin CSRF protection.
  if (isAdmin) {
    headers['X-Requested-With'] = 'kk-admin';
  }

  const base = ENV.DEV ? PROXY_BASE : DIRECT_BASE;
  const controller = new AbortController();
  const timeoutId = timeoutMs > 0
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;
  let res;

  try {
    try {
      res = await fetch(base + path, {
        method,
        headers,
        credentials: isAdmin ? 'include' : 'omit',
        body: formData || (
          body !== undefined ? JSON.stringify(body) : undefined
        ),
        signal: controller.signal,
      });
    } catch {
      throw networkError(controller.signal.aborted);
    }

    let data = null;

    if (res.ok && responseType === 'blob') {
      try {
        return await res.blob();
      } catch {
        throw networkError(controller.signal.aborted);
      }
    }

    try {
      data = await res.json();
    } catch {
      if (controller.signal.aborted) throw networkError(true);
      // Empty or non-JSON response.
    }

    if (!res.ok) {
      const err = new Error(
        data?.message || `Request failed (${res.status})`
      );

      err.status = res.status;
      err.errors = data?.errors || {};

      if (
        res.status === 401 &&
        isAdmin &&
        !path.startsWith('/admin/auth/login')
      ) {
        window.dispatchEvent(
          new CustomEvent('kk:unauthorized')
        );
      }

      throw err;
    }

    return data;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function getWithRetry(path, options) {
  const canRetry = !path.startsWith('/admin') && path !== '/site';

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await request(path, options);
    } catch (error) {
      const retryable = error?.network || RETRYABLE_STATUSES.has(error?.status);
      if (!canRetry || attempt > 0 || !retryable) throw error;
      await new Promise((resolve) => setTimeout(resolve, GET_RETRY_DELAY_MS));
    }
  }
}

export const api = {
  get: (p, options) => getWithRetry(p, options),
  post: (p, body, options) =>
    request(p, { ...options, method: 'POST', body: body ?? {} }),
  put: (p, body) =>
    request(p, { method: 'PUT', body }),
  patch: (p, body) =>
    request(p, { method: 'PATCH', body }),
  del: (p) =>
    request(p, { method: 'DELETE' }),
  upload: (p, formData) =>
    request(p, { method: 'POST', formData, timeoutMs: TRANSFER_TIMEOUT_MS }),
  download: (p) =>
    request(p, { responseType: 'blob', timeoutMs: TRANSFER_TIMEOUT_MS }),
};
