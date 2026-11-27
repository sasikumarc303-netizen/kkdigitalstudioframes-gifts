import assert from 'node:assert/strict';
import test from 'node:test';
import { api } from './api.js';

test('API requests abort at their configured timeout and report a network timeout', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      }, { once: true });
    });

    await assert.rejects(api.get('/site', { timeoutMs: 5 }), (error) => {
      assert.equal(error.network, true);
      assert.equal(error.timeout, true);
      assert.match(error.message, /took too long/);
      return true;
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('API requests still return parsed successful responses', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    assert.deepEqual(await api.get('/site'), { ok: true });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('public GET requests retry one transient network failure', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  try {
    globalThis.fetch = async () => {
      calls += 1;
      if (calls === 1) throw new TypeError('connection reset');
      return new Response(JSON.stringify([{ id: 'service-1' }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    assert.deepEqual(await api.get('/services'), [{ id: 'service-1' }]);
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('public GET retries transient server errors but not permanent errors or admin requests', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  try {
    globalThis.fetch = async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(JSON.stringify({ message: 'Starting up' }), { status: 503 });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    };
    assert.deepEqual(await api.get('/gallery'), { ok: true });
    assert.equal(calls, 2);

    calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return new Response(JSON.stringify({ message: 'Not found' }), { status: 404 });
    };
    await assert.rejects(api.get('/products/missing'), (error) => error.status === 404);
    assert.equal(calls, 1);

    calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return new Response(JSON.stringify({ message: 'Unavailable' }), { status: 503 });
    };
    await assert.rejects(api.get('/admin/config'), (error) => error.status === 503);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
