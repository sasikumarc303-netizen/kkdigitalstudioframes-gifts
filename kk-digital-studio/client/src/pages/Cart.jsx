import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHero } from '../components/Sections.jsx';
import Img from '../components/Img.jsx';
import Icon from '../components/Icon.jsx';
import Seo from '../components/Seo.jsx';
import { Btn } from '../components/Buttons.jsx';
import { EmptyState } from '../components/States.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useSite } from '../context/SiteContext.jsx';
import { api } from '../services/api.js';

/** Prices the cart on the server so the browser can never dictate a price. */
export function usePricedCart(items, fulfilment = 'delivery') {
  const [state, setState] = useState({ loading: items.length > 0, error: null, priced: null });
  const key = JSON.stringify(items.map((i) => [i.productId, i.variantId, i.quantity])) + fulfilment;
  useEffect(() => {
    if (!items.length) { setState({ loading: false, error: null, priced: null }); return undefined; }
    let live = true;
    setState((s) => ({ ...s, loading: true }));
    const t = setTimeout(() => {
      api.post('/cart/price', { items: items.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })), fulfilment })
        .then((priced) => live && setState({ loading: false, error: null, priced }))
        .catch((error) => live && setState((s) => ({ ...s, loading: false, error })));
    }, 200);
    return () => { live = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}

export default function Cart() {
  const cart = useCart();
  const { money } = useSite();
  const { priced, loading, error } = usePricedCart(cart.items);

  const lineFor = (item) => priced?.lines.find((l) => l.product === item.productId && l.variantId === item.variantId);
  const issueFor = (item) => priced?.issues.find((i) => i.productId === item.productId && i.variantId === item.variantId);
  const blocking = priced?.issues?.length > 0;

  return (
    <>
      <Seo noindex />
      <PageHero eyebrow="Your selection" title="Shopping cart" />
      <section className="section section--ivory section--tight">
        <div className="container">
          {cart.items.length === 0 ? (
            <EmptyState title="Your cart is empty" text="Browse our frames and keepsakes to get started." action={<Btn to="/photo-frames">Shop photo frames</Btn>} />
          ) : (
            <div className="cart">
              <ul className="cart__lines">
                {cart.items.map((item) => {
                  const line = lineFor(item);
                  const issue = issueFor(item);
                  const d = line || item;
                  const unit = line ? line.unitPrice : item.price;
                  return (
                    <li key={item.productId + item.variantId} className={`cart-line ${issue ? 'has-issue' : ''}`}>
                      <Link to={`/photo-frames/${d.productSlug || d.slug || item.productId}`} className="cart-line__img">
                        <Img src={d.image} alt="" ratio="1/1" width={240} icon="frame" />
                      </Link>
                      <div className="cart-line__info">
                        <h3><Link to={`/photo-frames/${d.productSlug || d.slug || item.productId}`}>{d.name}</Link></h3>
                        <p className="muted">{[d.size, d.finish].filter(Boolean).join(' · ')}</p>
                        {issue && <p className="form-error" role="alert">{issue.message}</p>}
                        <button type="button" className="link-btn" onClick={() => cart.remove(item.productId, item.variantId)}><Icon name="trash" size={15} /> Remove</button>
                      </div>
                      <div className="qty" role="group" aria-label={`Quantity for ${d.name}`}>
                        <button type="button" onClick={() => cart.setQuantity(item.productId, item.variantId, item.quantity - 1)} disabled={item.quantity <= 1} aria-label="Decrease quantity"><Icon name="minus" size={16} /></button>
                        <output>{item.quantity}</output>
                        <button type="button" onClick={() => cart.setQuantity(item.productId, item.variantId, item.quantity + 1)} disabled={item.quantity >= 20} aria-label="Increase quantity"><Icon name="plus" size={16} /></button>
                      </div>
                      <div className="cart-line__price">
                        {unit ? <strong>{money(unit * item.quantity)}</strong> : <span className="muted">—</span>}
                        {item.quantity > 1 && unit ? <small>{money(unit)} each</small> : null}
                      </div>
                    </li>
                  );
                })}
              </ul>

              <aside className="summary" aria-label="Order summary">
                <h2>Order summary</h2>
                {error && <p className="form-error" role="alert">{error.message}</p>}
                <dl>
                  <div><dt>Subtotal</dt><dd>{priced ? money(priced.subtotal) : loading ? '…' : '—'}</dd></div>
                  <div><dt>Delivery</dt><dd>{priced ? (priced.shipping > 0 ? money(priced.shipping) : 'Free / at pickup') : '—'}</dd></div>
                  <div className="summary__total"><dt>Total</dt><dd>{priced ? money(priced.total) : '—'}</dd></div>
                </dl>
                {blocking && <p className="form-error" role="alert">Please resolve the items marked above to continue.</p>}
                <Btn to="/checkout" size="lg" block disabled={loading || blocking || !priced} aria-disabled={loading || blocking || !priced} onClick={(e) => (loading || blocking || !priced) && e.preventDefault()}>Proceed to checkout</Btn>
                <Btn to="/photo-frames" variant="ghost" block>Continue shopping</Btn>
                <p className="summary__note">Prices are confirmed by our server at checkout. Payment is arranged with our team after your order is confirmed.</p>
              </aside>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
