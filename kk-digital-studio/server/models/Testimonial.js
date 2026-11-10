import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    role: { type: String, trim: true, maxlength: 100, default: '' }, // e.g. "Wedding client, Tirupathur"
    rating: { type: Number, min: 1, max: 5, default: 5 },
    text: { type: String, required: true, trim: true, maxlength: 1200 },
    avatar: { type: String, default: '' },
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model('Testimonial', schema);
