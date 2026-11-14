// Usage: npm run seed            – first-time content + admin account (safe to re-run; never overwrites existing content)
//        npm run seed:demo       – same, plus clearly sample prices/stock on the frame products so the shop can be tried out
import { env } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import AdminUser from '../models/AdminUser.js';
import Category from '../models/Category.js';
import Service from '../models/Service.js';
import Package from '../models/Package.js';
import Product from '../models/Product.js';
import Media from '../models/Media.js';
import SiteConfig from '../models/SiteConfig.js';
import { MODULES } from '../config/constants.js';
import { PASSWORD_RULE, PASSWORD_MESSAGE } from '../middleware/validate.js';
import { PACKAGE_SEEDS, SERVICE_SEEDS } from '../../public-content.mjs';

const demo = process.argv.includes('--demo-prices');

await connectDB();

// ---------- admin account ----------
const { email, password, name } = env.seedAdmin;
if ((await AdminUser.countDocuments()) === 0) {
  if (!email || !password) {
    console.warn('! No admin created: set ADMIN_EMAIL and ADMIN_PASSWORD in .env and run the seed again (or `npm run create-admin`).');
  } else if (!PASSWORD_RULE(password)) {
    console.warn(`! No admin created: ${PASSWORD_MESSAGE}`);
  } else {
    await AdminUser.create({ name, email, role: 'superadmin', permissions: [...MODULES], passwordHash: await AdminUser.hashPassword(password) });
    console.log(`✓ Created superadmin ${email}`);
  }
} else console.log('• Admin account(s) already exist – skipped');

// ---------- site configuration (contact details come from .env if given, otherwise stay empty) ----------
if (!(await SiteConfig.findOne({ key: 'main' }))) {
  const contact = {};
  if (env.seedContact.phone) contact.phone = env.seedContact.phone;
  if (env.seedContact.whatsapp) contact.whatsapp = env.seedContact.whatsapp;
  if (env.seedContact.email) contact.email = env.seedContact.email;
  await SiteConfig.create({ key: 'main', data: Object.keys(contact).length ? { contact: { ...contact } } : {} });
  console.log('✓ Created site configuration');
}
// NB: a partial `contact` group is fine – missing keys fall back to defaults when read.

// ---------- categories ----------
const galleryCats = ['Wedding', 'Pre-Wedding', 'Portrait', 'Family', 'Birthday', 'Events', 'Product', 'Studio'];
const productCats = ['Photo Frames', 'Keepsakes & Gifts'];
async function ensureCategory(name, type, order) {
  const ex = await Category.findOne({ name, type });
  return ex || Category.create({ name, type, order });
}
const gCats = [];
for (const [i, n] of galleryCats.entries()) gCats.push(await ensureCategory(n, 'gallery', i));
const frameCat = await ensureCategory('Photo Frames', 'product', 0);
const giftCat = await ensureCategory('Keepsakes & Gifts', 'product', 1);
console.log('✓ Categories ready');

// ---------- services ----------
if ((await Service.countDocuments()) === 0) {
  for (const [order, service] of SERVICE_SEEDS.entries()) await Service.create({ ...service, order });
  console.log(`✓ Added ${SERVICE_SEEDS.length} services (upload an image for each in Admin → Services)`);
}

// ---------- packages (no prices invented: 0 shows "Contact for pricing") ----------
if ((await Package.countDocuments()) === 0) {
  await Package.create(PACKAGE_SEEDS.map((pkg, order) => ({ ...pkg, order })));
  console.log('✓ Added 3 package templates – set real prices in Admin → Packages');
}

