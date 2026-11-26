export const SEO_ORIGIN = 'https://kkdigitalstudioframes.com';

export const BACKEND_ROBOTS_TXT = [
  'User-agent: *',
  'Allow: /',
  'Allow: /api/home$',
  'Allow: /api/site$',
  'Disallow: /api/',
  `Sitemap: ${SEO_ORIGIN}/sitemap.xml`,
].join('\n');

export const BUSINESS_NAME = 'KK Digital Studio Frames & Gifts';
export const BUSINESS_PHONE = '+91 97888 89966';
export const BUSINESS_ADDRESS = Object.freeze({
  '@type': 'PostalAddress',
  streetAddress: 'Achamangalam',
  addressLocality: 'Tirupattur',
  addressRegion: 'Tamil Nadu',
  postalCode: '635651',
  addressCountry: 'IN',
});

export const SITE_TITLE = 'KK Digital Studio | Photo Studio & Frames in Tirupattur';
export const SITE_DESCRIPTION =
  'Photo studio in Achamangalam, Tirupattur for portraits, weddings and events, with custom photo frames and gifts. Call KK Digital Studio to plan a visit.';

export const SEO_PAGES = {
  '/': {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  '/about': {
    title: 'About KK Digital Studio | Photography Studio in Tirupattur',
    description:
      'Meet KK Digital Studio in Achamangalam, Tirupattur, and learn about our personal approach to photography, custom photo frames and gifts.',
  },
  '/services': {
    title: 'Photography Services in Tirupattur | KK Digital Studio',
    description:
      'Explore portrait, wedding, family and event photography, plus printing and framing services from KK Digital Studio in Tirupattur.',
  },
  '/portfolio': {
    title: 'Photography Portfolio | KK Digital Studio Tirupattur',
    description:
      'Browse selected studio portraits, celebrations and event photography by KK Digital Studio in Tirupattur.',
  },
  '/packages': {
    title: 'Photography Packages in Tirupattur | KK Digital Studio',
    description:
      'Explore photography packages from KK Digital Studio in Tirupattur and contact us to plan a session for your occasion.',
  },
  '/photo-frames': {
    title: 'Photo Frames & Gifts in Tirupattur | KK Digital Studio',
    description:
      'Explore custom photo frames and personalized gifts from KK Digital Studio in Tirupattur. Contact us about available styles and orders.',
  },
  '/booking': {
    title: 'Book a Photography Session | KK Digital Studio Tirupattur',
    description:
      'Request a photography session with KK Digital Studio in Tirupattur. Share your preferred date and occasion for personal confirmation.',
  },
  '/contact': {
    title: 'Contact & Location | KK Digital Studio Tirupattur',
    description:
      'Visit KK Digital Studio in Achamangalam, Tirupattur, Tamil Nadu 635651. Call, WhatsApp or contact us about a session, print or frame.',
  },
};

export function createLocalBusinessJsonLd({
  name = BUSINESS_NAME,
  phone = BUSINESS_PHONE,
  description = SITE_DESCRIPTION,
  mapUrl = '',
  logo = '',
  image = '',
  sameAs = [],
} = {}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SEO_ORIGIN}/#localbusiness`,
    name,
    url: `${SEO_ORIGIN}/`,
    description,
    address: BUSINESS_ADDRESS,
    ...(phone ? { telephone: phone } : {}),
    ...(mapUrl ? { hasMap: mapUrl } : {}),
    ...(logo ? { logo } : {}),
    ...(image ? { image } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}
