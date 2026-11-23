import { ApiError, phoneKey } from '../utils/helpers.js';
import { validate } from '../middleware/validate.js';

export const MAX_NOTIFICATION_ATTEMPTS = 5;

export function publicOrderStatus(status) {
  return status === 'Pending' ? 'Placed' : status;
}

export function canTransitionOrderStatus(from, to, fulfilment = 'delivery') {
  if (!from || !to || from === to) return false;
  const transitions = {
    Pending: ['Confirmed', 'Cancelled'],
    Confirmed: ['Processing', 'Cancelled'],
    Processing: ['Production', 'Ready', 'Cancelled'],
    Production: ['Ready', 'Cancelled'],
    Ready: fulfilment === 'pickup'
      ? ['Delivered', 'Cancelled']
      : ['Shipped', 'Delivered', 'Cancelled'],
    Shipped: ['Delivered'],
    Delivered: [],
    Cancelled: [],
  };
  return transitions[from]?.includes(to) || false;
}

export function toPublicTrackingOrder(order) {
  const history = order.history?.length
    ? order.history
    : [{ status: order.status, at: order.updatedAt || order.createdAt, by: 'studio' }];

  return {
    orderNumber: order.orderNumber,
    status: publicOrderStatus(order.status),
    fulfilment: order.fulfilment,
    createdAt: order.createdAt,
    history: history.map((entry) => ({
      status: publicOrderStatus(entry.status),
      at: entry.at,
      by: entry.by === 'customer' ? 'You' : 'KK Digital Studio',
      note: entry.customerNote || '',
    })),
  };
}

export async function lookupOrderTracking(body, findOrder) {
  const input = validate(
    {
      orderNumber: { type: 'string', required: true, min: 1, max: 40 },
      phone: { type: 'phone', required: true },
    },
    body && typeof body === 'object' && !Array.isArray(body) ? body : {}
  );
  const orderNumber = input.orderNumber.toUpperCase();
  const key = phoneKey(input.phone);
  const order = await findOrder({ orderNumber, 'contact.phoneKey': key });
  if (!order) throw new ApiError(404, 'Order details did not match.');
  return toPublicTrackingOrder(order);
}

export function notificationIntent({ optedIn, providerEnabled }) {
  if (!optedIn) return { state: 'not_requested', attempts: 0, lastError: '' };
  if (!providerEnabled) return { state: 'manual', attempts: 0, lastError: '' };
  return { state: 'queued', attempts: 0, lastError: '' };
}

export const orderNotificationKey = (orderId, status) => `${orderId}:${status}`;

export const canRetryOrderNotification = (notification, optedIn, providerEnabled) =>
  optedIn === true &&
  providerEnabled === true &&
  notification?.state === 'failed' &&
  notification.attempts < MAX_NOTIFICATION_ATTEMPTS;
