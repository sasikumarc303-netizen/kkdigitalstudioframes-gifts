import assert from 'node:assert/strict';
import { test } from 'node:test';
import mongoose from 'mongoose';
import ActivityLog from '../models/ActivityLog.js';
import Order from '../models/Order.js';
import OrderNotification from '../models/OrderNotification.js';
import { setStatus, update } from './orders.js';

async function runStatusUpdate({ failOutbox = false, paymentMethod = 'enquiry', paymentStatus = 'Unpaid', nextStatus = 'Confirmed' } = {}) {
  let order;
  let committed = false;
  const session = {
    async withTransaction(operation) {
      try {
        await operation();
        committed = true;
      } catch (error) {
        order.status = 'Pending';
        order.history = [];
        throw error;
      }
    },
    async endSession() {},
  };
  order = {
    _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    orderNumber: 'KK-ORD-TEST',
    status: 'Pending',
    paymentMethod,
    paymentStatus,
    fulfilment: 'delivery',
    history: [],
    async save(options) {
      assert.equal(options.session, session);
      this.saved = true;
    },
  };
  const transactionError = new Error('outbox write failed');
  let outboxSession;
  let activityCount = 0;
  let nextError;
  let response;

  const originalStartSession = mongoose.startSession;
  const originalFindById = Order.findById;
  const originalFindOneAndUpdate = OrderNotification.findOneAndUpdate;
  const originalActivityCreate = ActivityLog.create;
  mongoose.startSession = async () => session;
  Order.findById = () => ({
    populate() { return this; },
    session(receivedSession) {
      assert.equal(receivedSession, session);
      return Promise.resolve(order);
    },
  });
  OrderNotification.findOneAndUpdate = async (_filter, _update, options) => {
    outboxSession = options.session;
    if (failOutbox) throw transactionError;
    return { _id: 'bbbbbbbbbbbbbbbbbbbbbbbb' };
  };
  ActivityLog.create = async () => {
    activityCount += 1;
    return {};
  };

  try {
    await setStatus(
      { params: { id: order._id }, body: { status: nextStatus }, user: { name: 'Admin' } },
      {
        json(value) {
          assert.equal(committed, true);
          response = value;
        },
      },
      (error) => { nextError = error; }
    );
  } finally {
    mongoose.startSession = originalStartSession;
    Order.findById = originalFindById;
    OrderNotification.findOneAndUpdate = originalFindOneAndUpdate;
    ActivityLog.create = originalActivityCreate;
  }

  return { order, outboxSession, activityCount, nextError, response, session, transactionError };
}

test('admin status and outbox event commit using the same transaction session', async () => {
  const result = await runStatusUpdate();

  assert.equal(result.order.saved, true);
  assert.equal(result.order.status, 'Confirmed');
  assert.equal(result.outboxSession, result.session);
  assert.equal(result.response, result.order);
  assert.equal(result.activityCount, 1);
  assert.equal(result.nextError, undefined);
});

test('outbox failure aborts an admin status update without an outside retry', async () => {
  const result = await runStatusUpdate({ failOutbox: true });

  assert.equal(result.order.status, 'Pending');
  assert.deepEqual(result.order.history, []);
  assert.equal(result.activityCount, 0);
  assert.equal(result.response, undefined);
  assert.equal(result.nextError, result.transactionError);
});

test('an online order cannot be cancelled while its payment is still paid', async () => {
  const result = await runStatusUpdate({ paymentMethod: 'online', paymentStatus: 'Paid', nextStatus: 'Cancelled' });

  assert.equal(result.order.status, 'Pending');
  assert.equal(result.order.saved, undefined);
  assert.equal(result.response, undefined);
  assert.equal(result.nextError.status, 409);
  assert.match(result.nextError.message, /Refund this online payment first/);
});

test('admin updates cannot mark an online order paid without Razorpay verification', async () => {
  const order = {
    _id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    orderNumber: 'KK-ORD-TEST',
    paymentMethod: 'online',
    paymentStatus: 'Pending',
    status: 'Pending',
    history: [],
    async save() { this.saved = true; },
  };
  const originalFindById = Order.findById;
  let nextError;
  let response;
  Order.findById = () => ({ populate: () => Promise.resolve(order) });

  try {
    await update(
      { params: { id: order._id }, body: { paymentStatus: 'Paid' }, user: { name: 'Admin' } },
      { json(value) { response = value; } },
      (error) => { nextError = error; }
    );
  } finally {
    Order.findById = originalFindById;
  }

  assert.equal(order.saved, undefined);
  assert.equal(response, undefined);
  assert.equal(nextError.status, 409);
  assert.match(nextError.message, /verified payment events/);
});
