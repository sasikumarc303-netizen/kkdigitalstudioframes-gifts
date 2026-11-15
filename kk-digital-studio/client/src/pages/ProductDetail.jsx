import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Img from '../components/Img.jsx';
import Icon from '../components/Icon.jsx';
import Seo from '../components/Seo.jsx';
import Reveal from '../components/Reveal.jsx';
import SectionHead from '../components/SectionHead.jsx';
import EnquiryModal from '../components/EnquiryModal.jsx';
import { Btn } from '../components/Buttons.jsx';
import { ProductCard } from '../components/Cards.jsx';
import { ErrorState, Skeleton } from '../components/States.jsx';
import { useToast } from '../components/Toast.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useCart } from '../context/CartContext.jsx';
import { useSite } from '../context/SiteContext.jsx';
import { api } from '../services/api.js';
import NotFound from './NotFound.jsx';

const same = (a, b) => (a || '') === (b || '');

export default function ProductDetail() {
  const { id } = useParams();
  const { data, loading, error, reload } = useAsync(() => api.get(`/products/${encodeURIComponent(id)}`), [id]);
  if (loading && !data) return <div className="container section"><div className="pd"><Skeleton h={520} /><Skeleton h={520} /></div></div>;
  if (error?.status === 404) return <NotFound />;
  if (error) return <div className="container section"><ErrorState error={error} onRetry={reload} /></div>;
  return <Detail key={data.product.id} product={data.product} related={data.related} />;
}

