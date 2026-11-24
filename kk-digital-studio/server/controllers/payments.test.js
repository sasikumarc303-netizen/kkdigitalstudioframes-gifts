import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import Order from '../models/Order.js';
import { verify } from './payments.js';

const checkoutRequestKey = '21a9ef47-f0a1-4d3e-80f0-e1cc633c11a9';

test('payment verification requires the checkout request key to own the order', async () => {
  const originalFindOne = Order.findOne;
  let filter;
  let response;
  let nextError;
  Order.findOne = async (query) => {
    filter = query;
    return null;
  };

  try {
    await verify(
      { body: { orderNumber: 'KK-ORD-TEST', checkoutRequestKey, razorpayPaymentId: 'pay_test_1', razorpaySignature: 'a'.repeat(64) } },
      { json(value) { response = value; } },
      (error) => { nextError = error; }
    );
  } finally {
    Order.findOne = originalFindOne;
  }

  assert.deepEqual(filter, {
    orderNumber: 'KK-ORD-TEST',
    checkoutRequestHash: createHash('sha256').update(checkoutRequestKey).digest('hex'),
  });
  assert.equal(response, undefined);
  assert.equal(nextError.status, 404);
});

test('invalid checkout signatures are rejected before contacting Razorpay', async () => {
  const originalFindOne = Order.findOne;
  const order = {
    _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    orderNumber: 'KK-ORD-TEST',
    paymentMethod: 'online',
    paymentStatus: 'Pending',
    currency: 'INR',
    razorpayOrderId: 'order_test_1',
    total: 100,
  };
  let response;
  let nextError;
  Order.findOne = async () => order;

  try {
    await verify(
      { body: { orderNumber: order.orderNumber, checkoutRequestKey, razorpayPaymentId: 'pay_test_1', razorpaySignature: 'a'.repeat(64) } },
      { json(value) { response = value; } },
      (error) => { nextError = error; }
    );
  } finally {
    Order.findOne = originalFindOne;
  }

  assert.equal(response, undefined);
  assert.equal(nextError.status, 400);
  assert.match(nextError.message, /signature is invalid/);
});
