import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    type: { type: String, enum: ['image', 'video'], required: true, index: true },
    title: { type: String, trim: true, maxlength: 160, default: '' },
    alt: { type: String, trim: true, maxlength: 300, default: '' },
    url: { type: String, required: true },
    poster: { type: String, default: '' }, // video poster image URL
    provider: { type: String, enum: ['cloudinary', 'local', 'static'], default: 'local' },
    publicId: { type: String, default: '' }, // cloudinary public id or local relative path
    folder: { type: String, default: 'general', index: true },
    purpose: { type: String, enum: ['general', 'hero', 'promo'], default: 'general' }, // for videos
    mime: String,
    bytes: Number,
    width: Number,
    height: Number,
    duration: Number,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  },
  { timestamps: true }
);
schema.index({ title: 'text', alt: 'text' });

export default mongoose.model('Media', schema);
