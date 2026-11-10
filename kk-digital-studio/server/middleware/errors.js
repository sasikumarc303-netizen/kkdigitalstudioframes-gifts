import multer from 'multer';
import { ApiError } from '../utils/helpers.js';
import { env } from '../config/env.js';

export function notFoundApi(req, res) {
  res.status(404).json({ message: `Not found: ${req.method} ${req.originalUrl.split('?')[0]}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ message: err.message, errors: err.errors });
  }
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? `File is too large (max ${env.maxVideoMB} MB)` : err.message;
    return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ message: msg });
  }
  if (err?.name === 'ValidationError' && err.errors) {
    const errors = {};
    for (const [k, v] of Object.entries(err.errors)) errors[k] = v.message;
    return res.status(422).json({ message: 'Validation failed', errors });
  }
  if (err?.name === 'CastError') return res.status(400).json({ message: 'Invalid identifier or value' });
  if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'value';
    return res.status(409).json({ message: `A record with this ${field} already exists`, errors: { [field]: 'Already exists' } });
  }
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON body' });
  if (err?.type === 'entity.too.large') return res.status(413).json({ message: 'Request body too large' });

  console.error('[error]', err);
  res.status(500).json({ message: env.isProd ? 'Something went wrong' : err.message });
}
