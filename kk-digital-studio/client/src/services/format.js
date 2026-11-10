export const money = (n, symbol = '₹') => `${symbol}${Number(n || 0).toLocaleString('en-IN')}`;

export const formatDate = (iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!iso) return '';
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', opts);
};

export const formatDateTime = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export const formatTime = (hhmm) => {
  if (!/^\d{2}:\d{2}$/.test(hhmm || '')) return hhmm || '';
  const [h, m] = hhmm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

export const todayISO = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

/**
 * Cloudinary images get automatic format/quality and width; any other URL (local uploads, static assets) is returned as is.
 */
export function optimizeImage(url, width) {
  if (!url) return url;
  if (/^https:\/\/res\.cloudinary\.com\/.+\/image\/upload\//.test(url) && !/\/image\/upload\/[^/]*(f_auto|w_)/.test(url)) {
    return url.replace('/image/upload/', `/image/upload/f_auto,q_auto${width ? `,w_${width}` : ''}/`);
  }
  return url;
}

export const classes = (...c) => c.filter(Boolean).join(' ');
