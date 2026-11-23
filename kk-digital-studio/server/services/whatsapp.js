import { env } from '../config/env.js';
import { publicOrderStatus } from './orderTracking.js';
import { SEO_ORIGIN } from '../../seo.mjs';

export function normalizeWhatsAppRecipient(phone) {
  const value = String(phone || '').trim();
  const digits = value.replace(/\D/g, '');
  if (value.startsWith('+')) return digits.length >= 11 && digits.length <= 15 ? digits : '';
  if (value.startsWith('00')) {
    const international = digits.slice(2);
    return international.length >= 11 && international.length <= 15 ? international : '';
  }
  if (digits.length === 10) return `91${digits}`;
  if (digits.length >= 11 && digits.length <= 15 && !digits.startsWith('0')) return digits;
  return '';
}

export function parseRetryAfter(value, now = Date.now()) {
  const header = String(value || '').trim();
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds);
  const retryAt = Date.parse(header);
  return Number.isFinite(retryAt) && retryAt > now
    ? Math.ceil((retryAt - now) / 1000)
    : null;
}

export function buildWhatsAppTemplatePayload({ to, orderNumber, status, config = env.whatsapp }) {
  return {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: config.templateName,
      language: { code: config.templateLanguage },
      components: [{
        type: 'body',
        parameters: [
          { type: 'text', text: orderNumber },
          { type: 'text', text: publicOrderStatus(status) },
          { type: 'text', text: `${SEO_ORIGIN}/track-order` },
        ],
      }],
    },
  };
}

export async function sendWhatsAppOrderStatus({
  phone,
  orderNumber,
  status,
  fetchImpl = fetch,
  config = env.whatsapp,
  enabled = env.whatsappEnabled,
}) {
  if (!enabled) return { state: 'manual', code: 'provider_not_configured' };
  const to = normalizeWhatsAppRecipient(phone);
  if (!to) return { state: 'failed', code: 'phone_not_international' };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetchImpl(
      `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildWhatsAppTemplatePayload({ to, orderNumber, status, config })),
        signal: controller.signal,
      }
    );

    if (response.status === 429) {
      return {
        state: 'retryable',
        code: 'provider_rate_limited',
        retryAfterSeconds: parseRetryAfter(response.headers.get('retry-after')),
      };
    }
    if (!response.ok) {
      return {
        state: response.status >= 500 ? 'unknown' : 'failed',
        code: `provider_http_${response.status}`,
      };
    }

    const result = await response.json();
    const providerMessageId = result?.messages?.[0]?.id;
    return providerMessageId
      ? { state: 'accepted', providerMessageId }
      : { state: 'unknown', code: 'provider_response_unconfirmed' };
  } catch (error) {
    return {
      state: 'unknown',
      code: error?.name === 'AbortError' ? 'provider_timeout' : 'provider_network_error',
    };
  } finally {
    clearTimeout(timeout);
  }
}
