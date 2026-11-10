// Usage:  ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='StrongPass123' npm run create-admin
// Creates a superadmin, or resets the password of an existing account with that e-mail.
import { env } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import AdminUser from '../models/AdminUser.js';
import { MODULES } from '../config/constants.js';
import { PASSWORD_RULE, PASSWORD_MESSAGE } from '../middleware/validate.js';

const { email, password, name } = env.seedAdmin;
if (!email || !password) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (in .env or inline) before running this script.');
  process.exit(1);
}
if (!PASSWORD_RULE(password)) {
  console.error(PASSWORD_MESSAGE);
  process.exit(1);
}

await connectDB();
const hash = await AdminUser.hashPassword(password);
let user = await AdminUser.findOne({ email });
if (user) {
  user.passwordHash = hash;
  user.active = true;
  user.failedLogins = 0;
  user.lockUntil = undefined;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();
  console.log(`Updated password for existing admin ${email}`);
} else {
  user = await AdminUser.create({ name, email, passwordHash: hash, role: 'superadmin', permissions: [...MODULES] });
  console.log(`Created superadmin ${email}`);
}
await disconnectDB();
