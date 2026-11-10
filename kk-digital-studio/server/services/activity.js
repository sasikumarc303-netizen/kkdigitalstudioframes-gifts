import ActivityLog from '../models/ActivityLog.js';

const clientIp = (req) => (req?.ip || '').replace('::ffff:', '');

/** Record an admin action. Never throws – logging must not break the request. */
export function logActivity(req, { action, entity = '', entityId = '', summary = '' }) {
  return ActivityLog.create({
    actor: req.user?._id,
    actorName: req.user?.name || 'System',
    actorType: req.user ? 'admin' : 'system',
    action,
    entity,
    entityId: String(entityId || ''),
    summary: String(summary).slice(0, 300),
    ip: clientIp(req),
  }).catch((e) => console.error('[activity] failed to log', e.message));
}

/** Record something a website visitor did (new booking, order, enquiry). */
export function logPublicEvent(req, { action, entity, entityId, summary }) {
  return ActivityLog.create({
    actorName: 'Website visitor',
    actorType: 'public',
    action,
    entity,
    entityId: String(entityId || ''),
    summary: String(summary).slice(0, 300),
    ip: clientIp(req),
  }).catch((e) => console.error('[activity] failed to log', e.message));
}
