import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSite } from '../context/SiteContext.jsx';
import { SEO_ORIGIN } from '../../../seo.mjs';

function setMeta(selector, attrs) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement(attrs.tag || 'meta');
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => k !== 'tag' && el.setAttribute(k, v));
  return el;
}

const abs = (u) => (!u ? '' : /^https?:/i.test(u) ? u : `${window.location.origin}${u.startsWith('/') ? '' : '/'}${u}`);

const PAGE_FALLBACKS = {
  '/': {
    title: '{brand} | Photography, Custom Gifts & Photo Frames',
    description: 'KK Digital Studio offers professional photography, customized gifts, personalized photo frames and studio services. Explore our portfolio and book your photography session.',
  },
  '/about': {
    title: 'About {brand} | Photography Studio in Tirupathur',
    description: 'Learn about KK Digital Studio, a photography studio in Tirupathur, and our personal approach to capturing your moments.',
  },
  '/services': {
    title: 'Photography Services | {brand}',
    description: 'From milestone celebrations to everyday portraits, printing and framing, explore the photography services offered by KK Digital Studio.',
  },
  '/portfolio': {
    title: 'Photography Portfolio | {brand}',
    description: 'Explore selected photography work and stories captured by KK Digital Studio.',
  },
  '/packages': {
    title: 'Photography Packages | {brand}',
    description: 'Explore photography package options and contact KK Digital Studio to tailor a session to your occasion, people and budget.',
  },
  '/photo-frames': {
    title: 'Photo Frames & Keepsakes | {brand}',
    description: 'Explore photo frame sizes and finishes, or ask KK Digital Studio to print and frame your photograph.',
  },
  '/booking': {
    title: 'Book a Photography Session | {brand}',
    description: 'Share your details and preferred date to request a photography session with KK Digital Studio.',
  },
  '/contact': {
    title: 'Contact {brand} | Tirupathur',
    description: 'Contact KK Digital Studio in Tirupathur with questions about a photography session, print or frame.',
  },
};

/**
 * Per-page SEO. Values come from the admin panel (Settings → SEO) keyed by route, and can be overridden by props
 * (used for product pages). The server also injects the same tags into the HTML for crawlers.
 */
export default function Seo({ title, description, image, noindex = false }) {
  const { config } = useSite();
  const { pathname } = useLocation();

  useEffect(() => {
    const page = config?.seo?.pages?.[pathname] || {};
    const brand = config?.general?.businessName || 'KK Digital Studio';
    const fallback = PAGE_FALLBACKS[pathname];
    const t = title || page.title || fallback?.title.replace('{brand}', brand) || brand;
    const d = description || page.description || fallback?.description || '';
    const canonical = `${SEO_ORIGIN}${pathname}`;
    const img = abs(image || page.ogImage || config?.seo?.defaultOgImage);
    document.title = t;
    setMeta('meta[name="description"]', { name: 'description', content: d });
    setMeta('meta[property="og:title"]', { property: 'og:title', content: t });
    setMeta('meta[property="og:description"]', { property: 'og:description', content: d });
    setMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
    setMeta('meta[property="og:url"]', { property: 'og:url', content: canonical });
    if (img) setMeta('meta[property="og:image"]', { property: 'og:image', content: img });
    setMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    setMeta('link[rel="canonical"]', { tag: 'link', rel: 'canonical', href: canonical });
    const robots = document.head.querySelector('meta[name="robots"]');
    if (noindex) setMeta('meta[name="robots"]', { name: 'robots', content: 'noindex,nofollow' });
    else if (robots) robots.remove();
    const fav = config?.general?.favicon;
    if (fav) setMeta('link[rel="icon"]', { tag: 'link', rel: 'icon', href: fav }).removeAttribute('type');
  }, [config, pathname, title, description, image, noindex]);

  return null;
}
