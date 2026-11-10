import mongoose from 'mongoose';
import slugPlugin from './slugPlugin.js';

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    tagline: { type: String, trim: true, maxlength: 200, default: '' },
    price: { type: Number, min: 0, default: 0 }, // 0 => "Contact for pricing"
    priceNote: { type: String, trim: true, maxlength: 80, default: '' }, // e.g. "per session"
    features: [{ type: String, trim: true, maxlength: 200 }],
    image: { type: String, default: '' },
    popular: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);
slugPlugin(schema, { source: 'name' });

export default mongoose.model('Package', schema);
