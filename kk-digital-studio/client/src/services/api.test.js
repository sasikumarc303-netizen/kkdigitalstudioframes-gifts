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
