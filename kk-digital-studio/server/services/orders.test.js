import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reserveStock, restoreStock } from './orders.js';

test('stock reservation uses the supplied transaction session', async () => {
  const session = {};
  let call;
  await reserveStock([{ product: 'product-1', variantId: 'variant-1', quantity: 2 }], {
    session,
    productModel: {
      async updateOne(...args) {
        call = args;
        return { modifiedCount: 1 };
      },
    },
  });

  assert.equal(call[2].session, session);
  assert.equal(call[1].$inc['variants.$.stock'], -2);
});

test('a failed transactional reservation aborts instead of compensating outside the transaction', async () => {
  let calls = 0;
  await assert.rejects(reserveStock([
    { product: 'product-1', variantId: 'variant-1', quantity: 2 },
  ], {
    session: {},
    productModel: {
      async updateOne() {
        calls += 1;
        return { modifiedCount: 0 };
      },
    },
  }), (error) => error.status === 409);

  assert.equal(calls, 1);
});

test('stock restoration uses the cancellation transaction for each inventory update', async () => {
  const session = {};
  const calls = [];
  const order = {
    stockRestored: false,
    items: [
      { product: 'product-1', variantId: 'variant-1', quantity: 2 },
      { product: 'product-2', variantId: 'variant-2', quantity: 1 },
    ],
  };
  const productModel = {
    async updateOne(filter, update, options) {
      calls.push({ filter, update, options });
      return { modifiedCount: 1 };
    },
  };

  await restoreStock(order, { session, productModel });

  assert.equal(order.stockRestored, true);
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => call.options.session === session));
  assert.deepEqual(calls.map((call) => call.update.$inc['variants.$.stock']), [2, 1]);
});

test('failed stock restoration does not mark the order as restored', async () => {
  const order = {
    stockRestored: false,
    items: [{ product: 'product-1', variantId: 'variant-1', quantity: 1 }],
  };

  await assert.rejects(restoreStock(order, {
    session: {},
    productModel: { updateOne: async () => { throw new Error('database write failed'); } },
  }), /database write failed/);
  assert.equal(order.stockRestored, false);
});

test('missing product variants abort stock restoration instead of reporting success', async () => {
  const order = {
    stockRestored: false,
    items: [{ product: 'deleted-product', variantId: 'deleted-variant', quantity: 1 }],
  };

  await assert.rejects(restoreStock(order, {
    session: {},
    productModel: { updateOne: async () => ({ matchedCount: 0, modifiedCount: 0 }) },
  }), (error) => error.status === 409);
  assert.equal(order.stockRestored, false);
});
