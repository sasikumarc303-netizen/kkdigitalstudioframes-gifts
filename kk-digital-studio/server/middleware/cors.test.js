import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import express from 'express';
import { allowedClientOrigins, corsMiddleware } from './cors.js';
import { errorHandler } from './errors.js';
import { ApiError } from '../utils/helpers.js';

const app = express();
app.use(corsMiddleware);
app.use(express.json());
app.get('/api/site', (_req, res) => res.json({ ok: true }));
app.get('/api/failure', (_req, _res, next) => next(new ApiError(503, 'Unavailable')));
app.post('/api/parse', (_req, res) => res.json({ ok: true }));
app.use(errorHandler);

const server = app.listen(0);
const baseUrl = await new Promise((resolve) => {
  server.once('listening', () => resolve(`http://127.0.0.1:${server.address().port}`));
});

after(() => new Promise((resolve, reject) => {
  server.close((error) => error ? reject(error) : resolve());
}));

test('allows configured site and Pages origins, including credentialed preflight', async () => {
  for (const origin of [
    'https://kkdigitalstudioframes.com',
    'https://www.kkdigitalstudioframes.com',
    'https://kk-digital-studio.pages.dev',
    ...allowedClientOrigins.filter((value) => value.startsWith('http://localhost:')),
  ]) {
    const response = await fetch(`${baseUrl}/api/site`, { headers: { Origin: origin } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
    assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
  }

  const preflight = await fetch(`${baseUrl}/api/site`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://www.kkdigitalstudioframes.com',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'content-type',
    },
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://www.kkdigitalstudioframes.com');
  assert.equal(preflight.headers.get('access-control-allow-credentials'), 'true');
  assert.match(preflight.headers.get('access-control-allow-methods'), /\bGET\b/);
  assert.match(preflight.headers.get('access-control-allow-headers'), /\bcontent-type\b/i);
});

test('adds CORS headers to API errors for allowed origins and rejects unknown origins', async () => {
  const failure = await fetch(`${baseUrl}/api/failure`, {
    headers: { Origin: 'https://kkdigitalstudioframes.com' },
  });
  assert.equal(failure.status, 503);
  assert.equal(failure.headers.get('access-control-allow-origin'), 'https://kkdigitalstudioframes.com');
  assert.equal(failure.headers.get('access-control-allow-credentials'), 'true');

  const invalidJson = await fetch(`${baseUrl}/api/parse`, {
    method: 'POST',
    headers: {
      Origin: 'https://www.kkdigitalstudioframes.com',
      'Content-Type': 'application/json',
    },
    body: '{',
  });
  assert.equal(invalidJson.status, 400);
  assert.equal(invalidJson.headers.get('access-control-allow-origin'), 'https://www.kkdigitalstudioframes.com');

  const denied = await fetch(`${baseUrl}/api/site`, {
    headers: { Origin: 'https://unapproved.example' },
  });
  assert.equal(denied.status, 200);
  assert.equal(denied.headers.get('access-control-allow-origin'), null);
});
