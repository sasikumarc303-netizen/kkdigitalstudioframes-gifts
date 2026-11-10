import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    title: { type: String, trim: true, maxlength: 160, default: '' },
    caption: { type: String, trim: true, maxlength: 600, default: '' },
    image: { type: String, required: true },
    width: Number,
    height: Number,
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', index: true },
    featured: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export default mongoose.model('GalleryImage', schema);
