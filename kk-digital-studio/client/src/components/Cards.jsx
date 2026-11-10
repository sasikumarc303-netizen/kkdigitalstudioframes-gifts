import { Link } from 'react-router-dom';
import Img from './Img.jsx';
import Icon from './Icon.jsx';
import Reveal from './Reveal.jsx';
import { Btn } from './Buttons.jsx';
import { useSite } from '../context/SiteContext.jsx';

const SERVICE_ICONS = [
  ['wedding', 'heart'], ['pre-wedding', 'heart'], ['birthday', 'gift'], ['family', 'users'], ['passport', 'id'], ['product', 'tag'],
  ['event', 'calendar'], ['headshot', 'id'], ['printing', 'image'], ['framing', 'frame'], ['school', 'school'], ['album', 'book'],
];
export const serviceIcon = (title = '') => {
  const t = title.toLowerCase();
  return SERVICE_ICONS.find(([k]) => t.includes(k))?.[1] || 'camera';
};

export function ServiceCard({ service, delay = 0 }) {
  return (
    <Reveal delay={delay} className="card service-card">
      <Link to={`/booking?service=${service.id}`} className="service-card__media" aria-label={`Book ${service.title}`}>
        <Img src={service.image} alt={service.image ? service.title : ''} ratio="4/5" width={640} icon={serviceIcon(service.title)} label={service.title} />
      </Link>
      <div className="service-card__body">
        <h3>{service.title}</h3>
        {service.tagline && <p className="service-card__tag">{service.tagline}</p>}
        <Link to="/services" className="link-arrow">Details <Icon name="arrow" size={16} /></Link>
      </div>
    </Reveal>
  );
}

export function ProductCard({ product, delay = 0 }) {
  const { money } = useSite();
  const to = `/photo-frames/${product.slug || product.id}`;
  return (
    <Reveal delay={delay} className="card product-card">
      <Link to={to} className="product-card__media" aria-label={product.name}>
        <Img src={product.images?.[0]} alt={product.images?.[0] ? product.name : ''} ratio="1/1" width={640} icon="frame" label={product.name} />
        {product.hasPrice && !product.inStock && <span className="chip chip--muted product-card__flag">Out of stock</span>}
      </Link>
      <div className="product-card__body">
        {product.category?.name && <p className="eyebrow eyebrow--sm">{product.category.name}</p>}
        <h3><Link to={to}>{product.name}</Link></h3>
        <p className="product-card__price">{product.hasPrice ? <>From <strong>{money(product.fromPrice)}</strong></> : <span className="muted">Price on request</span>}</p>
        {(product.sizes?.length > 0 || product.finishes?.length > 0) && (
          <p className="product-card__meta">{[product.sizes?.length ? `${product.sizes.length} sizes` : '', product.finishes?.length ? product.finishes.join(' · ') : ''].filter(Boolean).join(' — ')}</p>
        )}
      </div>
    </Reveal>
  );
}

export function PackageCard({ pkg, delay = 0 }) {
  const { money } = useSite();
  return (
    <Reveal delay={delay} className={`card package-card ${pkg.popular ? 'is-popular' : ''}`}>
      {pkg.popular && <span className="package-card__flag">Most popular</span>}
      {pkg.image && <Img src={pkg.image} alt="" ratio="16/9" width={640} className="package-card__img" />}
      <h3>{pkg.name}</h3>
      {pkg.tagline && <p className="package-card__tag">{pkg.tagline}</p>}
      <p className="package-card__price">
        {pkg.price > 0 ? <><strong>{money(pkg.price)}</strong>{pkg.priceNote && <small> {pkg.priceNote}</small>}</> : <span>Contact for pricing</span>}
      </p>
      <ul className="ticks">
        {pkg.features.map((f) => <li key={f}><Icon name="check" size={16} />{f}</li>)}
      </ul>
      <Btn to={`/booking?package=${encodeURIComponent(pkg.name)}`} variant={pkg.popular ? 'primary' : 'outline'} block>Book this package</Btn>
    </Reveal>
  );
}

export function TestimonialCard({ t, delay = 0 }) {
  return (
    <Reveal delay={delay} className="card testimonial">
      <Icon name="quote" size={28} stroke={1.2} className="testimonial__icon" />
      <blockquote>{t.text}</blockquote>
      <footer>
        {t.avatar && <Img src={t.avatar} alt="" ratio="1/1" width={96} className="testimonial__avatar" />}
        <div>
          <strong>{t.name}</strong>
          {t.role && <span>{t.role}</span>}
        </div>
      </footer>
    </Reveal>
  );
}
