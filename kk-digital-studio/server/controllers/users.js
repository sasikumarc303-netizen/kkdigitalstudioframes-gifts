import mongoose from 'mongoose';
import AdminUser from '../models/AdminUser.js';
import { ApiError, asyncHandler } from '../utils/helpers.js';
import { validate, PASSWORD_RULE, PASSWORD_MESSAGE } from '../middleware/validate.js';
import { MODULES, ROLES, ROLE_DEFAULTS } from '../config/constants.js';
import { logActivity } from '../services/activity.js';

const cleanPerms = (perms) => [...new Set((Array.isArray(perms) ? perms : []).filter((p) => MODULES.includes(p)))];

const assertCanTouchRole = (actor, role) => {
  if ((role === 'superadmin') && actor.role !== 'superadmin') throw new ApiError(403, 'Only a superadmin can manage superadmin accounts');
};

const activeSuperadmins = () => AdminUser.countDocuments({ role: 'superadmin', active: true });

export const list = asyncHandler(async (_req, res) => {
  const users = await AdminUser.find().sort({ createdAt: 1 });
  res.json({ items: users.map((u) => u.toSafe()), roles: ROLES, modules: MODULES, roleDefaults: ROLE_DEFAULTS });
});

export const create = asyncHandler(async (req, res) => {
  const data = validate(
    {
      name: { type: 'string', required: true, min: 2, max: 80 },
      email: { type: 'email', required: true },
      password: { type: 'string', required: true, max: 128 },
      role: { type: 'enum', values: ROLES, required: true },
    },
    req.body
  );
  assertCanTouchRole(req.user, data.role);
  if (!PASSWORD_RULE(data.password)) throw new ApiError(422, PASSWORD_MESSAGE, { password: PASSWORD_MESSAGE });
  const permissions = data.role === 'superadmin' ? [...MODULES] : req.body.permissions ? cleanPerms(req.body.permissions) : ROLE_DEFAULTS[data.role];
  const user = await AdminUser.create({ name: data.name, email: data.email, role: data.role, permissions, passwordHash: await AdminUser.hashPassword(data.password) });
  logActivity(req, { action: 'create', entity: 'admin user', entityId: user._id, summary: `Created admin account ${user.email} (${user.role})` });
  res.status(201).json(user.toSafe());
});

export const update = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid id');
  const user = await AdminUser.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  const data = validate(
    {
      name: { type: 'string', min: 2, max: 80 },
      role: { type: 'enum', values: ROLES },
      active: { type: 'boolean' },
      password: { type: 'string', max: 128 },
    },
    req.body
  );
  assertCanTouchRole(req.user, user.role);
  if (data.role) assertCanTouchRole(req.user, data.role);

  const isSelf = String(user._id) === String(req.user._id);
  const losesSuperadmin = user.role === 'superadmin' && ((data.role && data.role !== 'superadmin') || data.active === false);
  if (losesSuperadmin) {
    if (isSelf) throw new ApiError(409, 'You cannot demote or disable your own superadmin account');
    if ((await activeSuperadmins()) <= 1) throw new ApiError(409, 'At least one active superadmin is required');
  }
  if (isSelf && data.active === false) throw new ApiError(409, 'You cannot disable your own account');

  let invalidate = false;
  if (data.name) user.name = data.name;
  if (data.role && data.role !== user.role) { user.role = data.role; invalidate = true; }
  if (typeof data.active === 'boolean' && data.active !== user.active) { user.active = data.active; invalidate = true; }
  if ('permissions' in req.body) { user.permissions = user.role === 'superadmin' ? [...MODULES] : cleanPerms(req.body.permissions); invalidate = true; }
  if (user.role === 'superadmin') user.permissions = [...MODULES];
  if (data.password) {
    if (!PASSWORD_RULE(data.password)) throw new ApiError(422, PASSWORD_MESSAGE, { password: PASSWORD_MESSAGE });
    user.passwordHash = await AdminUser.hashPassword(data.password);
    user.failedLogins = 0;
    user.lockUntil = undefined;
    invalidate = true;
  }
  if (invalidate && !isSelf) user.tokenVersion = (user.tokenVersion || 0) + 1; // forces re-login with new rights
  await user.save();
  logActivity(req, { action: 'update', entity: 'admin user', entityId: user._id, summary: `Updated admin account ${user.email}` });
  res.json(user.toSafe());
});

export const remove = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid id');
  const user = await AdminUser.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  if (String(user._id) === String(req.user._id)) throw new ApiError(409, 'You cannot delete your own account');
  assertCanTouchRole(req.user, user.role);
  if (user.role === 'superadmin' && user.active && (await activeSuperadmins()) <= 1) throw new ApiError(409, 'At least one active superadmin is required');
  await user.deleteOne();
  logActivity(req, { action: 'delete', entity: 'admin user', entityId: user._id, summary: `Deleted admin account ${user.email}` });
  res.json({ ok: true });
});
