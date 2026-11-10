import Booking from '../models/Booking.js';
import Order from '../models/Order.js';
import Enquiry from '../models/Enquiry.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import ActivityLog from '../models/ActivityLog.js';
import Service from '../models/Service.js';
import GalleryImage from '../models/GalleryImage.js';
import { asyncHandler } from '../utils/helpers.js';
import { hasPermission } from '../middleware/auth.js';

const TZ = 'Asia/Kolkata';
const IST_MS = 330 * 60000;
const istDay = (d) => new Date(d.getTime() + IST_MS).toISOString().slice(0, 10);

function lastNDays(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i -= 1) out.push(istDay(new Date(Date.now() - i * 86400000)));
  return out;
}
function lastNMonths(n) {
  const out = [];
  const now = new Date(Date.now() + IST_MS);
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
}

export const stats = asyncHandler(async (req, res) => {
  const can = (p) => hasPermission(req.user, p);
  const out = { generatedAt: new Date() };

  const tasks = [];

  if (can('bookings')) {
    tasks.push(
      (async () => {
        const days = lastNDays(30);
        const since = new Date(Date.now() - 30 * 86400000);
        const [byStatus, perDay, topServices, upcoming] = await Promise.all([
          Booking.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
          Booking.aggregate([
            { $match: { createdAt: { $gte: since } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: TZ } }, n: { $sum: 1 } } },
          ]),
          Booking.aggregate([{ $group: { _id: '$serviceTitle', n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 6 }]),
          Booking.find({ status: 'Confirmed', date: { $gte: istDay(new Date()) } }).sort({ date: 1, time: 1 }).limit(5),
        ]);
        const s = Object.fromEntries(byStatus.map((x) => [x._id, x.n]));
        const m = new Map(perDay.map((x) => [x._id, x.n]));
        out.bookings = {
          total: byStatus.reduce((a, x) => a + x.n, 0),
          pending: s.Pending || 0,
          confirmed: s.Confirmed || 0,
          byStatus: s,
          perDay: days.map((d) => ({ label: d, value: m.get(d) || 0 })),
          topServices: topServices.map((x) => ({ label: x._id, value: x.n })),
          upcoming,
        };
      })()
    );
  }

  if (can('orders')) {
    tasks.push(
      (async () => {
        const months = lastNMonths(6);
        const since = new Date(`${months[0]}-01T00:00:00+05:30`);
        const monthStart = new Date(`${istDay(new Date()).slice(0, 7)}-01T00:00:00+05:30`);
        const [byStatus, revenue, perMonth, monthRevenue] = await Promise.all([
          Order.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
          Order.aggregate([
            { $match: { status: { $ne: 'Cancelled' } } },
            { $group: { _id: null, total: { $sum: '$total' }, paid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'Paid'] }, '$total', 0] } } } },
          ]),
          Order.aggregate([
            { $match: { createdAt: { $gte: since }, status: { $ne: 'Cancelled' } } },
            { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: TZ } }, n: { $sum: 1 }, revenue: { $sum: '$total' } } },
          ]),
          Order.aggregate([{ $match: { createdAt: { $gte: monthStart }, status: { $ne: 'Cancelled' } } }, { $group: { _id: null, total: { $sum: '$total' } } }]),
        ]);
        const s = Object.fromEntries(byStatus.map((x) => [x._id, x.n]));
        const m = new Map(perMonth.map((x) => [x._id, x]));
        out.orders = {
          total: byStatus.reduce((a, x) => a + x.n, 0),
          pending: s.Pending || 0,
          byStatus: s,
          revenue: revenue[0]?.total || 0,
          revenuePaid: revenue[0]?.paid || 0,
          revenueThisMonth: monthRevenue[0]?.total || 0,
          perMonth: months.map((k) => ({ label: k, value: m.get(k)?.revenue || 0, count: m.get(k)?.n || 0 })),
        };
      })()
    );
  }

  if (can('enquiries')) {
    tasks.push(
      (async () => {
        const byStatus = await Enquiry.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]);
        const s = Object.fromEntries(byStatus.map((x) => [x._id, x.n]));
        out.enquiries = { total: byStatus.reduce((a, x) => a + x.n, 0), new: s.New || 0, byStatus: s };
      })()
    );
  }

  if (can('products')) {
    tasks.push(
      (async () => {
        const products = await Product.find({}, 'name published variants');
        let units = 0;
        const low = [];
        let outOfStock = 0;
        for (const p of products) {
          for (const v of p.variants) {
            if (!v.active) continue;
            units += v.stock;
            if (v.price > 0 && v.stock <= 0) outOfStock += 1;
            if (v.price > 0 && v.stock > 0 && v.stock <= 3) low.push({ product: p.name, variant: [v.size, v.finish].filter(Boolean).join(' · '), stock: v.stock });
          }
        }
        out.inventory = {
          products: products.length,
          published: products.filter((p) => p.published).length,
          units,
          outOfStock,
          low: low.sort((a, b) => a.stock - b.stock).slice(0, 8),
        };
      })()
    );
  }

  if (can('customers')) tasks.push(Customer.countDocuments().then((n) => { out.customers = { total: n }; }));
  if (can('services')) tasks.push(Service.countDocuments().then((n) => { out.services = { total: n }; }));
  if (can('gallery')) tasks.push(GalleryImage.countDocuments({ published: true }).then((n) => { out.gallery = { published: n }; }));

  tasks.push(ActivityLog.find().sort({ createdAt: -1 }).limit(12).then((l) => { out.recent = l; }));

  await Promise.all(tasks);
  res.json(out);
});
