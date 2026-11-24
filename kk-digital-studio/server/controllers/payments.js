import { createHash, randomUUID } from 'node:crypto';
import Order from '../models/Order.js';
import { ApiError, asyncHandler } from '../utils/helpers.js';
import { validate } from '../middleware/validate.js';
import { env } from '../config/env.js';
import {
  amountInMinorUnits,
  getRazorpayClient,
  isPaymentAmountValid,
  paymentInfo,
  requestRazorpay,
  verifyCheckoutSignature,
  verifyWebhookSignature,
} from '../services/payments.js';

const checkoutRequestKeyPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hashCheckoutRequestKey = (key) => createHash('sha256').update(key).digest('hex');
const creationLeaseMs = 3 * 60 * 1000;

const ownerData = (input) => {
  const data = validate({
    orderNumber: { type: 'string', required: true, min: 1, max: 40 },
    checkoutRequestKey: { type: 'string', required: true, min: 36, max: 36 },
  }, input);
  if (!checkoutRequestKeyPattern.test(data.checkoutRequestKey)) throw new ApiError(422, 'Invalid checkout request key');
  return data;
};

async function findOwnedOrder(input) {
  const { orderNumber, checkoutRequestKey } = ownerData(input);
  const order = await Order.findOne({
    orderNumber: orderNumber.toUpperCase(),
    checkoutRequestHash: hashCheckoutRequestKey(checkoutRequestKey),
  });
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.paymentMethod !== 'online') throw new ApiError(409, 'This order is not an online payment order');
  return order;
}

function assertPayableOrder(order) {
  if (order.status === 'Cancelled' || order.stockRestored) throw new ApiError(409, 'This order has been cancelled and cannot be paid.');
  if (order.paymentStatus === 'Refunded') throw new ApiError(409, 'This order has already been refunded and cannot be paid again.');
  if (order.currency !== 'INR') throw new ApiError(422, 'Online checkout currently supports INR orders only.');
}

function orderView(order) {
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    items: order.items,
    subtotal: order.subtotal,
    discount: order.discount || 0,
    shipping: order.shipping,
    total: order.total,
    currency: order.currency,
    createdAt: order.createdAt,
  };
}

function paymentView(order) {
  return {
    order: orderView(order),
    paymentStatus: order.paymentStatus,
    paymentId: order.razorpayPaymentId || '',
    razorpayOrderId: order.razorpayOrderId || '',
    amount: order.paymentAmount ?? order.total,
    currency: order.currency,
    paymentDate: order.paymentDate || null,
  };
}

function checkProviderOrder(providerOrder, order) {
  if (
    !providerOrder?.id
    || providerOrder.receipt !== order.orderNumber
    || Number(providerOrder.amount) !== amountInMinorUnits(order.total)
    || providerOrder.currency !== order.currency
  ) {
    throw new ApiError(502, 'The payment provider returned an order that does not match your order total.');
  }
}

async function applyCapturedPayment(order, payment) {
  if (order.currency !== 'INR') throw new ApiError(422, 'Online checkout currently supports INR orders only.');
  if (payment?.status !== 'captured' || !isPaymentAmountValid(payment, order)) {
    throw new ApiError(409, 'The payment could not be verified against this order.');
  }

  if (order.paymentStatus === 'Paid') {
    if (order.razorpayPaymentId !== payment.id) {
      throw new ApiError(409, 'A different payment has already been recorded for this order.');
    }
    return order;
  }
  if (order.paymentStatus === 'Refunded') throw new ApiError(409, 'A refunded order cannot be marked as paid again.');

  const paymentDate = Number.isFinite(Number(payment.created_at))
    ? new Date(Number(payment.created_at) * 1000)
    : new Date();
  const updated = await Order.findOneAndUpdate(
    {
      _id: order._id,
      razorpayOrderId: order.razorpayOrderId,
      paymentStatus: { $nin: ['Paid', 'Refunded'] },
    },
    {
      $set: {
        razorpayPaymentId: payment.id,
        paymentStatus: 'Paid',
        paymentAmount: Number(payment.amount) / 100,
        paymentDate,
      },
      $push: {
        history: { status: order.status, note: 'Razorpay payment captured', by: 'razorpay', at: paymentDate },
      },
    },
    { new: true, runValidators: true }
  );
  if (updated) return updated;

  const current = await Order.findById(order._id);
  if (current?.paymentStatus === 'Paid' && current.razorpayPaymentId === payment.id) return current;
  throw new ApiError(409, 'This order can no longer be marked as paid.');
}

