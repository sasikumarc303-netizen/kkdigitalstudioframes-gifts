import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { test } from 'node:test';
import {
  amountInMinorUnits,
  isPaymentAmountValid,
  paymentInfo,
  razorpayReady,
  requestRazorpay,
  verifyCheckoutSignature,
  verifyWebhookSignature,
} from './payments.js';
import { env } from '../config/env.js';
import Order from '../models/Order.js';

test('test credentials cannot enable online checkout in production', () => {
  const previous = {
    isProd: env.isProd,
    paymentProvider: env.paymentProvider,
    razorpay: { ...env.razorpay },
  };
  Object.assign(env, {
    isProd: true,
    paymentProvider: 'razorpay',
    razorpay: {
      ...env.razorpay,
      keyId: 'rzp_test_example',
      keySecret: 'test-secret',
      webhookSecret: 'test-webhook-secret',
      enabled: true,
      testMode: true,
      allowTestMode: false,
    },
  });

  try {
    assert.equal(razorpayReady(), false);
    assert.equal(paymentInfo().onlineEnabled, false);
    assert.equal(paymentInfo().onlineOnly, true);
    env.razorpay.allowTestMode = true;
    assert.equal(razorpayReady(), true);
    assert.equal(paymentInfo().onlineEnabled, true);
  } finally {
    Object.assign(env, previous);
  }
});

test('live Razorpay credentials enable live-only production checkout', () => {
  const previous = {
    isProd: env.isProd,
    paymentProvider: env.paymentProvider,
    razorpay: { ...env.razorpay },
  };
  Object.assign(env, {
    isProd: true,
    paymentProvider: 'razorpay',
    razorpay: {
      ...env.razorpay,
      keyId: 'rzp_live_example',
      keySecret: 'live-secret-placeholder',
      webhookSecret: 'live-webhook-placeholder',
      enabled: true,
      testMode: false,
      allowTestMode: false,
    },
  });

  try {
    assert.equal(razorpayReady(), true);
    assert.deepEqual(paymentInfo(), {
      provider: 'razorpay',
      onlineEnabled: true,
      onlineOnly: true,
      mode: 'live',
    });
    env.razorpay.keyId = 'rzp_test_example';
    assert.equal(razorpayReady(), false);
    assert.equal(paymentInfo().onlineEnabled, false);
  } finally {
    Object.assign(env, previous);
  }
});

test('checkout signatures match the exact Razorpay order and payment identifiers', () => {
  const secret = 'test-secret';
  const orderId = 'order_test_123';
  const paymentId = 'pay_test_456';
  const signature = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

  assert.equal(verifyCheckoutSignature({ orderId, paymentId, signature, secret }), true);
  assert.equal(verifyCheckoutSignature({ orderId: 'order_other', paymentId, signature, secret }), false);
  assert.equal(verifyCheckoutSignature({ orderId, paymentId, signature: 'not-a-signature', secret }), false);
});

test('webhook signatures use the exact raw request bytes', () => {
  const secret = 'test-webhook-secret';
  const rawBody = Buffer.from('{"event":"payment.captured"}');
  const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

  assert.equal(verifyWebhookSignature(rawBody, signature, secret), true);
  assert.equal(verifyWebhookSignature(Buffer.from('{"event":"payment.failed"}'), signature, secret), false);
  assert.equal(verifyWebhookSignature('{"event":"payment.captured"}', signature, secret), false);
});

test('Razorpay amount conversion uses INR minor units and rejects unsafe amounts', () => {
  assert.equal(amountInMinorUnits(1250), 125000);
  assert.equal(amountInMinorUnits(12.34), 1234);
  assert.throws(() => amountInMinorUnits(0), { status: 422 });
  assert.throws(() => amountInMinorUnits(Number.MAX_SAFE_INTEGER), { status: 422 });
});

test('captured payment must match the order amount, currency and Razorpay order ID', () => {
  const order = { total: 1250, currency: 'INR', razorpayOrderId: 'order_test_123' };
  const payment = { amount: 125000, currency: 'INR', order_id: 'order_test_123' };

  assert.equal(isPaymentAmountValid(payment, order), true);
  assert.equal(isPaymentAmountValid({ ...payment, amount: 124999 }, order), false);
  assert.equal(isPaymentAmountValid({ ...payment, currency: 'USD' }, order), false);
  assert.equal(isPaymentAmountValid({ ...payment, order_id: 'order_other' }, order), false);
});

test('Razorpay request failures are surfaced without forwarding provider error details', async () => {
  const providerError = Object.assign(new Error('secret must never be logged'), {
    statusCode: 401,
    error: { code: 'BAD_AUTHENTICATION' },
  });

  const originalError = console.error;
  const log = [];
  console.error = (...args) => log.push(args);

  try {
    await assert.rejects(requestRazorpay(() => Promise.reject(providerError)), (error) => {
      assert.equal(error.status, 502);
      assert.doesNotMatch(error.message, /secret|BAD_AUTHENTICATION/);
      return true;
    });
  } finally {
    console.error = originalError;
  }

  assert.deepEqual(log, [['[payments] Razorpay request failed', { status: 401 }]]);
});

test('Razorpay order IDs have a sparse unique index without changing legacy orders', () => {
  for (const field of ['razorpayOrderId', 'razorpayPaymentId']) {
    const index = Order.schema.indexes().find(([keys]) => keys[field] === 1);
    assert.ok(index);
    assert.equal(index[1].unique, true);
    assert.equal(index[1].sparse, true);
  }
});
