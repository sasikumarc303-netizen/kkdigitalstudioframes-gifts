export const SEO_ORIGIN = 'https://kkdigitalstudioframes.com';

export const SITEMAP_ROUTES = [
  ['/', 1.0],
  ['/about', 0.7],
  ['/services', 0.9],
  ['/portfolio', 0.9],
  ['/packages', 0.8],
  ['/photo-frames', 0.8],
  ['/booking', 0.9],
  ['/contact', 0.8],
];

export const PUBLIC_API_ROUTES = [
  '/api/site',
  '/api/home',
  '/api/services',
  '/api/packages',
  '/api/testimonials',
  '/api/categories',
  '/api/gallery',
  '/api/products',
];

export const PRIVATE_CRAWL_ROUTES = [
  '/admin',
  '/cart',
  '/checkout',
  '/orders',
  '/api/admin',
  '/api/cart',
  '/api/orders',
  '/api/bookings',
  '/api/enquiries',
];

export function createRobotsTxt(customRobots = '') {
  const customLines = String(customRobots)
    .split(/\r?\n/)
    .filter((line) => !/^\s*sitemap\s*:/i.test(line))
    .filter((line) => !/^\s*disallow\s*:\s*\/api(?:\/.*)?\s*$/i.test(line))
    .filter((line) => line.trim());
  const rules = [
    ...customLines,
    'User-agent: *',
    'Allow: /',
    ...PRIVATE_CRAWL_ROUTES.map((route) => `Disallow: ${route}`),
    ...PUBLIC_API_ROUTES.map((route) => `Allow: ${route}`),
    '',
    `Sitemap: ${SEO_ORIGIN}/sitemap.xml`,
  ];
  return `${rules.join('\n')}\n`;
}

export const SITE_TITLE = 'KK Digital Studio | Photography, Custom Gifts & Photo Frames';
export const SITE_DESCRIPTION =
  'KK Digital Studio offers professional photography, customized gifts, personalized photo frames and studio services. Explore our portfolio and book your photography session.';

export const SEO_PAGES = {
  '/': {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  '/about': {
    title: 'About KK Digital Studio | Photography & Custom Gifts',
    description:
      'Get to know KK Digital Studio, our photography approach, and the people behind our custom gifts and personalized photo frames.',
  },
  '/services': {
    title: 'Photography Services | KK Digital Studio',
    description:
      'Explore photography, studio and print services from KK Digital Studio. Find the right service for your occasion and enquire or book a session.',
  },
  '/portfolio': {
    title: 'Photography Portfolio | KK Digital Studio',
    description:
      'Explore the KK Digital Studio photography portfolio, featuring photographs from studio sessions, celebrations and events.',
  },
  '/packages': {
    title: 'Photography Packages | KK Digital Studio',
    description:
      'Compare photography packages from KK Digital Studio and get in touch to plan a session for your needs.',
  },
  '/photo-frames': {
    title: 'Custom Gifts & Photo Frames | KK Digital Studio',
    description:
      'Discover customized gifts and personalized photo frames from KK Digital Studio. Explore the collection and enquire about an order.',
  },
  '/booking': {
    title: 'Book a Photography Session | KK Digital Studio',
    description:
      'Request a photography session with KK Digital Studio. Share your preferred date and occasion, and the studio will confirm with you.',
  },
  '/contact': {
    title: 'Contact KK Digital Studio',
    description:
      'Contact KK Digital Studio with questions about photography services, customized gifts, personalized photo frames or bookings.',
  },
};
