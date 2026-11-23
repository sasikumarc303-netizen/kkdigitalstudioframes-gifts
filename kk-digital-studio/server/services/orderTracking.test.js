import assert from 'node:assert/strict';
import { test } from 'node:test';
import OrderNotification from '../models/OrderNotification.js';
import { ApiError } from '../utils/helpers.js';
import {
  canRetryOrderNotification,
  canTransitionOrderStatus,
  lookupOrderTracking,
  notificationIntent,
  orderNotificationKey,
  publicOrderStatus,
  toPublicTrackingOrder,
} from './orderTracking.js';
import { ensureOrderNotification } from './orderNotifications.js';
import Order from '../models/Order.js';

test('maps legacy statuses and enforces forward order transitions', () => {
  assert.equal(publicOrderStatus('Pending'), 'Placed');
  assert.equal(publicOrderStatus('Processing'), 'Processing');
  assert.equal(canTransitionOrderStatus('Pending', 'Confirmed'), true);
  assert.equal(canTransitionOrderStatus('Processing', 'Ready'), true);
  assert.equal(canTransitionOrderStatus('Ready', 'Shipped', 'delivery'), true);
  assert.equal(canTransitionOrderStatus('Ready', 'Shipped', 'pickup'), false);
  assert.equal(canTransitionOrderStatus('Shipped', 'Cancelled'), false);
  assert.equal(canTransitionOrderStatus('Delivered', 'Processing'), false);
  assert.equal(canTransitionOrderStatus('Pending', 'Pending'), false);
});

test('tracking lookup validates input and returns only customer-safe history', async () => {
  let query;
  const result = await lookupOrderTracking(
    { orderNumber: ' kk-ord-260101-ab12 ', phone: '+91 98765 43210' },
    async (filter) => {
      query = filter;
      return {
        orderNumber: 'KK-ORD-260101-AB12',
        status: 'Pending',
        fulfilment: 'delivery',
        createdAt: new Date('2026-01-01T10:00:00Z'),
        contact: { name: 'Private Customer', phone: '+91 98765 43210' },
        shippingAddress: { line1: 'Private address' },
        paymentStatus: 'Unpaid',
        items: [{ name: 'Private item' }],
        history: [
          { status: 'Pending', at: new Date('2026-01-01T10:00:00Z'), by: 'customer', note: 'Internal note' },
          { status: 'Confirmed', at: new Date('2026-01-02T10:00:00Z'), by: 'Staff Name', note: 'Internal note', customerNote: 'We confirmed your order.' },
        ],
      };
    }
  );

  assert.deepEqual(query, {
    orderNumber: 'KK-ORD-260101-AB12',
    'contact.phoneKey': '9876543210',
  });
  assert.equal(result.status, 'Placed');
  assert.equal(result.history[0].by, 'You');
  assert.equal(result.history[0].note, '');
  assert.equal(result.history[1].by, 'KK Digital Studio');
  assert.equal(result.history[1].note, 'We confirmed your order.');
  assert.deepEqual(Object.keys(result).sort(), ['createdAt', 'fulfilment', 'history', 'orderNumber', 'status']);
  assert.equal(JSON.stringify(result).includes('Private Customer'), false);
  assert.equal(JSON.stringify(result).includes('Private address'), false);
  assert.equal(JSON.stringify(result).includes('Private item'), false);
  assert.equal(JSON.stringify(result).includes('Unpaid'), false);
});

test('tracking uses one generic response for unmatched details and validates malformed input before lookup', async () => {
  let calls = 0;
  const findOrder = async () => {
    calls += 1;
    return null;
  };
  await assert.rejects(
    lookupOrderTracking({ orderNumber: 'KK-ORD-260101-AB12', phone: '9876543210' }, findOrder),
    (error) => error instanceof ApiError && error.status === 404 && error.message === 'Order details did not match.'
  );
  await assert.rejects(
    lookupOrderTracking({ orderNumber: 'KK-ORD-260101-AB12', phone: 'not-a-phone' }, findOrder),
    (error) => error instanceof ApiError && error.status === 422
  );
  assert.equal(calls, 1);
});

test('historical orders without history still receive a safe timeline', () => {
  const result = toPublicTrackingOrder({
    orderNumber: 'KK-ORD-OLD',
    status: 'Pending',
    fulfilment: 'pickup',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-02T00:00:00Z'),
  });
  assert.deepEqual(result.history, [{
    status: 'Placed',
    at: new Date('2024-01-02T00:00:00Z'),
    by: 'KK Digital Studio',
    note: '',
  }]);
});

test('WhatsApp consent controls queue state and retry eligibility', () => {
  assert.equal(notificationIntent({ optedIn: false, providerEnabled: true }).state, 'not_requested');
  assert.equal(notificationIntent({ optedIn: true, providerEnabled: false }).state, 'manual');
  assert.equal(notificationIntent({ optedIn: true, providerEnabled: true }).state, 'queued');
  assert.equal(canRetryOrderNotification({ state: 'failed', attempts: 2 }, true, true), true);
  assert.equal(canRetryOrderNotification({ state: 'accepted', attempts: 1 }, true, true), false);
  assert.equal(canRetryOrderNotification({ state: 'failed', attempts: 5 }, true, true), false);
  assert.equal(canRetryOrderNotification({ state: 'failed', attempts: 2 }, false, true), false);
});

test('notification keys and the database unique index prevent duplicate status jobs', async () => {
  assert.equal(orderNotificationKey('order-1', 'Confirmed'), orderNotificationKey('order-1', 'Confirmed'));
  assert.equal(orderNotificationKey('order-1', 'Confirmed') === orderNotificationKey('order-1', 'Shipped'), false);
  assert.equal(
    OrderNotification.schema.indexes().some(([keys, options]) => keys.idempotencyKey === 1 && options.unique === true),
    true
  );

  const records = new Map();
  const fakeModel = {
    async findOneAndUpdate(filter, update) {
      if (!records.has(filter.idempotencyKey)) {
        records.set(filter.idempotencyKey, { ...update.$setOnInsert, idempotencyKey: filter.idempotencyKey });
      }
      return records.get(filter.idempotencyKey);
    },
    async findOne(filter) {
      return records.get(filter.idempotencyKey);
    },
  };
  const order = { _id: 'order-1', whatsappOptIn: true };
  await Promise.all([
    ensureOrderNotification(order, 'Confirmed', { model: fakeModel, providerEnabled: true }),
    ensureOrderNotification(order, 'Confirmed', { model: fakeModel, providerEnabled: true }),
  ]);
  assert.equal(records.size, 1);
  assert.equal([...records.values()][0].state, 'queued');
});

test('checkout idempotency hash has a hidden sparse unique index for historical orders', () => {
  assert.equal(Order.schema.path('checkoutRequestHash').options.select, false);
  assert.equal(
    Order.schema.indexes().some(([keys, options]) => keys.checkoutRequestHash === 1 && options.unique && options.sparse),
    true
  );
});
