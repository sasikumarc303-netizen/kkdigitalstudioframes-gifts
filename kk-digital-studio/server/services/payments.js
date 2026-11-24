import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { env } from '../config/env.js';
import { ApiError } from '../utils/helpers.js';

let client;

function razorpayCredentialsMatchMode() {
  return env.razorpay.testMode
    ? env.razorpay.keyId.startsWith('rzp_test_')
    : env.razorpay.keyId.startsWith('rzp_live_');
}

export function razorpayReady() {
  return (!env.isProd || !env.razorpay.testMode || env.razorpay.allowTestMode)
    && env.paymentProvider === 'razorpay'
    && Boolean(env.razorpay.keyId && env.razorpay.keySecret)
    && razorpayCredentialsMatchMode();
}

export function paymentInfo() {
  const ready = razorpayReady();
  return {
    provider: ready ? 'razorpay' : env.paymentProvider,
    onlineEnabled: ready && env.razorpay.enabled && Boolean(env.razorpay.webhookSecret),
    mode: env.razorpay.testMode ? 'test' : 'live',
  };
}

export function getRazorpayClient({ requireEnabled = false } = {}) {
  if (!razorpayReady() || (requireEnabled && !env.razorpay.enabled)) {
    throw new ApiError(503, 'Online payments are not available right now. Please choose another payment method.');
  }
  if (!client) {
    client = new Razorpay({
      key_id: env.razorpay.keyId,
      key_secret: env.razorpay.keySecret,
    });
  }
  return client;
}

export async function requestRazorpay(operation) {
  try {
    return await operation();
  } catch (error) {
    const status = Number(error?.statusCode || error?.status) || 0;
    console.error('[payments] Razorpay request failed', { status });
    throw new ApiError(502, 'The payment service is temporarily unavailable. Please wait and try again.');
  }
}

function isValidHexDigest(value) {
  return typeof value === 'string' && /^[a-f\d]{64}$/i.test(value);
}

function safeDigestEqual(expected, actual) {
  if (!isValidHexDigest(expected) || !isValidHexDigest(actual)) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(actual, 'hex'));
}

export function verifyCheckoutSignature({ orderId, paymentId, signature, secret = env.razorpay.keySecret }) {
  if (!orderId || !paymentId || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  return safeDigestEqual(expected, signature);
}

export function verifyWebhookSignature(rawBody, signature, secret = env.razorpay.webhookSecret) {
  if (!Buffer.isBuffer(rawBody) || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeDigestEqual(expected, signature);
}

export function amountInMinorUnits(amount) {
  const minor = Math.round(Number(amount) * 100);
  if (!Number.isSafeInteger(minor) || minor <= 0) {
    throw new ApiError(422, 'This order total cannot be processed as an online payment.');
  }
  return minor;
}

export function isPaymentAmountValid(payment, order) {
  return Number.isSafeInteger(Number(payment?.amount))
    && Number(payment.amount) === amountInMinorUnits(order.total)
    && payment.currency === order.currency
    && payment.order_id === order.razorpayOrderId;
}
