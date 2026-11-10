import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, requirePermission, csrfGuard } from '../middleware/auth.js';
import { upload, uploadImagesOnly } from '../middleware/upload.js';
import * as auth from '../controllers/auth.js';
import * as content from '../controllers/content.js';
import * as bookings from '../controllers/bookings.js';
import * as orders from '../controllers/orders.js';
import * as enquiries from '../controllers/enquiries.js';
import * as customers from '../controllers/customers.js';
import * as users from '../controllers/users.js';
import * as logs from '../controllers/logs.js';
import * as media from '../controllers/media.js';
import * as config from '../controllers/config.js';
import * as dashboard from '../controllers/dashboard.js';

const r = Router();
r.use(csrfGuard);

// ---- authentication (public endpoints, rate limited) ----
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many attempts. Please wait a few minutes.' } });
const resetLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many attempts. Please try again later.' } });
r.post('/auth/login', loginLimiter, auth.login);
r.post('/auth/logout', auth.logout);
r.post('/auth/forgot', resetLimiter, auth.forgotPassword);
r.post('/auth/reset', resetLimiter, auth.resetPassword);

// ---- everything below requires a valid session ----
r.use(requireAuth);
r.get('/auth/me', auth.me);
r.post('/auth/change-password', auth.changePassword);

r.get('/config', config.getAll);
r.put('/config/:group', config.saveGroup); // permission is checked per group inside the controller

r.get('/dashboard', requirePermission('dashboard'), dashboard.stats);

/** Mounts list/get/create/update/delete (+ bulk) for a resource behind a permission. */
function resource(path, perm, h, { bulk = true } = {}) {
  const p = requirePermission(perm);
  r.get(path, p, h.list);
  if (bulk && h.bulk) r.post(`${path}/bulk`, p, h.bulk);
  r.get(`${path}/:id`, p, h.get);
  r.post(path, p, h.create);
  r.put(`${path}/:id`, p, h.update);
  r.delete(`${path}/:id`, p, h.remove);
}

resource('/services', 'services', content.services);
resource('/packages', 'packages', content.packages);
resource('/categories', 'categories', content.categories);
resource('/testimonials', 'testimonials', content.testimonials);
resource('/products', 'products', content.products);

// gallery: multi-upload must be registered before the generic /:id routes
r.post('/gallery/upload', requirePermission('gallery'), uploadImagesOnly.array('files', 30), content.gallery.bulkUpload);
resource('/gallery', 'gallery', content.gallery);

// bookings
r.get('/bookings', requirePermission('bookings'), bookings.list);
r.get('/bookings/:id', requirePermission('bookings'), bookings.get);
r.patch('/bookings/:id/status', requirePermission('bookings'), bookings.setStatus);
r.post('/bookings/:id/reschedule', requirePermission('bookings'), bookings.reschedule);
r.put('/bookings/:id', requirePermission('bookings'), bookings.update);
r.delete('/bookings/:id', requirePermission('bookings'), bookings.remove);

// orders
r.get('/orders', requirePermission('orders'), orders.list);
r.get('/orders/:id', requirePermission('orders'), orders.get);
r.patch('/orders/:id/status', requirePermission('orders'), orders.setStatus);
r.put('/orders/:id', requirePermission('orders'), orders.update);
r.delete('/orders/:id', requirePermission('orders'), orders.remove);

// enquiries
r.get('/enquiries', requirePermission('enquiries'), enquiries.list);
r.get('/enquiries/:id', requirePermission('enquiries'), enquiries.get);
r.patch('/enquiries/:id/status', requirePermission('enquiries'), enquiries.setStatus);
r.post('/enquiries/:id/notes', requirePermission('enquiries'), enquiries.addNote);
r.delete('/enquiries/:id', requirePermission('enquiries'), enquiries.remove);

// customers
r.get('/customers', requirePermission('customers'), customers.list);
r.get('/customers/:id', requirePermission('customers'), customers.get);
r.put('/customers/:id', requirePermission('customers'), customers.update);
r.delete('/customers/:id', requirePermission('customers'), customers.remove);

// media library + videos (both use the same store; permission differs by area)
r.get('/media', requirePermission('media', 'videos', 'gallery', 'homepage', 'services', 'packages', 'products', 'testimonials', 'settings', 'seo'), media.list);
r.post('/media', requirePermission('media', 'videos', 'homepage', 'products', 'services', 'packages', 'testimonials', 'settings', 'seo', 'gallery'), upload.array('files', 20), media.upload);
r.put('/media/:id', requirePermission('media', 'videos'), media.update);
r.post('/media/:id/replace', requirePermission('media', 'videos'), upload.array('files', 1), media.replace);
r.post('/media/:id/set-hero', requirePermission('videos', 'homepage'), media.setHero);
r.delete('/media/:id', requirePermission('media', 'videos'), media.remove);

// admin users & logs
r.get('/users', requirePermission('users'), users.list);
r.post('/users', requirePermission('users'), users.create);
r.put('/users/:id', requirePermission('users'), users.update);
r.delete('/users/:id', requirePermission('users'), users.remove);
r.get('/logs', requirePermission('logs'), logs.list);

export default r;
