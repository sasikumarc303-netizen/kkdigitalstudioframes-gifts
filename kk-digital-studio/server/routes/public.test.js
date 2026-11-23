import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import express from 'express';
import publicRoutes from './public.js';
import { errorHandler } from '../middleware/errors.js';

const app = express();
app.use(express.json());
app.use('/api', publicRoutes);
app.use(errorHandler);

const server = app.listen(0, '127.0.0.1');
const baseUrl = await new Promise((resolve) => {
  server.once('listening', () => resolve(`http://127.0.0.1:${server.address().port}`));
});

after(() => new Promise((resolve, reject) => {
  server.close((error) => error ? reject(error) : resolve());
}));

test('public tracking validates phone input and applies its stricter rate limit', async () => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const response = await fetch(`${baseUrl}/api/orders/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderNumber: 'KK-ORD-260101-AB12', phone: 'not-a-phone' }),
    });
    assert.equal(response.status, 422);
  }

  const limited = await fetch(`${baseUrl}/api/orders/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderNumber: 'KK-ORD-260101-AB12', phone: 'not-a-phone' }),
  });
  assert.equal(limited.status, 429);
});
