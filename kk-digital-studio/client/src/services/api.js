
const API_ORIGIN = (
  import.meta.env.VITE_API_URL ||
  'https://kk-digital-studio-backend.onrender.com'
).replace(/\/+$/, '').replace(/\/api$/i, '');

const PROXY_BASE = '/api';
const DIRECT_BASE = `${API_ORIGIN}/api`;

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

async function request(path, { method = 'GET', body, formData, responseType } = {}) {
  const isAdmin = path.startsWith('/admin');

  const headers = {};

  if (!formData && body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  // Preserve the existing admin CSRF protection.
  if (isAdmin) {
    headers['X-Requested-With'] = 'kk-admin';
  }

  const base = import.meta.env.DEV ? PROXY_BASE : DIRECT_BASE;

  let res;

  try {
    res = await fetch(base + path, {
      method,
      headers,
      credentials: isAdmin ? 'include' : 'omit',
      body: formData || (
        body !== undefined ? JSON.stringify(body) : undefined
      ),
    });
  } catch {
    const err = new Error(
      'Cannot reach the server. Please wait and try again.'
    );
    err.network = true;
    throw err;
  }

  let data = null;

  if (res.ok && responseType === 'blob') return res.blob();

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
  download: (p) =>
    request(p, { responseType: 'blob' }),
};
