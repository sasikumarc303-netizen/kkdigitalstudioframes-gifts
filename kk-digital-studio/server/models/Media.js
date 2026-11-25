import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    type: { type: String, enum: ['image', 'video'], required: true, index: true },
    title: { type: String, trim: true, maxlength: 160, default: '' },
    alt: { type: String, trim: true, maxlength: 300, default: '' },
    url: { type: String, required: true },
    poster: { type: String, default: '' }, // video poster image URL
    provider: { type: String, enum: ['cloudinary', 'backblaze', 'local', 'static'], default: 'local' },
    publicId: { type: String, default: '' }, // provider object id or local relative path
    folder: { type: String, default: 'general', index: true },
    posterPublicId: { type: String, default: '' },
    originalProvider: { type: String, enum: ['cloudinary', 'backblaze', 'local'], default: undefined },
    originalPublicId: { type: String, default: '' },
    originalPath: { type: String, default: '' },
    originalMime: { type: String, default: '' },
    originalBytes: { type: Number, default: 0 },
    originalFilename: { type: String, default: '' },
    legacyProvider: { type: String, enum: ['cloudinary', 'backblaze', 'local'], default: undefined },
    legacyPublicId: { type: String, default: '' },
    legacyPosterPublicId: { type: String, default: '' },
    legacyOriginalProvider: { type: String, enum: ['cloudinary', 'backblaze', 'local'], default: undefined },
    legacyOriginalPublicId: { type: String, default: '' },
    legacyOriginalPath: { type: String, default: '' },
    legacyType: { type: String, enum: ['image', 'video'], default: undefined },
    legacyUrl: { type: String, default: '' },
    legacyPoster: { type: String, default: '' },
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
schema.set('toJSON', {
  transform(_doc, ret) {
    ret.originalAvailable = Boolean(ret.originalProvider);
    for (const key of [
      'originalProvider',
      'originalPublicId',
      'originalPath',
      'legacyProvider',
      'legacyPublicId',
      'legacyPosterPublicId',
      'legacyOriginalProvider',
      'legacyOriginalPublicId',
      'legacyOriginalPath',
      'legacyType',
      'legacyUrl',
      'legacyPoster',
    ]) delete ret[key];
    return ret;
  },
});

export default mongoose.model('Media', schema);
