import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSite } from '../context/SiteContext.jsx';

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

/**
 * Per-page SEO. Values come from the admin panel (Settings → SEO) keyed by route, and can be overridden by props
 * (used for product pages). The server also injects the same tags into the HTML for crawlers.
 */
export default function Seo({ title, description, image, noindex = false }) {
  const { config } = useSite();
  const { pathname } = useLocation();

  useEffect(() => {
    const page = config?.seo?.pages?.[pathname] || {};
    const t = title || page.title || config?.general?.businessName || 'KK Digital Studio';
    const d = description || page.description || '';
    const img = abs(image || page.ogImage || config?.seo?.defaultOgImage);
    document.title = t;
    setMeta('meta[name="description"]', { name: 'description', content: d });
    setMeta('meta[property="og:title"]', { property: 'og:title', content: t });
    setMeta('meta[property="og:description"]', { property: 'og:description', content: d });
    setMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
    setMeta('meta[property="og:url"]', { property: 'og:url', content: `${window.location.origin}${pathname}` });
    if (img) setMeta('meta[property="og:image"]', { property: 'og:image', content: img });
    setMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    setMeta('link[rel="canonical"]', { tag: 'link', rel: 'canonical', href: `${window.location.origin}${pathname}` });
    const robots = document.head.querySelector('meta[name="robots"]');
    if (noindex) setMeta('meta[name="robots"]', { name: 'robots', content: 'noindex,nofollow' });
    else if (robots) robots.remove();
    const fav = config?.general?.favicon;
    if (fav) setMeta('link[rel="icon"]', { tag: 'link', rel: 'icon', href: fav }).removeAttribute('type');
  }, [config, pathname, title, description, image, noindex]);

  return null;
}
