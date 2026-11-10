import { useState } from 'react';
import { Stars } from '../../components/States.jsx';
import { money } from '../../services/format.js';
import { useAsync } from '../../hooks/useAsync.js';
import { api } from '../../services/api.js';
import ResourceManager, { PublishedBadge } from '../components/ResourceManager.jsx';
import { Badge, Chips } from '../components/ui.jsx';

const clip = (s = '', n = 70) => (s.length > n ? `${s.slice(0, n)}…` : s);

export function Services() {
  return (
    <ResourceManager
      title="Services" singular="Service" endpoint="/admin/services"
      subtitle="The photography services shown on the Services page and the homepage. Services also appear in the booking form."
      thumb={(i) => i.image}
      columns={[
        { label: 'Service', cell: (i) => <><strong>{i.title}</strong><small className="a-sub">{clip(i.tagline)}</small></> },
        { label: 'Starting price', cell: (i) => i.startingPrice || <span className="a-muted">On request</span> },
        { label: 'Order', cell: (i) => i.order },
        { label: 'Status', cell: (i) => <PublishedBadge on={i.published} /> },
      ]}
      blank={{ title: '', tagline: '', description: '', features: [], image: '', startingPrice: '', order: 0, published: true }}
      fields={[
        { key: 'title', label: 'Title', required: true, max: 120 },
        { key: 'startingPrice', label: 'Starting price (text)', max: 60, hint: 'Optional, e.g. “From ₹…”. Leave empty to show “Contact us for pricing”.' },
        { key: 'tagline', label: 'Short tagline', max: 160, wide: true },
        { key: 'description', label: 'Description', type: 'textarea', max: 2000 },
        { key: 'features', label: 'Highlights', type: 'strings', placeholder: 'e.g. Edited high-resolution photos' },
        { key: 'image', label: 'Image', type: 'image', folder: 'services' },
        { key: 'order', label: 'Display order', type: 'number', hint: 'Lower numbers appear first' },
        { key: 'published', label: 'Show on website', type: 'switch' },
      ]}
    />
  );
}

export function Packages() {
  return (
    <ResourceManager
      title="Packages" singular="Package" endpoint="/admin/packages"
      subtitle="Photography packages. Leave the price at 0 to display “Contact for pricing”."
      thumb={(i) => i.image}
      columns={[
        { label: 'Package', cell: (i) => <><strong>{i.name}</strong>{i.popular && <Badge tone="info">Most popular</Badge>}<small className="a-sub">{clip(i.tagline)}</small></> },
        { label: 'Price', cell: (i) => (i.price > 0 ? `${money(i.price)} ${i.priceNote || ''}` : <span className="a-muted">Contact for pricing</span>) },
        { label: 'Order', cell: (i) => i.order },
        { label: 'Status', cell: (i) => <PublishedBadge on={i.published} /> },
      ]}
      blank={{ name: '', tagline: '', price: 0, priceNote: '', features: [], image: '', popular: false, order: 0, published: true }}
      fields={[
        { key: 'name', label: 'Package name', required: true, max: 120 },
        { key: 'price', label: 'Price (₹)', type: 'number', hint: '0 = “Contact for pricing”' },
        { key: 'priceNote', label: 'Price note', max: 80, hint: 'e.g. “per session”' },
        { key: 'tagline', label: 'Short description', max: 200 },
        { key: 'features', label: 'What is included', type: 'strings', placeholder: 'e.g. 2 hours coverage' },
        { key: 'image', label: 'Image', type: 'image', folder: 'packages' },
        { key: 'order', label: 'Display order', type: 'number' },
        { key: 'popular', label: 'Mark as “Most popular”', type: 'switch' },
        { key: 'published', label: 'Show on website', type: 'switch' },
      ]}
    />
  );
}

export function Categories() {
  const [type, setType] = useState('');
  return (
    <ResourceManager
      title="Categories" singular="Category" endpoint="/admin/categories" filters={{ type }}
      subtitle="Gallery categories power the portfolio filter. Product categories group your photo-frame products."
      extraToolbar={<Chips value={type} onChange={setType} options={[{ value: '', label: 'All' }, { value: 'gallery', label: 'Gallery' }, { value: 'product', label: 'Products' }]} />}
      columns={[
        { label: 'Name', cell: (i) => <><strong>{i.name}</strong><small className="a-sub">{clip(i.description)}</small></> },
        { label: 'Used for', cell: (i) => <Badge tone="info">{i.type === 'product' ? 'Products' : 'Gallery'}</Badge> },
        { label: 'Order', cell: (i) => i.order },
        { label: 'Status', cell: (i) => <PublishedBadge on={i.published} /> },
      ]}
      blank={{ name: '', type: type || 'gallery', description: '', order: 0, published: true }}
      fields={[
        { key: 'name', label: 'Name', required: true, max: 80 },
        { key: 'type', label: 'Used for', type: 'select', options: [{ value: 'gallery', label: 'Gallery / portfolio' }, { value: 'product', label: 'Products' }] },
        { key: 'description', label: 'Description', type: 'textarea', rows: 3, max: 400 },
        { key: 'order', label: 'Display order', type: 'number' },
        { key: 'published', label: 'Show on website', type: 'switch' },
      ]}
    />
  );
}

export function Testimonials() {
  return (
    <ResourceManager
      title="Testimonials" singular="Testimonial" endpoint="/admin/testimonials"
      subtitle="Only add genuine feedback from real clients. Testimonials stay hidden until you publish them, and the section is hidden on the website while none are published."
      thumb={(i) => i.avatar}
      columns={[
        { label: 'Client', cell: (i) => <><strong>{i.name}</strong><small className="a-sub">{i.role}</small></> },
        { label: 'Rating', cell: (i) => <Stars value={i.rating} size={14} /> },
        { label: 'Feedback', cell: (i) => clip(i.text, 90) },
        { label: 'Status', cell: (i) => <PublishedBadge on={i.published} /> },
      ]}
      blank={{ name: '', role: '', rating: 5, text: '', avatar: '', order: 0, published: false }}
      fields={[
        { key: 'name', label: 'Client name', required: true, max: 80 },
        { key: 'role', label: 'Occasion / location', max: 100, hint: 'e.g. Wedding client, Tirupathur' },
        { key: 'rating', label: 'Rating', type: 'select', options: [5, 4, 3, 2, 1].map((n) => ({ value: n, label: `${n} star${n > 1 ? 's' : ''}` })) },
        { key: 'order', label: 'Display order', type: 'number' },
        { key: 'text', label: 'Feedback', type: 'textarea', max: 1200 },
        { key: 'avatar', label: 'Photo (optional)', type: 'image', folder: 'testimonials' },
        { key: 'published', label: 'Show on website', type: 'switch' },
      ]}
      toPayload={(f) => ({ ...f, rating: Number(f.rating) || 5 })}
    />
  );
}

// small helper hook other modules reuse
export function useCategories(type) {
  const { data } = useAsync(() => api.get(`/admin/categories?type=${type}&limit=200`), [type]);
  return data?.items || [];
}
