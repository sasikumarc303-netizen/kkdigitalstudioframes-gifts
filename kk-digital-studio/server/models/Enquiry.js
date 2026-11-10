import mongoose from 'mongoose';
import { ENQUIRY_STATUSES } from '../config/constants.js';

const schema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
    type: { type: String, enum: ['contact', 'product', 'service', 'whatsapp'], default: 'contact' },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    subject: { type: String, trim: true, maxlength: 160, default: '' },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    reference: { type: String, trim: true, maxlength: 160, default: '' }, // product / service name the enquiry is about
    status: { type: String, enum: ENQUIRY_STATUSES, default: 'New', index: true },
    notes: [
      {
        text: String,
        by: String,
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);
schema.index({ name: 'text', phone: 'text', subject: 'text', message: 'text' });

export default mongoose.model('Enquiry', schema);
