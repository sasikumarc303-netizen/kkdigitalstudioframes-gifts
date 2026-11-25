import { useRef, useState } from 'react';
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

const CHECKOUT_REQUEST_KEYS = 'kk-checkout-request-keys';
let razorpayScriptPromise;

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (razorpayScriptPromise) return razorpayScriptPromise;
  razorpayScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      if (window.Razorpay) resolve(window.Razorpay);
      else {
        razorpayScriptPromise = null;
        reject(new Error('The payment window could not be loaded. Please try again.'));
      }
    };
    script.onerror = () => {
      razorpayScriptPromise = null;
      reject(new Error('Could not connect to the payment service. Please try again.'));
    };
    document.head.appendChild(script);
  });
  return razorpayScriptPromise;
}

async function getCheckoutRequestKey(keyRef, fingerprint) {
  if (keyRef.current?.fingerprint === fingerprint) return keyRef.current.key;
  let keys = {};
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(CHECKOUT_REQUEST_KEYS) || '{}');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) keys = saved;
  } catch (error) {
    console.warn('[checkout] unable to read request keys', error?.name || 'UnknownError');
  }
  const savedKey = keys[fingerprint];
  const key = typeof savedKey === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(savedKey)
    ? savedKey
    : window.crypto.randomUUID();
  keys[fingerprint] = key;
  keys = Object.fromEntries(Object.entries(keys).slice(-20));
  keyRef.current = { fingerprint, key };
  try {
    window.sessionStorage.setItem(CHECKOUT_REQUEST_KEYS, JSON.stringify(keys));
  } catch (error) {
    console.warn('[checkout] unable to persist request keys', error?.name || 'UnknownError');
  }
  return key;
}

function rotateCheckoutRequestKey(keyRef) {
  if (!keyRef.current) return;
  let keys = {};
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(CHECKOUT_REQUEST_KEYS) || '{}');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) keys = saved;
  } catch (error) {
    console.warn('[checkout] unable to read request keys', error?.name || 'UnknownError');
  }
  delete keys[keyRef.current.fingerprint];
  keyRef.current = null;
  try {
    window.sessionStorage.setItem(CHECKOUT_REQUEST_KEYS, JSON.stringify(keys));
  } catch (error) {
    console.warn('[checkout] unable to rotate request keys', error?.name || 'UnknownError');
  }
}

