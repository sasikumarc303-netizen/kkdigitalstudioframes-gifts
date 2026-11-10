const BASE = '/api';

export const qs = (params = {}) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.set(k, v);
  });
  const s = p.toString();
  return s ? `?${s}` : '';
};

async function request(path, { method = 'GET', body, formData } = {}) {
  const headers = {};
  if (!formData) headers['Content-Type'] = 'application/json';
  // Custom header required by the server for state-changing admin calls (CSRF protection).
  if (path.startsWith('/admin')) headers['X-Requested-With'] = 'kk-admin';
  let res;
  try {
    res = await fetch(BASE + path, {
      method,
      headers,
      credentials: 'include',
      body: formData || (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch {
    const err = new Error('Cannot reach the server. Please check your connection and try again.');
    err.network = true;
    throw err;
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    const err = new Error(data?.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.errors = data?.errors || {};
    if (res.status === 401 && path.startsWith('/admin') && !path.startsWith('/admin/auth/login')) {
      window.dispatchEvent(new CustomEvent('kk:unauthorized'));
    }
    throw err;
  }
  return data;
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method: 'POST', body: body ?? {} }),
  put: (p, body) => request(p, { method: 'PUT', body }),
  patch: (p, body) => request(p, { method: 'PATCH', body }),
  del: (p) => request(p, { method: 'DELETE' }),
  upload: (p, formData) => request(p, { method: 'POST', formData }),
};