async function recordFailedPayment(order, payment) {
  if (!isPaymentAmountValid(payment, order) || payment.status !== 'failed') return order;
  if (order.paymentStatus === 'Paid' || order.paymentStatus === 'Failed' || order.paymentStatus === 'Refunded') return order;
  return (await Order.findOneAndUpdate(
    { _id: order._id, paymentStatus: { $nin: ['Paid', 'Failed', 'Refunded'] } },
    {
      $set: { razorpayPaymentId: payment.id, paymentStatus: 'Failed' },
      $push: {
        history: { status: order.status, note: 'Razorpay payment attempt failed', by: 'razorpay', at: new Date() },
      },
    },
    { new: true, runValidators: true }
  )) || Order.findById(order._id);
}

async function listOrderPayments(client, order) {
  if (!order.razorpayOrderId) return null;
  const result = await requestRazorpay(() => client.orders.fetchPayments(order.razorpayOrderId));
  return Array.isArray(result?.items) ? result.items : [];
}

export const createOrder = asyncHandler(async (req, res) => {
  const order = await findOwnedOrder(req.body);
  assertPayableOrder(order);
  if (!paymentInfo().onlineEnabled) throw new ApiError(503, 'Online payments are not available right now.');
  if (order.paymentStatus === 'Paid') return res.json(paymentView(order));

  const client = getRazorpayClient({ requireEnabled: true });
  if (order.razorpayOrderId) {
    await Order.updateOne(
      { _id: order._id, paymentStatus: { $ne: 'Paid' }, status: { $ne: 'Cancelled' } },
      { $set: { paymentStatus: 'Pending' } }
    );
    order.paymentStatus = 'Pending';
    return res.json({
      ...paymentView(order),
      keyId: env.razorpay.keyId,
      amount: amountInMinorUnits(order.total),
    });
  }

  const token = randomUUID();
  const now = new Date();
  const leaseExpiredBefore = new Date(now.getTime() - creationLeaseMs);
  const claimed = await Order.findOneAndUpdate(
    {
      _id: order._id,
      paymentStatus: { $ne: 'Paid' },
      status: { $ne: 'Cancelled' },
      razorpayOrderId: { $exists: false },
      $or: [
        { razorpayOrderCreationStartedAt: { $exists: false } },
        { razorpayOrderCreationStartedAt: { $lte: leaseExpiredBefore } },
      ],
    },
    { $set: { razorpayOrderCreationToken: token, razorpayOrderCreationStartedAt: now } },
    { new: true }
  );

  if (!claimed) {
    const current = await Order.findById(order._id);
    if (current?.razorpayOrderId) {
      return res.json({
        ...paymentView(current),
        keyId: env.razorpay.keyId,
        amount: amountInMinorUnits(current.total),
      });
    }
    throw new ApiError(409, 'Payment setup is already in progress. Please wait a moment and retry.');
  }

  let existing;
  try {
    existing = await requestRazorpay(() => client.orders.all({ receipt: order.orderNumber, count: 100 }));
  } catch (error) {
    await Order.updateOne(
      { _id: order._id, razorpayOrderCreationToken: token },
      { $unset: { razorpayOrderCreationToken: 1, razorpayOrderCreationStartedAt: 1 } }
    );
    throw error;
  }
  let providerOrder = (existing?.items || []).find((item) => item.receipt === order.orderNumber);
  if (!providerOrder) {
    providerOrder = await requestRazorpay(() => client.orders.create({
      amount: amountInMinorUnits(order.total),
      currency: order.currency,
      receipt: order.orderNumber,
      partial_payment: false,
    }));
  }
  checkProviderOrder(providerOrder, order);

  const saved = await Order.findOneAndUpdate(
    { _id: order._id, razorpayOrderCreationToken: token, status: { $ne: 'Cancelled' } },
    {
      $set: {
        razorpayOrderId: providerOrder.id,
        paymentStatus: 'Pending',
        paymentAmount: order.total,
      },
      $unset: { razorpayOrderCreationToken: 1, razorpayOrderCreationStartedAt: 1 },
    },
    { new: true, runValidators: true }
  );
  if (!saved) {
    const current = await Order.findById(order._id);
    if (current?.razorpayOrderId === providerOrder.id) {
      return res.json({
        ...paymentView(current),
        keyId: env.razorpay.keyId,
        amount: amountInMinorUnits(current.total),
      });
    }
    throw new ApiError(409, 'The order changed while payment was being prepared. Please refresh and try again.');
  }

  res.json({
    ...paymentView(saved),
    keyId: env.razorpay.keyId,
    amount: amountInMinorUnits(saved.total),
  });
});

