import mongoose from 'mongoose';

// Singleton document. Each group (general, contact, commerce, navigation, homepage, seo) is stored as a sub-document
// and merged over DEFAULT_CONFIG when read, so newly introduced settings always have a sensible default.
const schema = new mongoose.Schema(
  {
    key: { type: String, default: 'main', unique: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, minimize: false }
);

export default mongoose.model('SiteConfig', schema);
