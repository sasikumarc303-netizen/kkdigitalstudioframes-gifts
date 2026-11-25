import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as c from '../controllers/public.js';
import * as payments from '../controllers/payments.js';
import { honeypot } from '../middleware/validate.js';
import { orderLookupLimit } from '../middleware/orderLookupLimit.js';
import * as media from '../controllers/media.js';

const limiter = (windowMin, max, message) =>
  rateLimit({ windowMs: windowMin * 60 * 1000, max, standardHeaders: true, legacyHeaders: false, message: { message } });

const formLimit = limiter(60, 20, 'Too many submissions. Please try again in a little while.');
const lookupLimit = limiter(15, 60, 'Too many lookups. Please try again shortly.');
const trackingLimit = limiter(15, 10, 'Too many tracking attempts. Please try again later.');
const paymentLimit = limiter(15, 30, 'Too many payment attempts. Please wait a moment and try again.');

const r = Router();

r.head('/media/previews/b2', media.backblazePreviewHead);
r.get('/media/previews/b2', media.backblazePreview);
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
r.post('/payments/razorpay/orders', paymentLimit, payments.createOrder);
r.post('/payments/razorpay/verify', paymentLimit, payments.verify);
r.post('/payments/razorpay/status', paymentLimit, payments.status);
r.post('/orders/lookup', orderLookupLimit, c.lookupOrders);
r.post('/orders/track', trackingLimit, c.trackOrder);

r.post('/bookings', formLimit, honeypot, c.createBooking);
r.post('/bookings/lookup', lookupLimit, c.lookupBooking);
r.post('/bookings/cancel', formLimit, c.cancelBooking);
r.post('/bookings/reschedule', formLimit, c.requestReschedule);

r.post('/enquiries', formLimit, honeypot, c.createEnquiry);

export default r;
