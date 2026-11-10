import mongoose from 'mongoose';
import slugPlugin from './slugPlugin.js';

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    type: { type: String, enum: ['gallery', 'product'], default: 'gallery', index: true },
    description: { type: String, trim: true, maxlength: 400, default: '' },
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: true },
  },
  { timestamps: true }
);
slugPlugin(schema, { source: 'name' });

export default mongoose.model('Category', schema);
