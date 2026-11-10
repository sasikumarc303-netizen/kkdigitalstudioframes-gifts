import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import AdminUser from '../models/AdminUser.js';
import { ApiError, asyncHandler } from '../utils/helpers.js';

export const COOKIE_NAME = 'kk_admin';

export function issueSession(res, user) {
  const token = jwt.sign({ sub: String(user._id), v: user.tokenVersion || 0 }, env.jwtSecret, {
    expiresIn: `${env.jwtExpiresHours}h`,
  });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'strict',
    maxAge: env.jwtExpiresHours * 3600 * 1000,
    path: '/',
  });
}

export const clearSession = (res) =>
  res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: env.cookieSecure, sameSite: 'strict', path: '/' });

/** Server-side authentication: verifies cookie JWT, loads the user fresh from the DB on every request. */
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) throw new ApiError(401, 'Authentication required');
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new ApiError(401, 'Session expired. Please sign in again.');
  }
  const user = await AdminUser.findById(payload.sub);
  if (!user || !user.active || (user.tokenVersion || 0) !== payload.v) {
    throw new ApiError(401, 'Session is no longer valid. Please sign in again.');
  }
  req.user = user;
  next();
});

export const hasPermission = (user, perm) =>
  Boolean(user) && (user.role === 'superadmin' || (Array.isArray(user.permissions) && user.permissions.includes(perm)));

/** Server-side authorization for a module (any of the listed permissions grants access). */
export const requirePermission = (...perms) => (req, _res, next) => {
  if (perms.some((p) => hasPermission(req.user, p))) return next();
  next(new ApiError(403, 'You do not have permission to perform this action'));
};

export const requireSuperadmin = (req, _res, next) =>
  req.user?.role === 'superadmin' ? next() : next(new ApiError(403, 'Superadmin access required'));

/**
 * CSRF mitigation for cookie auth: state-changing admin requests must carry a custom header that
 * cross-site forms cannot set. Combined with SameSite=Strict cookies and a locked-down CORS policy.
 */
export const csrfGuard = (req, _res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('x-requested-with') !== 'kk-admin') return next(new ApiError(403, 'Missing CSRF header'));
  next();
};
