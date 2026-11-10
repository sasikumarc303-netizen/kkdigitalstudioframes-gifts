import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, trim: true, maxlength: 30, default: '' },
    phoneKey: { type: String, index: true, default: '' },
    email: { type: String, trim: true, lowercase: true, maxlength: 160, default: '' },
    address: { type: String, trim: true, maxlength: 400, default: '' },
    notes: { type: String, trim: true, maxlength: 2000, default: '' },
    source: { type: String, default: 'website' },
  },
  { timestamps: true }
);
schema.index({ name: 'text', phone: 'text', email: 'text' });

export default mongoose.model('Customer', schema);
