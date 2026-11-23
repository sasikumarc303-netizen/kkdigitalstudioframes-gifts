import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ensureOrderNotification,
  notificationRetryDelaySeconds,
  processOneOrderNotification,
  recoverStaleOrderNotifications,
} from './orderNotifications.js';

function makeNotificationModel({ state = 'queued', attempts = 0 } = {}) {
  const notification = {
    _id: 'notification-1',
    order: 'order-1',
    status: 'Confirmed',
    state,
    attempts,
    nextAttemptAt: null,
    lastAttemptAt: null,
    acceptedAt: null,
    providerMessageId: '',
    lastError: '',
    claimId: '',
  };
  return {
    notification,
    async findOneAndUpdate(_filter, update) {
      if (notification.state !== 'queued') return null;
      if (notification.nextAttemptAt && notification.nextAttemptAt > new Date()) return null;
      Object.assign(notification, update.$set);
      notification.attempts += update.$inc.attempts;
      return { ...notification };
    },
    async updateOne(filter, update) {
      if (notification.state !== filter.state || notification.claimId !== filter.claimId) {
        return { matchedCount: 0 };
      }
      Object.assign(notification, update.$set);
      Object.keys(update.$unset || {}).forEach((key) => { delete notification[key]; });
      return { matchedCount: 1 };
    },
  };
}

const orderModel = {
  findById: () => ({
    select: async () => ({
      orderNumber: 'KK-ORD-TEST',
      contact: { phone: '9876543210' },
      whatsappOptIn: true,
    }),
  }),
};

test('retry delay uses bounded exponential backoff and honors capped provider delays', () => {
  assert.equal(notificationRetryDelaySeconds(1), 60);
  assert.equal(notificationRetryDelaySeconds(2), 120);
  assert.equal(notificationRetryDelaySeconds(5), 960);
  assert.equal(notificationRetryDelaySeconds(3, 25), 25);
  assert.equal(notificationRetryDelaySeconds(3, 7200), 3600);
});

test('outbox upsert uses the order transaction session', async () => {
  const session = {};
  let options;
  const model = {
    async findOneAndUpdate(_filter, _update, receivedOptions) {
      options = receivedOptions;
      return { _id: 'notification-1' };
    },
  };

  await ensureOrderNotification(
    { _id: 'order-1', whatsappOptIn: true },
    'Confirmed',
    { model, providerEnabled: true, session }
  );

  assert.equal(options.session, session);
});

test('a duplicate outbox key aborts an active transaction without an outside lookup', async () => {
  const duplicateKey = Object.assign(new Error('duplicate key'), { code: 11000 });
  let lookupCount = 0;
  const model = {
    async findOneAndUpdate() { throw duplicateKey; },
    async findOne() { lookupCount += 1; },
  };

  await assert.rejects(ensureOrderNotification(
    { _id: 'order-1', whatsappOptIn: true },
    'Confirmed',
    { model, providerEnabled: true, session: {} }
  ), (error) => error === duplicateKey);
  assert.equal(lookupCount, 0);
});

test('atomic outbox claim permits only one concurrent sender and logs no customer phone', async () => {
  const model = makeNotificationModel();
  const log = [];
  const originalInfo = console.info;
  console.info = (...args) => log.push(args.join(' '));
  let sends = 0;
  try {
    const process = () => processOneOrderNotification({
      notificationModel: model,
      orderModel,
      providerEnabled: true,
      sendStatus: async () => {
        sends += 1;
        await new Promise((resolve) => setTimeout(resolve, 5));
        return { state: 'accepted', providerMessageId: 'wamid.test' };
      },
    });
    const results = await Promise.all([process(), process()]);
    assert.equal(results.filter(Boolean).length, 1);
  } finally {
    console.info = originalInfo;
  }

  assert.equal(sends, 1);
  assert.equal(model.notification.state, 'accepted');
  assert.equal(model.notification.attempts, 1);
  assert.match(log.join(' '), /attempt started/);
  assert.doesNotMatch(log.join(' '), /9876543210/);
});

test('known rate limits schedule a bounded retry and stop after the attempt limit', async () => {
  const firstModel = makeNotificationModel();
  const before = Date.now();
  await processOneOrderNotification({
    notificationModel: firstModel,
    orderModel,
    providerEnabled: true,
    sendStatus: async () => ({ state: 'retryable', code: 'provider_rate_limited' }),
  });
  assert.equal(firstModel.notification.state, 'queued');
  assert.equal(firstModel.notification.attempts, 1);
  assert.ok(firstModel.notification.nextAttemptAt.getTime() >= before + 59_000);

  const lastModel = makeNotificationModel({ attempts: 4 });
  await processOneOrderNotification({
    notificationModel: lastModel,
    orderModel,
    providerEnabled: true,
    sendStatus: async () => ({ state: 'retryable', code: 'provider_rate_limited' }),
  });
  assert.equal(lastModel.notification.attempts, 5);
  assert.equal(lastModel.notification.state, 'failed');
  assert.equal(lastModel.notification.lastError, 'retry_limit_reached');
  assert.equal(lastModel.notification.nextAttemptAt, null);
});

test('ambiguous provider outcomes are not automatically retried', async () => {
  const model = makeNotificationModel();
  let sends = 0;
  const options = {
    notificationModel: model,
    orderModel,
    providerEnabled: true,
    sendStatus: async () => {
      sends += 1;
      return { state: 'unknown', code: 'provider_timeout' };
    },
  };

  assert.equal(await processOneOrderNotification(options), true);
  assert.equal(await processOneOrderNotification(options), false);
  assert.equal(sends, 1);
  assert.equal(model.notification.state, 'unknown');
});

test('a stale in-flight attempt is marked unknown instead of being resent', async () => {
  let filter;
  let update;
  const logs = [];
  const originalWarn = console.warn;
  console.warn = (...args) => logs.push(args.join(' '));
  try {
    const recovered = await recoverStaleOrderNotifications({
      updateMany: async (query, changes) => {
        filter = query;
        update = changes;
        return { modifiedCount: 1 };
      },
    });
    assert.equal(recovered, 1);
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(filter.state, 'sending');
  assert.equal(update.$set.state, 'unknown');
  assert.match(logs.join(' '), /stale attempts marked unknown/);
});

test('does not log provider acceptance if the outbox claim was lost', async () => {
  const model = makeNotificationModel();
  model.updateOne = async () => ({ matchedCount: 0 });
  await assert.rejects(processOneOrderNotification({
    notificationModel: model,
    orderModel,
    providerEnabled: true,
    sendStatus: async () => ({ state: 'accepted', providerMessageId: 'wamid.test' }),
  }), /claim was lost/);
});
