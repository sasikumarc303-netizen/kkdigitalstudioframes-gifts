import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import AdminUser from '../models/AdminUser.js';
import { ApiError, asyncHandler, sha256 } from '../utils/helpers.js';
import { validate, PASSWORD_RULE, PASSWORD_MESSAGE } from '../middleware/validate.js';
import { issueSession, clearSession } from '../middleware/auth.js';
import { logActivity } from '../services/activity.js';
import { sendMail } from '../services/mailer.js';
import { env } from '../config/env.js';

const MAX_FAILS = 5;
const LOCK_MINUTES = 15;
// Compared against when the e-mail is unknown so response time does not reveal whether an account exists.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password-1', 12);

export const login = asyncHandler(async (req, res) => {
  const { email, password } = validate({ email: { type: 'email', required: true }, password: { type: 'string', required: true, max: 128 } }, req.body);
  const user = await AdminUser.findOne({ email }).select('+passwordHash');

  if (user?.lockUntil && user.lockUntil > new Date()) {
    await bcrypt.compare(password, DUMMY_HASH);
    throw new ApiError(429, `Too many failed attempts. Try again in a few minutes.`);
  }

  const ok = user ? await user.verifyPassword(password) : (await bcrypt.compare(password, DUMMY_HASH), false);
  if (!user || !ok || !user.active) {
    if (user && !ok) {
      user.failedLogins = (user.failedLogins || 0) + 1;
      if (user.failedLogins >= MAX_FAILS) {
        user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60000);
        user.failedLogins = 0;
      }
      await user.save();
    }
    throw new ApiError(401, 'Invalid email or password');
  }

  user.failedLogins = 0;
  user.lockUntil = undefined;
  user.lastLoginAt = new Date();
  await user.save();
  issueSession(res, user);
  req.user = user;
  logActivity(req, { action: 'login', entity: 'session', summary: `${user.name} signed in` });
  res.json({ user: user.toSafe() });
});

export const logout = asyncHandler(async (req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

export const me = (req, res) => res.json({ user: req.user.toSafe() });

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = validate({ email: { type: 'email', required: true } }, req.body);
  const user = await AdminUser.findOne({ email, active: true });
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    user.resetTokenHash = sha256(token);
    user.resetExpires = new Date(Date.now() + 30 * 60000);
    await user.save();
    const base = env.clientOrigins[0] || env.siteUrl;
    const link = `${base}/admin/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;
    const { sent } = await sendMail({
      to: user.email,
      subject: 'Reset your KK Digital Studio admin password',
      text: `Hello ${user.name},\n\nUse this link within 30 minutes to choose a new password:\n${link}\n\nIf you did not request this, you can ignore this email.`,
    });
    if (!sent) {
      if (env.isProd) console.warn('[auth] Password reset requested but SMTP is not configured – no email was sent. Configure SMTP_* or use `npm run create-admin` to reset manually.');
      else console.log(`[auth] (dev) SMTP not configured. Password reset link for ${user.email}:\n${link}`);
    }
  }
  // Same response whether or not the account exists.
  res.json({ ok: true, message: 'If an account exists for that email, a reset link has been sent.' });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { email, token, password } = validate(
    { email: { type: 'email', required: true }, token: { type: 'string', required: true, max: 200 }, password: { type: 'string', required: true, max: 128 } },
    req.body
  );
  if (!PASSWORD_RULE(password)) throw new ApiError(422, PASSWORD_MESSAGE, { password: PASSWORD_MESSAGE });
  const user = await AdminUser.findOne({ email, active: true }).select('+resetTokenHash +resetExpires');
  if (!user || !user.resetTokenHash || !user.resetExpires || user.resetExpires < new Date() || user.resetTokenHash !== sha256(token)) {
    throw new ApiError(400, 'This reset link is invalid or has expired');
  }
  user.passwordHash = await AdminUser.hashPassword(password);
  user.resetTokenHash = undefined;
  user.resetExpires = undefined;
  user.failedLogins = 0;
  user.lockUntil = undefined;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  req.user = user;
  logActivity(req, { action: 'update', entity: 'password', summary: `${user.name} reset their password` });
  res.json({ ok: true });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = validate(
    { currentPassword: { type: 'string', required: true, max: 128 }, newPassword: { type: 'string', required: true, max: 128 } },
    req.body
  );
  if (!PASSWORD_RULE(newPassword)) throw new ApiError(422, PASSWORD_MESSAGE, { newPassword: PASSWORD_MESSAGE });
  const user = await AdminUser.findById(req.user._id).select('+passwordHash');
  if (!(await user.verifyPassword(currentPassword))) throw new ApiError(400, 'Current password is incorrect', { currentPassword: 'Incorrect password' });
  user.passwordHash = await AdminUser.hashPassword(newPassword);
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  issueSession(res, user); // keep this browser signed in with the new token version
  logActivity(req, { action: 'update', entity: 'password', summary: `${user.name} changed their password` });
  res.json({ ok: true });
});
