import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import express from 'express';
import { csrfGuard, requireAuth, requirePermission } from './auth.js';
import { errorHandler } from './errors.js';

const app = express();
app.use((req, _res, next) => {
  const role = req.get('x-test-role');
  req.user = { role, permissions: role === 'staff' ? ['orders'] : [] };
  next();
});
app.get('/admin/orders/session', requireAuth, (_req, res) => res.sendStatus(204));
app.post('/admin/orders/status', csrfGuard, requirePermission('orders'), (_req, res) => res.sendStatus(204));
app.use(errorHandler);

const server = app.listen(0, '127.0.0.1');
const baseUrl = await new Promise((resolve) => {
  server.once('listening', () => resolve(`http://127.0.0.1:${server.address().port}`));
});

after(() => new Promise((resolve, reject) => {
  server.close((error) => error ? reject(error) : resolve());
}));

test('order changes require both the existing CSRF header and orders permission', async () => {
  const unauthenticated = await fetch(`${baseUrl}/admin/orders/session`);
  assert.equal(unauthenticated.status, 401);

  const noCsrf = await fetch(`${baseUrl}/admin/orders/status`, {
    method: 'POST',
    headers: { 'X-Test-Role': 'staff' },
  });
  assert.equal(noCsrf.status, 403);

  const noPermission = await fetch(`${baseUrl}/admin/orders/status`, {
    method: 'POST',
    headers: { 'X-Test-Role': 'editor', 'X-Requested-With': 'kk-admin' },
  });
  assert.equal(noPermission.status, 403);

  const allowedStaff = await fetch(`${baseUrl}/admin/orders/status`, {
    method: 'POST',
    headers: { 'X-Test-Role': 'staff', 'X-Requested-With': 'kk-admin' },
  });
  assert.equal(allowedStaff.status, 204);
});
