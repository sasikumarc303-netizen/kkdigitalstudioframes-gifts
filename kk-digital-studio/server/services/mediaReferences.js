import Service from '../models/Service.js';
import GalleryImage from '../models/GalleryImage.js';
import Package from '../models/Package.js';
import Product from '../models/Product.js';
import Testimonial from '../models/Testimonial.js';
import Media from '../models/Media.js';
import Order from '../models/Order.js';
import SiteConfig from '../models/SiteConfig.js';

function replaceNestedString(value, oldUrl, newUrl) {
  if (value === oldUrl) return { value: newUrl, changed: true };
  if (!value || typeof value !== 'object') return { value, changed: false };

  let changed = false;
  for (const [key, child] of Object.entries(value)) {
    const result = replaceNestedString(child, oldUrl, newUrl);
    if (result.changed) {
      value[key] = result.value;
      changed = true;
    }
  }
  return { value, changed };
}

export async function replaceMediaReferences(oldUrl, newUrl) {
  if (!oldUrl || !newUrl || oldUrl === newUrl) return;
  await Promise.all([
    Service.updateMany({ image: oldUrl }, { $set: { image: newUrl } }),
    GalleryImage.updateMany({ image: oldUrl }, { $set: { image: newUrl } }),
    Package.updateMany({ image: oldUrl }, { $set: { image: newUrl } }),
    Product.updateMany(
      { images: oldUrl },
      { $set: { 'images.$[image]': newUrl } },
      { arrayFilters: [{ image: oldUrl }] }
    ),
    Testimonial.updateMany({ avatar: oldUrl }, { $set: { avatar: newUrl } }),
    Media.updateMany({ poster: oldUrl }, { $set: { poster: newUrl } }),
    Order.updateMany(
      { 'items.image': oldUrl },
      { $set: { 'items.$[item].image': newUrl } },
      { arrayFilters: [{ 'item.image': oldUrl }] }
    ),
  ]);

  const config = await SiteConfig.findOne({ key: 'main' });
  if (config) {
    const result = replaceNestedString(config.data, oldUrl, newUrl);
    if (result.changed) {
      config.data = result.value;
      config.markModified('data');
      await config.save();
    }
  }
}
