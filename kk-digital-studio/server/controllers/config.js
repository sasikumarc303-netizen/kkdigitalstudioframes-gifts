import { ApiError, asyncHandler } from '../utils/helpers.js';
import { getConfig, setConfigGroup } from '../services/siteConfig.js';
import { hasPermission } from '../middleware/auth.js';
import { logActivity } from '../services/activity.js';
import { paymentInfo } from '../services/payments.js';

// Which admin permission(s) may edit each settings group.
const GROUP_PERMS = {
  general: ['settings'],
  contact: ['contact', 'settings'],
  commerce: ['settings'],
  navigation: ['navigation', 'settings'],
  homepage: ['homepage'],
  seo: ['seo'],
};

export const getAll = asyncHandler(async (_req, res) => res.json({ config: await getConfig(), payment: paymentInfo() }));

export const saveGroup = asyncHandler(async (req, res) => {
  const { group } = req.params;
  const perms = GROUP_PERMS[group];
  if (!perms) throw new ApiError(404, 'Unknown settings group');
  if (!perms.some((p) => hasPermission(req.user, p))) throw new ApiError(403, 'You do not have permission to edit these settings');
  const value = await setConfigGroup(group, req.body);
  logActivity(req, { action: 'update', entity: 'settings', summary: `Updated ${group} settings` });
  res.json({ group, value });
});
