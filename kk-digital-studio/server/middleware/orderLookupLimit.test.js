import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createOrderLookupLimit } from './orderLookupLimit.js';

function requestLimiter(limiter, { ip = '127.0.0.1', items = [] } = {}) {
  let nextCalls = 0;
  let statusCode = 200;
  let body;
  const headers = {};
  limiter(
    { ip, body: { items } },
    {
      set(name, value) { headers[name] = value; return this; },
      status(code) { statusCode = code; return this; },
      json(value) { body = value; return this; },
    },
    () => { nextCalls += 1; }
  );
  return { nextCalls, statusCode, body, headers };
}

test('order lookup rate limit counts batch entries, not just HTTP requests', () => {
  const limit = createOrderLookupLimit({ maxLookups: 40 });
  assert.equal(requestLimiter(limit, { items: Array(20).fill({}) }).nextCalls, 1);
  assert.equal(requestLimiter(limit, { items: Array(20).fill({}) }).nextCalls, 1);

  const blocked = requestLimiter(limit, { items: [{}] });
  assert.equal(blocked.statusCode, 429);
  assert.equal(blocked.nextCalls, 0);
  assert.ok(Number(blocked.headers['Retry-After']) > 0);
});

test('order lookup rate limit expires buckets and separates client IPs', () => {
  let time = 0;
  const limit = createOrderLookupLimit({ windowMs: 1000, maxLookups: 1, now: () => time });
  assert.equal(requestLimiter(limit, { items: [{}] }).nextCalls, 1);
  assert.equal(requestLimiter(limit, { items: [{}] }).statusCode, 429);
  assert.equal(requestLimiter(limit, { ip: '127.0.0.2', items: [{}] }).nextCalls, 1);

  time = 1001;
  assert.equal(requestLimiter(limit, { items: [{}] }).nextCalls, 1);
});
