import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    idempotencyKey: { type: String, required: true, unique: true },
    status: { type: String, required: true },
    state: {
      type: String,
      enum: ['not_requested', 'manual', 'queued', 'sending', 'accepted', 'failed', 'unknown'],
      required: true,
    },
    attempts: { type: Number, default: 0 },
    nextAttemptAt: { type: Date, default: null },
    lastAttemptAt: { type: Date, default: null },
    acceptedAt: { type: Date, default: null },
    claimId: { type: String, default: '' },
    lastError: { type: String, default: '' },
    providerMessageId: { type: String, default: '' },
  },
  { timestamps: true }
);

schema.index({ state: 1, nextAttemptAt: 1 });

export default mongoose.model('OrderNotification', schema);
