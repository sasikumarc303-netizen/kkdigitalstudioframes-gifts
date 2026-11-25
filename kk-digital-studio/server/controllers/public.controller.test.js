import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import Order from '../models/Order.js';
import { env } from '../config/env.js';
import { createOrder } from './public.js';

const requestKey = '21a9ef47-f0a1-4d3e-80f0-e1cc633c11a9';

test('replayed checkout key returns its existing order without creating a second order', async () => {
  const existingOrder = {
    orderNumber: 'KK-ORD-261123-12345678',
    status: 'Confirmed',
    total: 1200,
    subtotal: 1000,
    shipping: 200,
    paymentMethod: 'enquiry',
    items: [{ name: 'Frame', quantity: 1 }],
    createdAt: new Date('2026-11-23T00:00:00Z'),
  };
  const originalFindOne = Order.findOne;
  let filter;
  let response;
  let statusCode;
  let nextError;
  Order.findOne = (query) => {
    filter = query;
    return Promise.resolve(existingOrder);
  };

  try {
    await createOrder(
      { body: { checkoutRequestKey: requestKey } },
      {
        status(code) { statusCode = code; return this; },
        json(value) { response = value; return this; },
      },
      (error) => { nextError = error; }
    );
  } finally {
    Order.findOne = originalFindOne;
  }

  assert.equal(nextError, undefined);
  assert.deepEqual(filter, {
    checkoutRequestHash: createHash('sha256').update(requestKey).digest('hex'),
  });
  assert.equal(statusCode, 201);
  assert.equal(response.orderNumber, existingOrder.orderNumber);
  assert.equal(response.status, existingOrder.status);
  assert.equal(JSON.stringify(response).includes(requestKey), false);
});

test('checkout rejects a malformed idempotency key before querying orders', async () => {
  const originalFindOne = Order.findOne;
  let lookups = 0;
  let nextError;
  Order.findOne = async () => {
    lookups += 1;
    return null;
  };

  try {
    await createOrder(
      { body: { checkoutRequestKey: 'not-a-uuid' } },
      { status() { return this; }, json() {} },
      (error) => { nextError = error; }
    );
  } finally {
    Order.findOne = originalFindOne;
  }

  assert.equal(lookups, 0);
  assert.equal(nextError.status, 422);
});

test('production Razorpay checkout rejects COD and enquiry orders', async () => {
  const originalFindOne = Order.findOne;
  const previous = {
    isProd: env.isProd,
    paymentProvider: env.paymentProvider,
  };
  env.isProd = true;
  env.paymentProvider = 'razorpay';
  Order.findOne = async () => null;

  try {
    for (const paymentMethod of ['cod', 'enquiry']) {
      let nextError;
      await createOrder(
        { body: { checkoutRequestKey: requestKey, paymentMethod } },
        { status() { return this; }, json() {} },
        (error) => { nextError = error; }
      );
      assert.equal(nextError.status, 422);
      assert.match(nextError.message, /Online payment is required/);
    }
  } finally {
    Order.findOne = originalFindOne;
    Object.assign(env, previous);
  }
});
