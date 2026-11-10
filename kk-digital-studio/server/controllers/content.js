import { crud } from './crud.js';
import { ApiError, asyncHandler } from '../utils/helpers.js';
import Service from '../models/Service.js';
import Package from '../models/Package.js';
import Category from '../models/Category.js';
import GalleryImage from '../models/GalleryImage.js';
import Product from '../models/Product.js';
import Testimonial from '../models/Testimonial.js';
import { storeUpload } from '../services/media.js';
import Media from '../models/Media.js';
import { logActivity } from '../services/activity.js';

export const services = crud({
  Model: Service,
  entity: 'service',
  fields: ['title', 'tagline', 'description', 'features', 'image', 'startingPrice', 'order', 'published'],
  stringArrays: ['features'],
  searchFields: ['title', 'description'],
});

export const packages = crud({
  Model: Package,
  entity: 'package',
  fields: ['name', 'tagline', 'price', 'priceNote', 'features', 'image', 'popular', 'order', 'published'],
  stringArrays: ['features'],
  searchFields: ['name', 'tagline'],
  label: (d) => d.name,
});

export const categories = crud({
  Model: Category,
  entity: 'category',
  fields: ['name', 'type', 'description', 'order', 'published'],
  searchFields: ['name'],
  filters: ['type'],
  label: (d) => d.name,
  beforeDelete: async (doc) => {
    const [g, p] = await Promise.all([GalleryImage.countDocuments({ category: doc._id }), Product.countDocuments({ category: doc._id })]);
    if (g || p) throw new ApiError(409, `This category is used by ${g} gallery photo(s) and ${p} product(s). Move them to another category first.`);
  },
});

export const gallery = crud({
  Model: GalleryImage,
  entity: 'gallery photo',
  fields: ['title', 'caption', 'image', 'width', 'height', 'category', 'featured', 'order', 'published'],
  searchFields: ['title', 'caption'],
  filters: ['category', 'featured'],
  sort: { order: 1, createdAt: -1 },
  populate: { path: 'category', select: 'name slug' },
  label: (d) => d.title || 'untitled',
});

/** Multi-photo upload: stores every file, creates a Media record and a (by default published) gallery entry for each. */
gallery.bulkUpload = asyncHandler(async (req, res) => {
  const files = req.files || [];
  if (!files.length) throw new ApiError(400, 'Choose at least one image to upload');
  const published = req.body.published !== 'false';
  const category = req.body.category || undefined;
  const created = [];
  const errors = [];
  for (const file of files) {
    try {
      const stored = await storeUpload(file, { folder: 'gallery' });
      if (stored.type !== 'image') throw new ApiError(415, `"${file.originalname}" is not an image`);
      const media = await Media.create({ ...stored, uploadedBy: req.user._id });
      const doc = await GalleryImage.create({ title: media.title, image: media.url, width: media.width, height: media.height, category, published });
      created.push(doc);
    } catch (e) {
      errors.push({ file: file.originalname, message: e.message });
    }
  }
  logActivity(req, { action: 'upload', entity: 'gallery photo', summary: `Uploaded ${created.length} gallery photo(s)` });
  res.status(created.length ? 201 : 400).json(created.length ? { created, errors } : { created, errors, message: errors[0]?.message || 'Upload failed' });
});

const cleanVariants = (data) => {
  if (Array.isArray(data.variants)) {
    data.variants = data.variants.slice(0, 60).map((v) => {
      const out = {
        sku: String(v.sku || '').slice(0, 40),
        size: String(v.size || '').slice(0, 40),
        finish: String(v.finish || '').slice(0, 40),
        price: Math.max(0, Number(v.price) || 0),
        compareAtPrice: Math.max(0, Number(v.compareAtPrice) || 0),
        stock: Math.max(0, Math.floor(Number(v.stock) || 0)),
        active: v.active !== false,
      };
      if (v._id && /^[a-f\d]{24}$/i.test(String(v._id))) out._id = v._id; // keep ids stable so carts/orders stay valid
      return out;
    });
  }
  return data;
};

export const products = crud({
  Model: Product,
  entity: 'product',
  fields: ['name', 'shortDescription', 'description', 'category', 'images', 'features', 'variants', 'featured', 'order', 'published'],
  stringArrays: ['images', 'features'],
  searchFields: ['name', 'shortDescription'],
  filters: ['category', 'featured'],
  populate: { path: 'category', select: 'name slug' },
  sanitize: cleanVariants,
  label: (d) => d.name,
});

export const testimonials = crud({
  Model: Testimonial,
  entity: 'testimonial',
  fields: ['name', 'role', 'rating', 'text', 'avatar', 'order', 'published'],
  searchFields: ['name', 'text'],
  label: (d) => d.name,
});