export const verify = asyncHandler(async (req, res) => {
  const order = await findOwnedOrder(req.body);
  const data = validate({
    razorpayPaymentId: { type: 'string', required: true, min: 1, max: 100 },
    razorpaySignature: { type: 'string', required: true, min: 64, max: 64 },
  }, req.body);
  if (!order.razorpayOrderId || !verifyCheckoutSignature({
    orderId: order.razorpayOrderId,
    paymentId: data.razorpayPaymentId,
    signature: data.razorpaySignature,
  })) {
    throw new ApiError(400, 'The payment signature is invalid.');
  }

  const payment = await requestRazorpay(() => getRazorpayClient().payments.fetch(data.razorpayPaymentId));
  if (payment.status === 'captured') await applyCapturedPayment(order, payment);
  else if (payment.status === 'failed') await recordFailedPayment(order, payment);
  const current = await Order.findById(order._id);
  res.json(paymentView(current));
});

export const status = asyncHandler(async (req, res) => {
  const order = await findOwnedOrder(req.body);
  if (!['Paid', 'Refunded'].includes(order.paymentStatus) && order.razorpayOrderId) {
    const attempts = await listOrderPayments(getRazorpayClient(), order);
    const captured = attempts.find((payment) => payment.status === 'captured');
    if (captured) await applyCapturedPayment(order, captured);
    else {
      const currentAttempt = await Order.findById(order._id);
      if (currentAttempt.paymentStatus !== 'Failed') {
        const failed = attempts.find((payment) => payment.status === 'failed');
        if (failed) await recordFailedPayment(currentAttempt, failed);
      }
    }
  }
  return res.json(paymentView(await Order.findById(order._id)));
});

export const webhook = asyncHandler(async (req, res) => {
  const signature = req.get('x-razorpay-signature');
  if (!verifyWebhookSignature(req.body, signature)) throw new ApiError(400, 'Invalid webhook signature');

  let event;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch {
    throw new ApiError(400, 'Invalid webhook payload');
  }

  const payment = event?.payload?.payment?.entity;
  if (!['payment.captured', 'payment.failed'].includes(event?.event) || !payment?.order_id) {
    return res.json({ received: true });
  }

  const order = await Order.findOne({ razorpayOrderId: payment.order_id, paymentMethod: 'online' });
  if (!order) return res.json({ received: true });

  if (event.event === 'payment.captured') {
    const verifiedPayment = await requestRazorpay(() => getRazorpayClient().payments.fetch(payment.id));
    try {
      await applyCapturedPayment(order, verifiedPayment);
    } catch (error) {
      if (error.status !== 409) throw error;
      console.error(`[payments] captured payment conflict for order ${order.orderNumber}`);
    }
  } else {
    await recordFailedPayment(order, payment);
  }
  res.json({ received: true });
});
