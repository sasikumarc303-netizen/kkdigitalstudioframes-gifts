import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_CONFIG } from '../../server/services/defaults.js';
import { loadSiteConfig, SITE_CONFIG_TIMEOUT_MS } from '../src/context/siteConfig.js';

test('site settings retry one transient failure and return live configuration', async () => {
  let calls = 0;
  const pauses = [];
  const config = { general: { businessName: 'Live studio settings' } };
  const result = await loadSiteConfig(async ({ timeoutMs }) => {
    calls += 1;
    assert.equal(timeoutMs, SITE_CONFIG_TIMEOUT_MS);
    if (calls === 1) throw Object.assign(new Error('temporary network failure'), { network: true });
    return { config, payment: { enabled: true } };
  }, async (ms) => pauses.push(ms));

  assert.equal(calls, 2);
  assert.deepEqual(pauses, [750]);
  assert.equal(result.config, config);
  assert.deepEqual(result.payment, { enabled: true });
  assert.equal(result.usingFallback, false);
  assert.equal(result.error, null);
});

test('site settings preserve static defaults after bounded backend failures', async () => {
  let calls = 0;
  const error = Object.assign(new Error('backend unavailable'), { status: 503 });
  const result = await loadSiteConfig(async () => {
    calls += 1;
    throw error;
  }, async () => {});

  assert.equal(calls, 2);
  assert.equal(result.config, DEFAULT_CONFIG);
  assert.equal(result.payment, null);
  assert.equal(result.error, error);
  assert.equal(result.usingFallback, true);
});

test('site settings do not retry permanent client errors or accept malformed responses', async () => {
  let calls = 0;
  const rejected = await loadSiteConfig(async () => {
    calls += 1;
    throw Object.assign(new Error('forbidden'), { status: 403 });
  }, async () => {});
  assert.equal(calls, 1);
  assert.equal(rejected.usingFallback, true);

  calls = 0;
  const malformed = await loadSiteConfig(async () => {
    calls += 1;
    return { config: null };
  }, async () => {});
  assert.equal(calls, 1);
  assert.equal(malformed.usingFallback, true);
  assert.match(malformed.error.message, /incomplete site settings/);
});
