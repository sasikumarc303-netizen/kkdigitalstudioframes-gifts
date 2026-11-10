// Quick environment sanity check: npm --prefix server run check
import { env } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import AdminUser from '../models/AdminUser.js';
import Service from '../models/Service.js';
import Product from '../models/Product.js';

console.log('Media storage :', env.cloudinaryEnabled ? 'Cloudinary' : 'local disk');
console.log('SMTP          :', env.smtpEnabled ? 'configured' : 'not configured (password-reset emails are logged to the console in dev)');
await connectDB();
console.log('Admin users   :', await AdminUser.countDocuments());
console.log('Services      :', await Service.countDocuments());
console.log('Products      :', await Product.countDocuments());
await disconnectDB();
