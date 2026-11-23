import { randomUUID } from 'node:crypto';
import Order from '../models/Order.js';
import OrderNotification from '../models/OrderNotification.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/helpers.js';
import { sendWhatsAppOrderStatus } from './whatsapp.js';
import {
  canRetryOrderNotification,
  MAX_NOTIFICATION_ATTEMPTS,
  notificationIntent,
  orderNotificationKey,
} from './orderTracking.js';

const BASE_RETRY_SECONDS = 60;
const MAX_RETRY_SECONDS = 3600;
const CLAIM_TIMEOUT_MS = 60_000;

export function notificationRetryDelaySeconds(attempts, retryAfterSeconds) {
  const requestedDelay = Number(retryAfterSeconds);
  if (Number.isFinite(requestedDelay) && requestedDelay > 0) {
    return Math.min(Math.ceil(requestedDelay), MAX_RETRY_SECONDS);
  }
  const attempt = Number.isFinite(Number(attempts)) ? Math.max(1, Math.floor(Number(attempts))) : 1;
  return Math.min(BASE_RETRY_SECONDS * (2 ** (attempt - 1)), MAX_RETRY_SECONDS);
}

function logNotification(level, event, notification, details = {}) {
  const logger = console[level] || console.info;
  logger(`[whatsapp] ${event}`, JSON.stringify({
    notificationId: String(notification._id),
    orderId: String(notification.order),
    status: notification.status,
    ...details,
  }));
}

export async function ensureOrderNotification(
  order,
  status,
  { model = OrderNotification, providerEnabled = env.whatsappEnabled, session } = {}
) {
  const consent = order.whatsappOptIn === true;
  const intent = notificationIntent({ optedIn: consent, providerEnabled });
  const idempotencyKey = orderNotificationKey(order._id, status);

  try {
    const options = { upsert: true, new: true, setDefaultsOnInsert: true };
    if (session) options.session = session;
    return await model.findOneAndUpdate(
      { idempotencyKey },
      {
        $setOnInsert: {
          order: order._id,
          idempotencyKey,
          status,
          state: intent.state,
          attempts: intent.attempts,
          nextAttemptAt: null,
          lastAttemptAt: null,
          acceptedAt: null,
          lastError: '',
          providerMessageId: '',
        },
      },
      options
    );
  } catch (error) {
    if (error?.code !== 11000) throw error;
    if (session) throw error;
    return model.findOne({ idempotencyKey });
  }
}

export const enqueueOrderNotification = (order, status, options) => ensureOrderNotification(order, status, options);

async function updateClaimedNotification(model, notification, claimId, result) {
  const now = new Date();
  const attempts = notification.attempts;
  let state = result.state;
  let nextAttemptAt = null;
  let lastError = result.code || '';
  let acceptedAt = null;
  let providerMessageId = '';

  if (result.state === 'retryable' && attempts < MAX_NOTIFICATION_ATTEMPTS) {
    state = 'queued';
    const delaySeconds = notificationRetryDelaySeconds(attempts, result.retryAfterSeconds);
    nextAttemptAt = new Date(now.getTime() + delaySeconds * 1000);
  } else if (result.state === 'retryable') {
    state = 'failed';
    lastError = 'retry_limit_reached';
  } else if (result.state === 'accepted') {
    acceptedAt = now;
    providerMessageId = result.providerMessageId;
  }

  const update = await model.updateOne(
    { _id: notification._id, state: 'sending', claimId },
    {
      $set: { state, nextAttemptAt, lastAttemptAt: notification.lastAttemptAt, acceptedAt, lastError, providerMessageId },
      $unset: { claimId: 1 },
    }
  );
  if (update.matchedCount !== 1) {
    logNotification('warn', 'attempt result not saved', notification, { attempt: attempts });
    throw new Error('Notification claim was lost before its result was saved.');
  }
  return { state, nextAttemptAt, lastError };
}

