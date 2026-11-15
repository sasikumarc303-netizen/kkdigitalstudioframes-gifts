
const PROXY_BASE = '/api';
const GET_TIMEOUT_MS = 60000;
const REQUEST_TIMEOUT_MS = 30000;
const GET_RETRIES = 1;

let lastWakeTime = 0;
let wakePromise = null;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

// Wake Render through the same-origin proxy before sending an admin request.
async function wakeBackend() {
  if (!import.meta.env.PROD) return;

  if (Date.now() - lastWakeTime < 10 * 60 * 1000) {
    return;
  }

  if (!wakePromise) {
    wakePromise = fetchWithTimeout(`${PROXY_BASE}/health`, {
      method: 'GET',
      credentials: 'omit',
      cache: 'no-store',
    }, GET_TIMEOUT_MS)
      .then(() => {
        lastWakeTime = Date.now();
      })
      .finally(() => {
        wakePromise = null;
      });
  }

  return wakePromise;
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('The server is taking longer than usual to respond. Please try again.');
      timeoutError.network = true;
      timeoutError.timeout = true;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function request(path, { method = 'GET', body, formData } = {}) {
  const isAdmin = path.startsWith('/admin');

  const headers = {};

  if (!formData && body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  // Preserve the existing admin CSRF protection.
  if (isAdmin) {
    headers['X-Requested-With'] = 'kk-admin';
  }

  const retryGet = method === 'GET';
  const attempts = retryGet ? GET_RETRIES + 1 : 1;
  let res;

  if (isAdmin && import.meta.env.PROD) {
    try {
      await wakeBackend();
    } catch {
      // Still attempt the original API request.
    }
  }

  const options = {
    method,
    headers,
    credentials: isAdmin ? 'include' : 'omit',
    body: formData || (
      body !== undefined ? JSON.stringify(body) : undefined
    ),
  };

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      res = await fetchWithTimeout(
        PROXY_BASE + path,
        options,
        retryGet ? GET_TIMEOUT_MS : REQUEST_TIMEOUT_MS
      );
      if (retryGet && res.status >= 500 && attempt < attempts - 1) {
        await delay(750);
        continue;
      }
      break;
    } catch (error) {
      if (attempt >= attempts - 1) {
        const networkError = new Error(
          error.timeout
            ? error.message
            : 'Cannot reach the server. Please wait and try again.'
        );
        networkError.network = true;
        networkError.timeout = Boolean(error.timeout);
        throw networkError;
      }
      await delay(750);
    }
  }

  let data = null;

  try {
    data = await res.json();
  } catch {
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
