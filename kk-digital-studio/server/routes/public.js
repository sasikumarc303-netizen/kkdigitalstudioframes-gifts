import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as c from '../controllers/public.js';
import { honeypot } from '../middleware/validate.js';

const limiter = (windowMin, max, message) =>
  rateLimit({ windowMs: windowMin * 60 * 1000, max, standardHeaders: true, legacyHeaders: false, message: { message } });

const formLimit = limiter(60, 20, 'Too many submissions. Please try again in a little while.');
const lookupLimit = limiter(15, 60, 'Too many lookups. Please try again shortly.');

const r = Router();

r.get('/site', c.site);
r.get('/home', c.home);
r.get('/services', c.listServices);
r.get('/packages', c.listPackages);
r.get('/testimonials', c.listTestimonials);
r.get('/categories', c.listCategories);
r.get('/gallery', c.listGallery);
r.get('/products', c.listProducts);
r.get('/products/:idOrSlug', c.getProduct);

r.post('/cart/price', lookupLimit, c.cartPrice);
r.post('/orders', formLimit, honeypot, c.createOrder);
r.post('/orders/lookup', lookupLimit, c.lookupOrders);

r.post('/bookings', formLimit, honeypot, c.createBooking);
r.post('/bookings/lookup', lookupLimit, c.lookupBooking);
r.post('/bookings/cancel', formLimit, c.cancelBooking);
r.post('/bookings/reschedule', formLimit, c.requestReschedule);

r.post('/enquiries', formLimit, honeypot, c.createEnquiry);

export default r;