export async function processOneOrderNotification({
  notificationModel = OrderNotification,
  orderModel = Order,
  sendStatus = sendWhatsAppOrderStatus,
  providerEnabled = env.whatsappEnabled,
} = {}) {
  const now = new Date();
  const claimId = randomUUID();
  const notification = await notificationModel.findOneAndUpdate(
    {
      state: 'queued',
      $or: [{ nextAttemptAt: null }, { nextAttemptAt: { $lte: now } }],
    },
    {
      $set: { state: 'sending', claimId, lastAttemptAt: now, nextAttemptAt: null },
      $inc: { attempts: 1 },
    },
    { new: true, sort: { createdAt: 1 } }
  );
  if (!notification) return false;
  logNotification('info', 'attempt started', notification, { attempt: notification.attempts });

  const recordResult = async (result) => {
    const outcome = await updateClaimedNotification(notificationModel, notification, claimId, result);
    logNotification(
      ['failed', 'unknown'].includes(outcome.state) ? 'warn' : 'info',
      'attempt finished',
      notification,
      {
        attempt: notification.attempts,
        state: outcome.state,
        code: outcome.lastError || undefined,
        nextAttemptAt: outcome.nextAttemptAt || undefined,
      }
    );
    return true;
  };

  try {
    const order = await orderModel.findById(notification.order).select('orderNumber contact.phone whatsappOptIn');
    if (!order) {
      return await recordResult({ state: 'failed', code: 'order_not_found' });
    }
    if (order.whatsappOptIn !== true) {
      return await recordResult({ state: 'not_requested', code: '' });
    }
    if (!providerEnabled) {
      return await recordResult({ state: 'manual', code: 'provider_not_configured' });
    }

    const result = await sendStatus({
      phone: order.contact.phone,
      orderNumber: order.orderNumber,
      status: notification.status,
    });
    return await recordResult(result);
  } catch (error) {
    logNotification('error', 'processing failed', notification, {
      attempt: notification.attempts,
      error: error?.name || 'UnknownError',
    });
    throw error;
  }
}

export async function recoverStaleOrderNotifications(model = OrderNotification) {
  const cutoff = new Date(Date.now() - CLAIM_TIMEOUT_MS);
  const result = await model.updateMany(
    { state: 'sending', lastAttemptAt: { $lt: cutoff } },
    {
      $set: { state: 'unknown', lastError: 'provider_outcome_unknown' },
      $unset: { claimId: 1 },
    }
  );
  if (result.modifiedCount > 0) {
    console.warn('[whatsapp] stale attempts marked unknown', JSON.stringify({ count: result.modifiedCount }));
  }
  return result.modifiedCount;
}

export async function retryOrderNotification(orderId, notificationId) {
  const order = await Order.findById(orderId).select('whatsappOptIn');
  if (!order) throw new ApiError(404, 'Order not found');
  const existing = await OrderNotification.findOne({ _id: notificationId, order: orderId }).select('state attempts');
  if (!canRetryOrderNotification(existing, order.whatsappOptIn, env.whatsappEnabled)) {
    throw new ApiError(409, 'This notification is not eligible for retry');
  }

  const notification = await OrderNotification.findOneAndUpdate(
    {
      _id: notificationId,
      order: orderId,
      state: 'failed',
      attempts: existing.attempts,
    },
    { $set: { state: 'queued', nextAttemptAt: new Date(), lastError: '' } },
    { new: true }
  );
  if (!notification) throw new ApiError(409, 'This notification is not eligible for retry');
  logNotification('info', 'manual retry queued', notification, { attempt: notification.attempts });
  return notification;
}

let workerTimer;
let workerBusy = false;

export function startOrderNotificationWorker() {
  if (workerTimer) return;
  workerTimer = setInterval(async () => {
    if (workerBusy) return;
    workerBusy = true;
    try {
      await recoverStaleOrderNotifications();
      for (let i = 0; i < 3; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        if (!(await processOneOrderNotification())) break;
      }
    } catch (error) {
      console.error('[whatsapp] notification worker failed:', error?.name || 'UnknownError');
    } finally {
      workerBusy = false;
    }
  }, 5000);
  workerTimer.unref();
}
