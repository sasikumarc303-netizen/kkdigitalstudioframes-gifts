import { useState } from 'react';
import { PageHero } from '../components/Sections.jsx';
import Seo from '../components/Seo.jsx';
import { Btn } from '../components/Buttons.jsx';
import { Field } from '../components/Form.jsx';
import { EmptyState, Spinner } from '../components/States.jsx';
import { api } from '../services/api.js';
import { formatDateTime } from '../services/format.js';
import { useLocation } from 'react-router-dom';

export default function TrackOrder() {
  const location = useLocation();
  const [form, setForm] = useState(() => ({
    orderNumber: location.state?.orderNumber || '',
    phone: location.state?.phone || '',
  }));
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const track = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      const result = await api.post('/orders/track', form);
      setOrder(result);
      setForm((value) => ({ ...value, phone: '' }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const searchAgain = () => {
    setOrder(null);
    setForm({ orderNumber: '', phone: '' });
    setError('');
  };

  const history = order?.history || [];

  return (
    <>
      <Seo title="Track your order | KK Digital Studio" noindex />
      <PageHero eyebrow="Order tracking" title="Track your order" text="Enter the order number and the phone number used at checkout to see the latest status." />
      <section className="section section--ivory section--tight">
        <div className="container container--narrow">
          {!order && (
            <form className="panel lookup track-order__form" onSubmit={track} noValidate>
              <h2>Find your order</h2>
              <div className="form-row">
                <Field label="Order number" required>
                  <input
                    value={form.orderNumber}
                    onChange={(event) => setForm((value) => ({ ...value, orderNumber: event.target.value }))}
                    autoComplete="off"
                    maxLength={40}
                    aria-required="true"
                  />
                </Field>
                <Field label="Phone number used at checkout" required>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={form.phone}
                    onChange={(event) => setForm((value) => ({ ...value, phone: event.target.value }))}
                    autoComplete="tel"
                    aria-required="true"
                  />
                </Field>
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <Btn type="submit" disabled={loading || !form.orderNumber.trim() || !form.phone.trim()}>
                {loading ? 'Searching…' : 'Track order'}
              </Btn>
              {loading && <Spinner label="Looking up order" />}
            </form>
          )}

          {order && (
            <article className="panel track-order__result" aria-live="polite">
              <header className="track-order__header">
                <div>
                  <p className="eyebrow eyebrow--sm">Tracking ID</p>
                  <h2>{order.orderNumber}</h2>
                </div>
                <p className={`track-order__status${order.status === 'Cancelled' ? ' is-cancelled' : ''}`}>
                  <span>Current status</span><strong>{order.status}</strong>
                </p>
              </header>
              <h3>Status history</h3>
              <ol className="track-history" aria-label="Order status timeline">
                {history.map((item, index) => {
                  const at = item.at ? new Date(item.at) : null;
                  return (
                    <li key={`${item.status}-${item.at || index}`} className={index === history.length - 1 ? 'is-current' : ''}>
                      <span className="track-history__marker" aria-hidden="true" />
                      <div>
                        <strong>{item.status}</strong>
                        {at && Number.isFinite(at.getTime()) && <time dateTime={at.toISOString()}>{formatDateTime(at)}</time>}
                        {item.note && <p>{item.note}</p>}
                        <small>{item.by}</small>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <Btn variant="outline" onClick={searchAgain}>Track another order</Btn>
            </article>
          )}

          {!order && !loading && !error && (
            <EmptyState title="Your order updates will appear here" text="For your privacy, you’ll need both the order number and the checkout phone number." />
          )}
        </div>
      </section>
    </>
  );
}
