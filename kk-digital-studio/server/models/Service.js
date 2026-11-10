import mongoose from 'mongoose';
import slugPlugin from './slugPlugin.js';

const schema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    tagline: { type: String, trim: true, maxlength: 160, default: '' },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    features: [{ type: String, trim: true, maxlength: 160 }],
    image: { type: String, default: '' },
    startingPrice: { type: String, trim: true, maxlength: 60, default: '' }, // free text e.g. "From ₹X" – set by the owner
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);
slugPlugin(schema, { source: 'title' });

export default mongoose.model('Service', schema);