async function fingerprintCheckout(data) {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  const digest = await window.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export default function Checkout() {
  const cart = useCart();
  const { config, money, waLink, payment } = useSite();
  const commerce = config.commerce;
  const [form, setForm] = useState({ name: '', phone: '', email: '', line1: '', line2: '', city: '', state: 'Tamil Nadu', pincode: '', notes: '', fulfilment: 'delivery', paymentMethod: 'enquiry', whatsappOptIn: false, website: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState(null);
  const [paymentState, setPaymentState] = useState('');
  const [paymentMessage, setPaymentMessage] = useState('');
  const checkoutRequestKeyRef = useRef(null);
  const { priced, loading, error } = usePricedCart(placed ? [] : cart.items, form.fulfilment);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const delivery = form.fulfilment === 'delivery';
  const onlineOnly = payment?.onlineOnly === true;
  const selectedPaymentMethod = onlineOnly ? 'online' : form.paymentMethod;

  const finishOrder = (order, payment) => {
    cart.rememberOrder(order.orderNumber, form.phone);
    cart.clear();
    rotateCheckoutRequestKey(checkoutRequestKeyRef);
    setPlaced({ ...order, paymentId: payment?.paymentId || '' });
    setPaymentState('');
    setPaymentMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startOnlinePayment = async (order, checkoutRequestKey) => {
    const owner = { orderNumber: order.orderNumber, checkoutRequestKey };
    const current = await api.post('/payments/razorpay/status', owner);
    if (current.paymentStatus === 'Paid') {
      finishOrder(current.order, current);
      return;
    }

    const session = await api.post('/payments/razorpay/orders', owner);
    if (session.paymentStatus === 'Paid') {
      finishOrder(session.order, session);
      return;
    }
    const Razorpay = await loadRazorpayCheckout();
    const checkout = new Razorpay({
      key: session.keyId,
      order_id: session.razorpayOrderId,
      amount: session.amount,
      currency: session.currency,
      name: 'KK Digital Studio Frames & Gifts',
      description: `Order ${order.orderNumber}`,
      prefill: { name: form.name, email: form.email, contact: form.phone },
      theme: { color: '#283B32' },
      modal: {
        ondismiss: () => {
          setPaymentState('cancelled');
          setPaymentMessage('Payment was cancelled. Your order is saved; you can safely retry with the same order.');
        },
      },
      handler: async (response) => {
        setPaymentState('verifying');
        setPaymentMessage('Verifying your payment securely…');
        try {
          const verified = await api.post('/payments/razorpay/verify', {
            ...owner,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          if (verified.paymentStatus === 'Paid') {
            finishOrder(verified.order, verified);
          } else {
            setPaymentState('pending');
            setPaymentMessage('The payment is still being confirmed. Check its status before trying again.');
          }
        } catch (error) {
          setPaymentState('pending');
          setPaymentMessage(`${error.message} If your account was debited, check payment status before retrying.`);
        }
      },
    });
    checkout.on('payment.failed', () => {
      setPaymentState('failed');
      setPaymentMessage('Payment did not complete. You can try again without creating another order.');
      checkout.close();
    });
    setPaymentState('checkout');
    setPaymentMessage('Complete your payment in the secure Razorpay window.');
    checkout.open();
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErrors({}); setMessage('');
    try {
      const checkoutData = {
        contact: { name: form.name, phone: form.phone, email: form.email },
        address: { line1: form.line1, line2: form.line2, city: form.city, state: form.state, pincode: form.pincode },
        fulfilment: form.fulfilment,
        paymentMethod: selectedPaymentMethod,
        whatsappOptIn: form.whatsappOptIn,
        notes: form.notes,
        website: form.website,
        items: cart.items.map(({ productId, variantId, quantity }) => ({ productId, variantId, quantity })),
      };
      const fingerprint = await fingerprintCheckout(checkoutData);
      const checkoutRequestKey = await getCheckoutRequestKey(checkoutRequestKeyRef, fingerprint);
      const res = await api.post('/orders', { ...checkoutData, checkoutRequestKey });
      if (selectedPaymentMethod === 'online') {
        setPaymentState('opening');
        setPaymentMessage('Preparing secure payment…');
        await startOnlinePayment(res, checkoutRequestKey);
        return;
      }
      cart.rememberOrder(res.orderNumber, form.phone);
      cart.clear();
      rotateCheckoutRequestKey(checkoutRequestKeyRef);
      setPlaced(res);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErrors(err.errors || {});
      setMessage(err.message);
      if (selectedPaymentMethod === 'online') {
        setPaymentState('failed');
        setPaymentMessage(err.message);
      }
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
              <p>{placed.paymentStatus === 'Paid'
                ? <>Your payment is <strong>verified</strong>. Our team will contact you shortly to confirm fulfilment.</>
                : <>Your order is <strong>pending</strong>. Our team will contact you shortly to confirm availability and arrange payment{placed.paymentMethod === 'cod' ? ' (cash on delivery was selected)' : ''}.</>}</p>
              {placed.paymentStatus === 'Paid' && placed.paymentId && <p className="muted small">Payment reference: {placed.paymentId}</p>}
              <ul className="confirm__items">
                {placed.items.map((i) => <li key={i.variantId}><span>{i.name}{[i.size, i.finish].filter(Boolean).length ? ` (${[i.size, i.finish].filter(Boolean).join(', ')})` : ''} × {i.quantity}</span><strong>{money(i.lineTotal)}</strong></li>)}
                <li className="confirm__total"><span>Total</span><strong>{money(placed.total)}</strong></li>
              </ul>
              <div className="confirm__actions">
                <Btn to="/track-order" state={{ orderNumber: placed.orderNumber, phone: form.phone }}>Track this order</Btn>
                <Btn to="/orders" variant="ghost">Order history</Btn>
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
  const blocked = issues.length > 0 || loading || !priced || (onlineOnly && !payment?.onlineEnabled);

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
                <legend>Order updates</legend>
                <label className="choice choice--block">
                  <input
                    type="checkbox"
                    checked={form.whatsappOptIn}
                    onChange={(e) => setForm((f) => ({ ...f, whatsappOptIn: e.target.checked }))}
                  />
                  <span><strong>Receive WhatsApp updates for this order</strong><small>Optional. We’ll only send order status updates, not marketing messages.</small></span>
                </label>
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
                  {!onlineOnly && (
                    <label className={`choice choice--block ${selectedPaymentMethod === 'enquiry' ? 'is-active' : ''}`}>
                      <input type="radio" name="pay" checked={selectedPaymentMethod === 'enquiry'} onChange={() => setForm((f) => ({ ...f, paymentMethod: 'enquiry' }))} />
                      <span><strong>Order enquiry: pay after confirmation</strong><small>{commerce.paymentInstructions}</small></span>
                    </label>
                  )}
                  {!onlineOnly && commerce.allowCod && (
                    <label className={`choice choice--block ${form.paymentMethod === 'cod' ? 'is-active' : ''}`}>
                      <input type="radio" name="pay" checked={form.paymentMethod === 'cod'} onChange={() => setForm((f) => ({ ...f, paymentMethod: 'cod' }))} />
                      <span><strong>Cash on delivery / pickup</strong><small>Pay when you receive your order.</small></span>
                    </label>
                  )}
                  {payment?.onlineEnabled && (
                    <label className={`choice choice--block ${selectedPaymentMethod === 'online' ? 'is-active' : ''}`}>
                      <input type="radio" name="pay" checked={selectedPaymentMethod === 'online'} onChange={() => setForm((f) => ({ ...f, paymentMethod: 'online' }))} />
                      <span><strong>Pay online with Razorpay</strong><small>UPI, cards and other methods enabled on the secure Razorpay checkout.</small></span>
                    </label>
                  )}
                </div>
                {payment?.onlineEnabled && payment.mode === 'test' && <p className="muted small">Razorpay test mode is active. Test payments do not charge a real account.</p>}
                {onlineOnly && !payment?.onlineEnabled && <p className="muted small">Online payment is temporarily unavailable. Please try again later.</p>}
                {!onlineOnly && !payment?.onlineEnabled && <p className="muted small">Online card/UPI payment is not enabled yet; our team will share payment details once your order is confirmed.</p>}
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
              {paymentMessage && <p className={paymentState === 'failed' || paymentState === 'cancelled' ? 'form-error' : 'muted small'} role="status" aria-live="polite">{paymentMessage}</p>}
              <dl>
                <div><dt>Subtotal</dt><dd>{priced ? money(priced.subtotal) : '—'}</dd></div>
                {priced?.discount > 0 && <div><dt>Product savings (included)</dt><dd>{money(priced.discount)}</dd></div>}
                <div><dt>{delivery ? 'Delivery' : 'Pickup'}</dt><dd>{priced ? (priced.shipping > 0 ? money(priced.shipping) : 'Free') : '—'}</dd></div>
                <div className="summary__total"><dt>Total</dt><dd>{priced ? money(priced.total) : '—'}</dd></div>
              </dl>
              {message && !errors.issues && Object.keys(errors).length === 0 && <p className="form-error" role="alert">{message}</p>}
              {message && Object.keys(errors).length > 0 && !errors.issues && <p className="form-error" role="alert">Please correct the highlighted fields.</p>}
              <Btn type="submit" size="lg" block disabled={busy || ['opening', 'checkout', 'verifying'].includes(paymentState) || blocked}>{busy ? 'Preparing checkout…' : selectedPaymentMethod === 'online' ? (paymentState === 'failed' || paymentState === 'cancelled' ? 'Retry online payment' : 'Continue to payment') : 'Place order'}</Btn>
              <Link to="/cart" className="link-arrow summary__back"><Icon name="arrowLeft" size={16} /> Back to cart</Link>
            </aside>
          </form>
        </div>
      </section>
    </>
  );
}
