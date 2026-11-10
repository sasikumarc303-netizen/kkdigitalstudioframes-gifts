import { env } from '../config/env.js';

/**
 * Payment integration point.
 *
 * Online payment is NOT enabled by default. Orders are enquiry-based: the studio confirms the order and arranges
 * payment with the customer. To add a gateway (for example Razorpay or Stripe) implement `createPaymentSession` for it
 * below, set PAYMENT_PROVIDER in the environment, and add the gateway's keys to the server environment (never the client).
 */
export function paymentInfo() {
  return { provider: env.paymentProvider, onlineEnabled: false };
}

export async function createPaymentSession(/* order */) {
  if (env.paymentProvider === 'none') return null;
  throw new Error(`Payment provider "${env.paymentProvider}" is configured but not implemented in server/services/payments.js`);
}
