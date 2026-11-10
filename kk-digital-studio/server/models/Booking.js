import mongoose from 'mongoose';
import { BOOKING_STATUSES } from '../config/constants.js';

const historySchema = new mongoose.Schema(
  {
    action: String, // Created | Status changed | Rescheduled | Cancelled by customer | Reschedule requested | Note
    status: String,
    note: { type: String, default: '' },
    by: { type: String, default: 'customer' },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, trim: true },
    phoneKey: { type: String, index: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    serviceTitle: { type: String, required: true },
    date: { type: String, required: true }, // YYYY-MM-DD (IST)
    time: { type: String, required: true }, // HH:MM
    location: { type: String, trim: true, maxlength: 300, default: '' },
    message: { type: String, trim: true, maxlength: 1500, default: '' },
    status: { type: String, enum: BOOKING_STATUSES, default: 'Pending', index: true },
    adminNotes: { type: String, trim: true, maxlength: 2000, default: '' },
    rescheduleRequest: {
      date: String,
      time: String,
      note: String,
      at: Date,
    },
    history: [historySchema],
  },
  { timestamps: true }
);
schema.index({ date: 1 });
schema.index({ name: 'text', phone: 'text', reference: 'text', serviceTitle: 'text' });

export default mongoose.model('Booking', schema);
