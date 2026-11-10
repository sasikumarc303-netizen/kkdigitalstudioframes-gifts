import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHero } from '../components/Sections.jsx';
import Seo from '../components/Seo.jsx';
import Icon from '../components/Icon.jsx';
import Img from '../components/Img.jsx';
import { Btn } from '../components/Buttons.jsx';
import { Field } from '../components/Form.jsx';
import { EmptyState } from '../components/States.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useSite } from '../context/SiteContext.jsx';
import { api } from '../services/api.js';
import { usePricedCart } from './Cart.jsx';

export default function Checkout() {
  const cart = useCart();
  const { config, money, waLink, payment } = useSite();
  const commerce = config.commerce;
  const [form, setForm] = useState({ name: '', phone: '', email: '', line1: '', line2: '', city: '', state: 'Tamil Nadu', pincode: '', notes: '', fulfilment: 'delivery', paymentMethod: 'enquiry', website: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState(null);
  const { priced, loading, error } = usePricedCart(placed ? [] : cart.items, form.fulfilment);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const delivery = form.fulfilment === 'delivery';

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErrors({}); setMessage('');
    try {
      const res = await api.post('/orders', {
        contact: { name: form.name, phone: form.phone, email: form.email },
        address: { line1: form.line1, line2: form.line2, city: form.city, state: form.state, pincode: form.pincode },
        fulfilment: form.fulfilment,
        paymentMethod: form.paymentMethod,
        notes: form.notes,
        website: form.website,
        items: cart.items.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })),
      });
      cart.rememberOrder(res.orderNumber, form.phone);
      cart.clear();
      setPlaced(res);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErrors(err.errors || {});
      setMessage(err.message);
      if (err.errors?.issues) window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setBusy(false);
    }
  };

  if (placed) {
    const wa = waLink(`Hello, I just placed order ${placed.orderNumber} on your website.`);
    return (
      <>
        <Seo noindex />
        <section className="section section--ivory">
          <div className="container container--narrow">
            <div className="confirm">
              <span className="confirm__tick"><Icon name="check" size={32} /></span>
              <p className="eyebrow">Order received</p>
              <h1>Thank you, we’ve got your order</h1>
              <p className="confirm__ref">Order number <strong>{placed.orderNumber}</strong></p>
              <p>Your order is <strong>pending</strong>. Our team will contact you shortly to confirm availability and arrange payment{placed.paymentMethod === 'cod' ? ' (cash on delivery was selected)' : ''}. We never charge you automatically.</p>
              <ul className="confirm__items">
                {placed.items.map((i) => <li key={i.variantId}><span>{i.name}{[i.size, i.finish].filter(Boolean).length ? ` (${[i.size, i.finish].filter(Boolean).join(', ')})` : ''} × {i.quantity}</span><strong>{money(i.lineTotal)}</strong></li>)}
                <li className="confirm__total"><span>Total</span><strong>{money(placed.total)}</strong></li>
              </ul>
              <div className="confirm__actions">
                <Btn to="/orders">Track this order</Btn>
                {wa && <Btn href={wa} variant="outline" icon="whatsapp">Message us on WhatsApp</Btn>}
                <Btn to="/photo-frames" variant="ghost">Continue shopping</Btn>
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  if (cart.items.length === 0) {
    return (
      <>
        <Seo noindex />
        <PageHero eyebrow="Checkout" title="Your cart is empty" />
        <section className="section section--ivory section--tight"><div className="container"><EmptyState title="Nothing to check out yet" action={<Btn to="/photo-frames">Shop photo frames</Btn>} /></div></section>
      </>
    );
  }

  const issues = errors.issues || priced?.issues || [];
  const blocked = issues.length > 0 || loading || !priced;

  return (
    <>
      <Seo noindex />
      <PageHero eyebrow="Almost there" title="Checkout" />
      <section className="section section--ivory section--tight">
        <div className="container">
          <form className="checkout" onSubmit={submit} noValidate>
            <div className="checkout__form">
              <input type="text" name="website" className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={set('website')} />

              <fieldset className="panel">
                <legend>Your details</legend>
                <Field label="Full name" error={errors.name} required><input value={form.name} onChange={set('name')} autoComplete="name" /></Field>
                <div className="form-row">
                  <Field label="Phone number" error={errors.phone} required><input type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" /></Field>
                  <Field label="Email (optional)" error={errors.email}><input type="email" value={form.email} onChange={set('email')} autoComplete="email" /></Field>
                </div>
              </fieldset>

              <fieldset className="panel">
                <legend>Delivery</legend>
                <div className="choice-row" role="radiogroup" aria-label="Fulfilment">
                  <label className={`choice ${delivery ? 'is-active' : ''}`}><input type="radio" name="fulfilment" checked={delivery} onChange={() => setForm((f) => ({ ...f, fulfilment: 'delivery' }))} /><Icon name="truck" /> Delivery</label>
                  {commerce.allowPickup && <label className={`choice ${!delivery ? 'is-active' : ''}`}><input type="radio" name="fulfilment" checked={!delivery} onChange={() => setForm((f) => ({ ...f, fulfilment: 'pickup' }))} /><Icon name="pin" /> Pick up at studio</label>}
                </div>
                {delivery && (
                  <>
                    <Field label="Address line 1" error={errors.line1} required><input value={form.line1} onChange={set('line1')} autoComplete="address-line1" /></Field>
                    <Field label="Address line 2" error={errors.line2}><input value={form.line2} onChange={set('line2')} autoComplete="address-line2" /></Field>
                    <div className="form-row">
                      <Field label="City / town" error={errors.city} required><input value={form.city} onChange={set('city')} autoComplete="address-level2" /></Field>
                      <Field label="State" error={errors.state} required><input value={form.state} onChange={set('state')} autoComplete="address-level1" /></Field>
                      <Field label="PIN code" error={errors.pincode} required><input inputMode="numeric" value={form.pincode} onChange={set('pincode')} autoComplete="postal-code" /></Field>
                    </div>
                  </>
                )}
                {!delivery && <p className="muted">We’ll let you know when your order is ready for pickup at the studio.</p>}
              </fieldset>

              <fieldset className="panel">
                <legend>Payment</legend>
                <div className="choice-col" role="radiogroup" aria-label="Payment method">
                  <label className={`choice choice--block ${form.paymentMethod === 'enquiry' ? 'is-active' : ''}`}>
                    <input type="radio" name="pay" checked={form.paymentMethod === 'enquiry'} onChange={() => setForm((f) => ({ ...f, paymentMethod: 'enquiry' }))} />
                    <span><strong>Order enquiry: pay after confirmation</strong><small>{commerce.paymentInstructions}</small></span>
                  </label>
                  {commerce.allowCod && (
                    <label className={`choice choice--block ${form.paymentMethod === 'cod' ? 'is-active' : ''}`}>
                      <input type="radio" name="pay" checked={form.paymentMethod === 'cod'} onChange={() => setForm((f) => ({ ...f, paymentMethod: 'cod' }))} />
                      <span><strong>Cash on delivery / pickup</strong><small>Pay when you receive your order.</small></span>
                    </label>
                  )}
                </div>
                {!payment?.onlineEnabled && <p className="muted small">Online card/UPI payment is not enabled yet; our team will share payment details once your order is confirmed.</p>}
                <Field label="Order notes (optional)" error={errors.notes}><textarea rows={3} value={form.notes} onChange={set('notes')} placeholder="Photo to use, engraving text, preferred delivery time…" /></Field>
              </fieldset>
            </div>

            <aside className="summary" aria-label="Order summary">
              <h2>Your order</h2>
              <ul className="summary__items">
                {(priced?.lines || []).map((l) => (
                  <li key={l.variantId}>
                    <Img src={l.image} alt="" ratio="1/1" width={120} icon="frame" />
                    <div><strong>{l.name}</strong><small>{[l.size, l.finish].filter(Boolean).join(' · ')} × {l.quantity}</small></div>
                    <span>{money(l.lineTotal)}</span>
                  </li>
                ))}
                {!priced && loading && <li className="muted">Checking prices…</li>}
              </ul>
              {error && <p className="form-error" role="alert">{error.message}</p>}
              {issues.map((i, n) => <p key={n} className="form-error" role="alert">{i.message}</p>)}
              <dl>
                <div><dt>Subtotal</dt><dd>{priced ? money(priced.subtotal) : '—'}</dd></div>
                <div><dt>{delivery ? 'Delivery' : 'Pickup'}</dt><dd>{priced ? (priced.shipping > 0 ? money(priced.shipping) : 'Free') : '—'}</dd></div>
                <div className="summary__total"><dt>Total</dt><dd>{priced ? money(priced.total) : '—'}</dd></div>
              </dl>
              {message && !errors.issues && Object.keys(errors).length === 0 && <p className="form-error" role="alert">{message}</p>}
              {message && Object.keys(errors).length > 0 && !errors.issues && <p className="form-error" role="alert">Please correct the highlighted fields.</p>}
              <Btn type="submit" size="lg" block disabled={busy || blocked}>{busy ? 'Placing order…' : 'Place order'}</Btn>
              <Link to="/cart" className="link-arrow summary__back"><Icon name="arrowLeft" size={16} /> Back to cart</Link>
            </aside>
          </form>
        </div>
      </section>
    </>
  );
}
