import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSite } from '../context/SiteContext.jsx';
import { SEO_ORIGIN, SEO_PAGES, SITE_DESCRIPTION } from '../../../seo.mjs';

function setMeta(selector, attrs) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement(attrs.tag || 'meta');
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => k !== 'tag' && el.setAttribute(k, v));
  return el;
}

const abs = (u) => (!u ? '' : /^https?:/i.test(u) ? u : `${SEO_ORIGIN}${u.startsWith('/') ? '' : '/'}${u}`);

/**
 * Per-page SEO. Values come from the admin panel (Settings → SEO) keyed by route, and can be overridden by props
 * (used for product pages). The server also injects the same tags into the HTML for crawlers.
 */
export default function Seo({ title, description, image, noindex = false }) {
  const { config } = useSite();
  const { pathname } = useLocation();

  useEffect(() => {
    const defaults = SEO_PAGES[pathname] || {};
    const page = config?.seo?.pages?.[pathname] || defaults;
    const t = title || page.title || config?.general?.businessName || SEO_PAGES['/'].title;
    const d = description || page.description || defaults.description || SITE_DESCRIPTION;
    const img = abs(image || page.ogImage || config?.seo?.defaultOgImage);
    const canonical = `${SEO_ORIGIN}${pathname === '/' ? '/' : pathname.replace(/\/+$/, '')}`;
    document.title = t;
    setMeta('meta[name="description"]', { name: 'description', content: d });
    setMeta('meta[property="og:title"]', { property: 'og:title', content: t });
    setMeta('meta[property="og:description"]', { property: 'og:description', content: d });
    setMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
    setMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: 'KK Digital Studio' });
    setMeta('meta[property="og:url"]', { property: 'og:url', content: canonical });
    if (img) setMeta('meta[property="og:image"]', { property: 'og:image', content: img });
    else document.head.querySelector('meta[property="og:image"]')?.remove();
    setMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    setMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: t });
    setMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: d });
    if (img) setMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: img });
    else document.head.querySelector('meta[name="twitter:image"]')?.remove();
    setMeta('link[rel="canonical"]', { tag: 'link', rel: 'canonical', href: canonical });
    const robots = document.head.querySelector('meta[name="robots"]');
    if (noindex) setMeta('meta[name="robots"]', { name: 'robots', content: 'noindex,nofollow' });
    else if (robots) robots.remove();
    const fav = config?.general?.favicon;
    if (fav) setMeta('link[rel="icon"]', { tag: 'link', rel: 'icon', href: fav }).removeAttribute('type');
    const structuredData = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          name: 'KK Digital Studio',
          url: `${SEO_ORIGIN}/`,
          description: SITE_DESCRIPTION,
        },
        {
          '@type': 'Organization',
          name: 'KK Digital Studio',
          url: `${SEO_ORIGIN}/`,
          ...(config?.general?.logo ? { logo: abs(config.general.logo) } : {}),
        },
      ],
    };
    let structuredDataTag = document.head.querySelector('#kk-structured-data');
    if (!structuredDataTag) {
      structuredDataTag = document.createElement('script');
      structuredDataTag.id = 'kk-structured-data';
      structuredDataTag.type = 'application/ld+json';
      document.head.appendChild(structuredDataTag);
    }
    structuredDataTag.textContent = JSON.stringify(structuredData);
  }, [config, pathname, title, description, image, noindex]);

  return null;
}
