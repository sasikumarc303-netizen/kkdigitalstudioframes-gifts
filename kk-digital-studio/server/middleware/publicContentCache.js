const PUBLIC_CONTENT_PATH = /^\/(?:site|home|services|packages|testimonials|categories|gallery|products(?:\/[^/]+)?)$/;

export function publicContentCache(req, res, next) {
  if (req.method !== 'GET' || !PUBLIC_CONTENT_PATH.test(req.path)) return next();

  const send = res.send;
  res.send = function sendPublicContent(...args) {
    if (res.statusCode < 400) {
      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    }
    return send.apply(this, args);
  };
  next();
}
