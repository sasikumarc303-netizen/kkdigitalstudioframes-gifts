import mongoose from 'mongoose';
import { ORDER_STATUSES, PAYMENT_STATUSES } from '../config/constants.js';

const itemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    variantId: String,
    name: String,
    size: String,
    finish: String,
    sku: String,
    image: String,
    unitPrice: Number,
    quantity: Number,
    lineTotal: Number,
  },
  { _id: false }
);

const historySchema = new mongoose.Schema(
  { status: String, note: { type: String, default: '' }, by: { type: String, default: 'customer' }, at: { type: Date, default: Date.now } },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
    contact: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      phoneKey: { type: String, index: true },
      email: { type: String, default: '' },
    },
    shippingAddress: {
      line1: { type: String, default: '' },
      line2: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      pincode: { type: String, default: '' },
    },
    fulfilment: { type: String, enum: ['delivery', 'pickup'], default: 'delivery' },
    items: [itemSchema],
    subtotal: Number,
    shipping: { type: Number, default: 0 },
    total: Number,
    currency: { type: String, default: 'INR' },
    paymentMethod: { type: String, default: 'enquiry' }, // enquiry | cod | online (online only when a provider is configured)
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'Unpaid' },
    status: { type: String, enum: ORDER_STATUSES, default: 'Pending', index: true },
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
    adminNotes: { type: String, trim: true, maxlength: 2000, default: '' },
    stockRestored: { type: Boolean, default: false },
    history: [historySchema],
  },
  { timestamps: true }
);
schema.index({ 'contact.name': 'text', 'contact.phone': 'text', orderNumber: 'text' });

export default mongoose.model('Order', schema);
