import mongoose from 'mongoose';
import slugPlugin from './slugPlugin.js';

const variantSchema = new mongoose.Schema({
  sku: { type: String, trim: true, maxlength: 40, default: '' },
  size: { type: String, trim: true, maxlength: 40, default: '' },
  finish: { type: String, trim: true, maxlength: 40, default: '' },
  price: { type: Number, min: 0, default: 0 }, // 0 => "price on request" (cannot be added to cart)
  compareAtPrice: { type: Number, min: 0, default: 0 },
  stock: { type: Number, min: 0, default: 0 },
  active: { type: Boolean, default: true },
});

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 140 },
    shortDescription: { type: String, trim: true, maxlength: 240, default: '' },
    description: { type: String, trim: true, maxlength: 4000, default: '' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', index: true },
    images: [{ type: String }],
    features: [{ type: String, trim: true, maxlength: 160 }],
    variants: [variantSchema],
    featured: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);
slugPlugin(schema, { source: 'name' });

/** Public representation with derived option lists and price range. Never exposes admin-only data beyond what shoppers need. */
schema.methods.toPublic = function toPublic() {
  const o = this.toObject({ virtuals: false });
  const active = (o.variants || []).filter((v) => v.active);
  const priced = active.filter((v) => v.price > 0);
  const uniq = (arr) => [...new Set(arr.filter(Boolean))];
  return {
    id: String(o._id),
    slug: o.slug,
    name: o.name,
    shortDescription: o.shortDescription,
    description: o.description,
    features: o.features,
    images: o.images,
    category: o.category && o.category.name ? { id: String(o.category._id), name: o.category.name, slug: o.category.slug } : o.category ? { id: String(o.category) } : null,
    featured: o.featured,
    sizes: uniq(active.map((v) => v.size)),
    finishes: uniq(active.map((v) => v.finish)),
    fromPrice: priced.length ? Math.min(...priced.map((v) => v.price)) : 0,
    hasPrice: priced.length > 0,
    inStock: active.some((v) => v.price > 0 && v.stock > 0),
    variants: active.map((v) => ({
      id: String(v._id),
      sku: v.sku,
      size: v.size,
      finish: v.finish,
      price: v.price,
      compareAtPrice: v.compareAtPrice,
      stock: v.stock,
    })),
  };
};

export default mongoose.model('Product', schema);