function Detail({ product, related }) {
  const { money, waLink } = useSite();
  const cart = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const [enquiry, setEnquiry] = useState(false);
  const [image, setImage] = useState(0);
  const [qty, setQty] = useState(1);

  const variants = product.variants;
  const firstBuyable = variants.find((v) => v.price > 0 && v.stock > 0) || variants[0];
  const [size, setSize] = useState(firstBuyable?.size || '');
  const [finish, setFinish] = useState(firstBuyable?.finish || '');

  const sizes = product.sizes;
  const finishesForSize = useMemo(() => [...new Set(variants.filter((v) => same(v.size, size)).map((v) => v.finish).filter(Boolean))], [variants, size]);
  const variant = variants.find((v) => same(v.size, size) && same(v.finish, finish));

  useEffect(() => {
    if (finishesForSize.length && !finishesForSize.includes(finish)) setFinish(finishesForSize[0]);
  }, [finishesForSize, finish]);

  const priced = variant && variant.price > 0;
  const inStock = variant && variant.stock > 0;
  const maxQty = Math.min(20, variant?.stock || 1);
  useEffect(() => setQty((q) => Math.max(1, Math.min(q, maxQty))), [maxQty]);

  const addToCart = () => {
    if (!priced || !inStock) return false;
    cart.add({ productId: product.id, variantId: variant.id, slug: product.slug, name: product.name, image: product.images[0] || '', size: variant.size, finish: variant.finish, price: variant.price }, qty);
    toast(`${product.name} added to your cart`);
    return true;
  };

  const choice = [size, finish].filter(Boolean).join(', ');
  const waText = `Hello, I'm interested in ${product.name}${choice ? ` (${choice})` : ''}.`;
  const images = product.images;
  const buyLabel = !priced ? 'Price on request' : !inStock ? 'Out of stock' : 'Add to cart';

  return (
    <>
      <Seo title={`${product.name} | Photo Frames`} description={product.shortDescription || product.description.slice(0, 160)} image={product.images[0]} />
      <section className="section section--ivory section--tight">
        <div className="container">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link to="/photo-frames">Photo frames</Link><Icon name="chevronRight" size={14} />
            {product.category?.name && <><span>{product.category.name}</span><Icon name="chevronRight" size={14} /></>}
            <span aria-current="page">{product.name}</span>
          </nav>

          <div className="pd">
            <div className="pd__gallery">
              <Img src={images[image]} alt={images[image] ? `${product.name} – photo ${image + 1}` : ''} ratio="1/1" width={900} priority icon="frame" label={product.name} className="pd__main" />
              {images.length > 1 && (
                <div className="pd__thumbs" role="list">
                  {images.map((src, i) => (
                    <button key={src + i} type="button" role="listitem" className={`pd__thumb ${i === image ? 'is-active' : ''}`} onClick={() => setImage(i)} aria-label={`Show photo ${i + 1}`} aria-current={i === image}>
                      <Img src={src} alt="" ratio="1/1" width={160} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="pd__info">
              {product.category?.name && <p className="eyebrow">{product.category.name}</p>}
              <h1>{product.name}</h1>
              <p className="pd__price" aria-live="polite">
                {priced ? (
                  <>
                    <strong>{money(variant.price)}</strong>
                    {variant.compareAtPrice > variant.price && <s>{money(variant.compareAtPrice)}</s>}
                  </>
                ) : <span className="muted">Price on request. Send us an enquiry for a quote.</span>}
              </p>
              {product.shortDescription && <p className="pd__lead">{product.shortDescription}</p>}

              {sizes.length > 0 && (
                <fieldset className="opt">
                  <legend>Size {size && <span>({size} in)</span>}</legend>
                  <div className="opt__list">
                    {sizes.map((s) => (
                      <button key={s} type="button" className={`opt__btn ${s === size ? 'is-active' : ''}`} aria-pressed={s === size} onClick={() => setSize(s)}>{s}</button>
                    ))}
                  </div>
                </fieldset>
              )}
              {finishesForSize.length > 0 && (
                <fieldset className="opt">
                  <legend>Finish {finish && <span>({finish})</span>}</legend>
                  <div className="opt__list">
                    {finishesForSize.map((f) => (
                      <button key={f} type="button" className={`opt__btn ${f === finish ? 'is-active' : ''}`} aria-pressed={f === finish} onClick={() => setFinish(f)}>{f}</button>
                    ))}
                  </div>
                </fieldset>
              )}

              {priced && (
                <p className={`pd__stock ${inStock ? '' : 'is-out'}`}>
                  {inStock ? (variant.stock <= 3 ? `Only ${variant.stock} left` : 'In stock') : 'Currently out of stock'}
                </p>
              )}

              <div className="pd__buy">
                <div className="qty" role="group" aria-label="Quantity">
                  <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity" disabled={qty <= 1}><Icon name="minus" size={16} /></button>
                  <output aria-live="polite">{qty}</output>
                  <button type="button" onClick={() => setQty((q) => Math.min(maxQty, q + 1))} aria-label="Increase quantity" disabled={qty >= maxQty}><Icon name="plus" size={16} /></button>
                </div>
                <Btn size="lg" icon="cart" disabled={!priced || !inStock} onClick={addToCart} className="pd__add">{buyLabel}</Btn>
              </div>
              {priced && inStock && (
                <Btn variant="outline" block onClick={() => { if (addToCart()) navigate('/checkout'); }}>Buy now</Btn>
              )}

              <div className="pd__enquire">
                <Btn variant="ghost" icon="mail" onClick={() => setEnquiry(true)}>Enquire about this product</Btn>
                {waLink() && <Btn variant="ghost" icon="whatsapp" href={waLink(waText)}>WhatsApp</Btn>}
              </div>

              {product.description && <div className="pd__desc"><h2>Description</h2><p>{product.description}</p></div>}
              {product.features.length > 0 && <ul className="ticks">{product.features.map((f) => <li key={f}><Icon name="check" size={16} />{f}</li>)}</ul>}
              <p className="pd__note"><Icon name="truck" size={18} /> Orders are confirmed by our team, who will contact you to arrange payment and delivery or pickup.</p>
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="section section--white">
          <div className="container">
            <SectionHead title="You may also like" />
            <div className="grid grid--4">{related.map((p, i) => <ProductCard key={p.id} product={p} delay={i * 0.06} />)}</div>
          </div>
        </section>
      )}

      <EnquiryModal open={enquiry} onClose={() => setEnquiry(false)} type="product" subject={product.name} reference={`${product.name}${choice ? ` (${choice})` : ''}`} defaultMessage={`Hello, I'd like to know more about ${product.name}${choice ? ` (${choice})` : ''}.`} />
    </>
  );
}
