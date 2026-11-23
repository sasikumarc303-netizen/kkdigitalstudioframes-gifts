import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildWhatsAppTemplatePayload,
  normalizeWhatsAppRecipient,
  parseRetryAfter,
  sendWhatsAppOrderStatus,
} from './whatsapp.js';

const config = {
  accessToken: 'test-token',
  phoneNumberId: '123456789',
  templateName: 'order_status_update',
  apiVersion: 'v22.0',
  templateLanguage: 'en',
};

test('normalizes only supported international phone formats', () => {
  assert.equal(normalizeWhatsAppRecipient('+91 98765 43210'), '919876543210');
  assert.equal(normalizeWhatsAppRecipient('0091 98765 43210'), '919876543210');
  assert.equal(normalizeWhatsAppRecipient('9876543210'), '919876543210');
  assert.equal(normalizeWhatsAppRecipient('01234567890'), '');
  assert.equal(normalizeWhatsAppRecipient('123'), '');
});

test('parses numeric and HTTP-date Retry-After values safely', () => {
  const now = Date.parse('2026-11-23T00:00:00Z');
  assert.equal(parseRetryAfter('30', now), 30);
  assert.equal(parseRetryAfter('Mon, 23 Nov 2026 00:01:00 GMT', now), 60);
  assert.equal(parseRetryAfter('invalid', now), null);
  assert.equal(parseRetryAfter('Sun, 22 Nov 2026 00:00:00 GMT', now), null);
});

test('approved template payload contains order, public status and a query-free tracking URL', () => {
  const payload = buildWhatsAppTemplatePayload({
    to: '919876543210',
    orderNumber: 'KK-ORD-260101-AB12',
    status: 'Pending',
    config,
  });
  assert.equal(payload.template.name, 'order_status_update');
  assert.deepEqual(payload.template.components[0].parameters.map((item) => item.text), [
    'KK-ORD-260101-AB12',
    'Placed',
    'https://kkdigitalstudioframes.com/track-order',
  ]);
  assert.equal(payload.template.components[0].parameters[2].text.includes('?'), false);
});

test('provider acceptance is not misreported as delivery', async () => {
  let request;
  const result = await sendWhatsAppOrderStatus({
    phone: '9876543210',
    orderNumber: 'KK-ORD-260101-AB12',
    status: 'Pending',
    config,
    enabled: true,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return {
        ok: true,
        status: 200,
        json: async () => ({ messages: [{ id: 'wamid.test' }] }),
      };
    },
  });
  assert.equal(request.url, 'https://graph.facebook.com/v22.0/123456789/messages');
  assert.equal(request.options.headers.Authorization, 'Bearer test-token');
  assert.equal(JSON.parse(request.options.body).to, '919876543210');
  assert.deepEqual(result, { state: 'accepted', providerMessageId: 'wamid.test' });
});

test('provider rate limits are retryable, while ambiguous outcomes are not auto-retried', async () => {
  const limited = await sendWhatsAppOrderStatus({
    phone: '9876543210',
    orderNumber: 'KK-ORD-260101-AB12',
    status: 'Confirmed',
    config,
    enabled: true,
    fetchImpl: async () => ({
      ok: false,
      status: 429,
      headers: { get: () => '30' },
    }),
  });
  assert.deepEqual(limited, { state: 'retryable', code: 'provider_rate_limited', retryAfterSeconds: 30 });

  const unknown = await sendWhatsAppOrderStatus({
    phone: '9876543210',
    orderNumber: 'KK-ORD-260101-AB12',
    status: 'Confirmed',
    config,
    enabled: true,
    fetchImpl: async () => { const error = new Error('timeout'); error.name = 'AbortError'; throw error; },
  });
  assert.deepEqual(unknown, { state: 'unknown', code: 'provider_timeout' });

  const rejected = await sendWhatsAppOrderStatus({
    phone: '9876543210',
    orderNumber: 'KK-ORD-260101-AB12',
    status: 'Confirmed',
    config,
    enabled: true,
    fetchImpl: async () => ({ ok: false, status: 400 }),
  });
  assert.deepEqual(rejected, { state: 'failed', code: 'provider_http_400' });

  const ambiguousServerError = await sendWhatsAppOrderStatus({
    phone: '9876543210',
    orderNumber: 'KK-ORD-260101-AB12',
    status: 'Confirmed',
    config,
    enabled: true,
    fetchImpl: async () => ({ ok: false, status: 503 }),
  });
  assert.deepEqual(ambiguousServerError, { state: 'unknown', code: 'provider_http_503' });
});

test('incomplete provider configuration stays disabled', async () => {
  const result = await sendWhatsAppOrderStatus({
    phone: '9876543210',
    orderNumber: 'KK-ORD-260101-AB12',
    status: 'Placed',
    config: {},
    enabled: false,
    fetchImpl: async () => { throw new Error('The provider must not be called'); },
  });
  assert.deepEqual(result, { state: 'manual', code: 'provider_not_configured' });
});
