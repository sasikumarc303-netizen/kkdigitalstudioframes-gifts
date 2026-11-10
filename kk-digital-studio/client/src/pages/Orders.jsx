import { useEffect, useState } from 'react';
import { PageHero } from '../components/Sections.jsx';
import Seo from '../components/Seo.jsx';
import Img from '../components/Img.jsx';
import { Btn } from '../components/Buttons.jsx';
import { Field } from '../components/Form.jsx';
import { EmptyState, Spinner } from '../components/States.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useSite } from '../context/SiteContext.jsx';
import { api } from '../services/api.js';
import { formatDateTime } from '../services/format.js';

const STAGES = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered'];

function Progress({ status }) {
  if (status === 'Cancelled') return <p className="status status--bad">Cancelled</p>;
  const at = STAGES.indexOf(status);
  return (
    <ol className="progress" aria-label={`Order status: ${status}`}>
      {STAGES.map((s, i) => <li key={s} className={i <= at ? 'is-done' : ''} aria-current={i === at ? 'step' : undefined}><span />{s}</li>)}
    </ol>
  );
}

export default function Orders() {
  const cart = useCart();
  const { money } = useSite();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(cart.orders.length > 0);
  const [form, setForm] = useState({ orderNumber: '', phone: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!cart.orders.length) { setLoading(false); return; }
    api.post('/orders/lookup', { items: cart.orders.map(({ orderNumber, phone }) => ({ orderNumber, phone })) })
      .then(setOrders).catch((e) => setError(e.message)).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const find = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const res = await api.post('/orders/lookup', { items: [form] });
      if (!res.length) { setError('We could not find an order with that number and phone number.'); return; }
      cart.rememberOrder(res[0].orderNumber, form.phone);
      setOrders((o) => [res[0], ...o.filter((x) => x.orderNumber !== res[0].orderNumber)]);
      setForm({ orderNumber: '', phone: '' });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <>
      <Seo title="Track your order | KK Digital Studio" noindex />
      <PageHero eyebrow="Order history" title="Your orders" text="Orders placed from this device appear here. You can also look up any order with its number and the phone number used." />
      <section className="section section--ivory section--tight">
        <div className="container container--narrow">
          <form className="panel lookup" onSubmit={find} noValidate>
            <h2>Find an order</h2>
            <div className="form-row">
              <Field label="Order number" required><input value={form.orderNumber} onChange={(e) => setForm((f) => ({ ...f, orderNumber: e.target.value }))} placeholder="KK-ORD-…" /></Field>
              <Field label="Phone number" required><input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></Field>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <Btn type="submit" disabled={busy || !form.orderNumber || !form.phone}>{busy ? 'Searching…' : 'Find order'}</Btn>
          </form>

          {loading && <Spinner />}
          {!loading && orders.length === 0 && <EmptyState title="No orders to show yet" text="When you place an order it will be listed here." action={<Btn to="/photo-frames">Shop photo frames</Btn>} />}
          <div className="order-list">
            {orders.map((o) => (
              <article key={o.orderNumber} className="panel order">
                <header>
                  <div><p className="eyebrow eyebrow--sm">Order</p><h3>{o.orderNumber}</h3></div>
                  <div className="order__meta"><span>{formatDateTime(o.createdAt)}</span><strong>{money(o.total)}</strong></div>
                </header>
                <Progress status={o.status} />
                <ul className="order__items">
                  {o.items.map((i) => (
                    <li key={i.variantId}>
                      <Img src={i.image} alt="" ratio="1/1" width={96} icon="frame" />
                      <span>{i.name}<small>{[i.size, i.finish].filter(Boolean).join(' · ')} × {i.quantity}</small></span>
                      <strong>{money(i.lineTotal)}</strong>
                    </li>
                  ))}
                </ul>
                <p className="muted small">Payment: {o.paymentStatus} · {o.paymentMethod === 'cod' ? 'Cash on delivery' : 'Arranged after confirmation'} · {o.fulfilment === 'pickup' ? 'Studio pickup' : 'Delivery'}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
