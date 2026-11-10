// Every manageable area of the admin panel. A user's `permissions` array contains these keys.
export const MODULES = [
  'dashboard', 'homepage', 'videos', 'gallery', 'services', 'packages', 'products', 'categories',
  'orders', 'bookings', 'customers', 'enquiries', 'testimonials', 'contact', 'navigation',
  'settings', 'seo', 'media', 'users', 'logs',
];

export const ROLES = ['superadmin', 'admin', 'editor', 'staff'];

const CONTENT = ['homepage', 'videos', 'gallery', 'services', 'packages', 'categories', 'testimonials', 'contact', 'navigation', 'seo', 'media'];
const OPERATIONS = ['products', 'orders', 'bookings', 'customers', 'enquiries'];

// Default permission sets when an account is created with a role. Superadmin always has everything.
export const ROLE_DEFAULTS = {
  superadmin: [...MODULES],
  admin: MODULES.filter((m) => m !== 'users'),
  editor: ['dashboard', ...CONTENT],
  staff: ['dashboard', ...OPERATIONS],
};

export const BOOKING_STATUSES = ['Pending', 'Confirmed', 'Rejected', 'Completed', 'Cancelled'];
export const ORDER_STATUSES = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
export const ENQUIRY_STATUSES = ['New', 'In Progress', 'Resolved', 'Closed'];
export const PAYMENT_STATUSES = ['Unpaid', 'Paid', 'Refunded'];