// ---------- products ----------
const SIZES = ['8x10', '12x16', '16x20', '20x30'];
const FINISHES = ['Oak', 'Acrylic', 'Metal'];
const demoPrice = (i, j) => (demo ? 499 + i * 400 + j * 150 : 0);
const matrix = (sizes, finishes, skuPrefix) => sizes.flatMap((size, i) => finishes.map((finish, j) => ({
  sku: `${skuPrefix}-${size}-${finish.slice(0, 3)}`.toUpperCase(), size, finish, price: demoPrice(i, j), stock: demo ? 10 : 0, active: true,
})));
if ((await Product.countDocuments()) === 0) {
  await Product.create([
    { name: 'Custom Photo Frame', shortDescription: 'Made to display your favourite photograph.', description: 'A custom photo frame crafted to your chosen size and finish. Send us your photograph and we will print and frame it for you.', category: frameCat._id, features: ['Four popular sizes', 'Oak, Acrylic or Metal finish', 'Printing included on request'], variants: matrix(SIZES, FINISHES, 'CPF'), featured: true, order: 0 },
    { name: 'Wall Collage Frame', shortDescription: 'Bring several memories together on one wall.', description: 'A multi-photo wall collage frame to tell a bigger story. Share your photographs and we will arrange the layout with you.', category: frameCat._id, features: ['Multi-photo layout', 'Layout assistance', 'Ready to hang'], variants: matrix(['12x16', '16x20', '20x30'], FINISHES, 'WCF'), featured: true, order: 1 },
    { name: 'Heart Plaque', shortDescription: 'A heartfelt keepsake for someone special.', description: 'A heart-shaped photo plaque, a thoughtful gift for anniversaries and birthdays.', category: giftCat._id, features: ['Heart shaped', 'Personalised photo print', 'Gift ready'], variants: matrix(['8x10', '12x16'], ['Oak', 'Acrylic'], 'HP'), featured: true, order: 2 },
    { name: 'LED Photo Lamp', shortDescription: 'Your photograph, softly lit.', description: 'A photo lamp that glows softly behind your chosen image, ideal for bedside tables and gifts.', category: giftCat._id, features: ['LED backlight', 'Personalised photo', 'Gift ready'], variants: matrix(['8x10'], ['Acrylic', 'Oak'], 'LPL'), featured: true, order: 3 },
  ]);
  console.log(`✓ Added 4 products${demo ? ' with SAMPLE prices & stock (replace in Admin → Products)' : ' – prices are 0 ("price on request") until you set them in Admin → Products'}`);
} else if (demo) console.log('• Products already exist – demo prices not applied. Edit prices in Admin → Products.');

// ---------- built-in media (your supplied camera video + stills) so they appear in Video Management / Media Library ----------
const BUILTIN = [
  { type: 'video', title: 'Hero – camera reveal (desktop)', url: '/videos/hero.mp4', poster: '/images/hero-poster.jpg', purpose: 'hero', publicId: 'videos/hero.mp4', mime: 'video/mp4' },
  { type: 'video', title: 'Hero – camera reveal (mobile)', url: '/videos/hero-mobile.mp4', poster: '/images/hero-poster-mobile.jpg', purpose: 'hero', publicId: 'videos/hero-mobile.mp4', mime: 'video/mp4' },
  { type: 'video', title: 'Camera commercial – original', url: '/videos/Camera_commercial_video_rotation_cae5961b.mp4', poster: '/images/hero-poster.jpg', purpose: 'promo', publicId: 'videos/Camera_commercial_video_rotation_cae5961b.mp4', mime: 'video/mp4' },
  { type: 'image', title: 'Hero poster', url: '/images/hero-poster.jpg', publicId: 'images/hero-poster.jpg', mime: 'image/jpeg', width: 1280, height: 720 },
  { type: 'image', title: 'Hero poster (mobile)', url: '/images/hero-poster-mobile.jpg', publicId: 'images/hero-poster-mobile.jpg', mime: 'image/jpeg', width: 854, height: 480 },
  { type: 'image', title: 'Studio camera – warm', url: '/images/studio-camera-warm.jpg', publicId: 'images/studio-camera-warm.jpg', mime: 'image/jpeg', width: 1280, height: 720 },
  { type: 'image', title: 'Studio camera – sage', url: '/images/studio-camera-sage.jpg', publicId: 'images/studio-camera-sage.jpg', mime: 'image/jpeg', width: 1280, height: 720 },
  { type: 'image', title: 'Lens aperture close-up', url: '/images/studio-lens-aperture.jpg', publicId: 'images/studio-lens-aperture.jpg', mime: 'image/jpeg', width: 1280, height: 720 },
];
for (const m of BUILTIN) {
  if (!(await Media.exists({ url: m.url }))) await Media.create({ ...m, provider: 'static', folder: 'built-in', alt: m.title });
}
console.log('✓ Built-in video and images registered in the media library');

console.log('\nSeed complete. Next: npm run dev  →  http://localhost:5173  (admin: /admin/login)');
await disconnectDB();
