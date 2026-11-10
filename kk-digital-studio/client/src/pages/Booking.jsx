import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHero } from '../components/Sections.jsx';
import Icon from '../components/Icon.jsx';
import Reveal from '../components/Reveal.jsx';
import { Btn } from '../components/Buttons.jsx';
import { Field } from '../components/Form.jsx';
import { ErrorState, Spinner } from '../components/States.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useSite } from '../context/SiteContext.jsx';
import { api } from '../services/api.js';
import { formatDate, formatTime, todayISO } from '../services/format.js';

const SLOTS = Array.from({ length: 23 }, (_, i) => {
  const mins = 9 * 60 + i * 30;
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
});

const STATUS_TEXT = {
  Pending: 'Awaiting confirmation from our team',
  Confirmed: 'Confirmed',
  Rejected: 'We couldn’t accommodate this request. Please contact us',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
};

export default function Booking() {
  const [params] = useSearchParams();
  const { waLink } = useSite();
  const services = useAsync(() => api.get('/services'), []);
  const [form, setForm] = useState({ name: '', phone: '', email: '', serviceId: '', date: '', time: '', location: '', message: '', website: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  // Prefill from ?service=<id> and ?package=<name> (links from service cards / package cards)
  useEffect(() => {
    const serviceId = params.get('service');
    const pkg = params.get('package');
    setForm((f) => ({ ...f, serviceId: serviceId || f.serviceId, message: pkg && !f.message ? `I'm interested in the ${pkg} package.` : f.message }));
  }, [params]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const serviceTitle = useMemo(() => services.data?.find((s) => s.id === form.serviceId)?.title || '', [services.data, form.serviceId]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErrors({}); setMessage('');
    try {
      const res = await api.post('/bookings', form);
      setDone(res);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErrors(err.errors || {});
      setMessage(err.message);
    } finally { setBusy(false); }
  };

  if (done) {
    const wa = waLink(`Hello, I just requested a booking (${done.reference}) for ${done.serviceTitle} on ${formatDate(done.date)}.`);
    return (
      <section className="section section--ivory">
        <div className="container container--narrow">
          <div className="confirm">
            <span className="confirm__tick"><Icon name="check" size={32} /></span>
            <p className="eyebrow">Request received</p>
            <h1>Thank you, {done.name.split(' ')[0]}</h1>
            <p className="confirm__ref">Booking reference <strong>{done.reference}</strong></p>
            <p>Your request is <strong>pending</strong>. We haven’t confirmed your session yet; our team will contact you to confirm the date and time. Keep this reference to check or change your booking.</p>
            <ul className="confirm__items">
              <li><span>Service</span><strong>{done.serviceTitle}</strong></li>
              <li><span>Preferred date</span><strong>{formatDate(done.date)} · {formatTime(done.time)}</strong></li>
              {done.location && <li><span>Location</span><strong>{done.location}</strong></li>}
            </ul>
            <div className="confirm__actions">
              {wa && <Btn href={wa} icon="whatsapp">Message us on WhatsApp</Btn>}
              <Btn to="/" variant="outline">Back to home</Btn>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <PageHero eyebrow="Book your session" title="Let’s plan your shoot" text="Share a few details and your preferred date. Your request is sent to our team, and we’ll confirm with you personally." />
      <section className="section section--ivory section--tight">
        <div className="container booking">
          <Reveal className="booking__main">
            <form className="panel" onSubmit={submit} noValidate>
              <input type="text" name="website" className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={set('website')} />
              <div className="form-row">
                <Field label="Full name" error={errors.name} required><input value={form.name} onChange={set('name')} autoComplete="name" /></Field>
                <Field label="Phone number" error={errors.phone} required><input type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" /></Field>
              </div>
              <Field label="Email" error={errors.email} hint="Optional, for confirmation emails"><input type="email" value={form.email} onChange={set('email')} autoComplete="email" /></Field>
              <Field label="Photography service" error={errors.serviceId} required>
                <select value={form.serviceId} onChange={set('serviceId')} disabled={services.loading}>
                  <option value="">{services.loading ? 'Loading services…' : 'Choose a service'}</option>
                  {(services.data || []).map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </Field>
              <div className="form-row">
                <Field label="Preferred date" error={errors.date} required><input type="date" min={todayISO()} value={form.date} onChange={set('date')} /></Field>
                <Field label="Preferred time" error={errors.time} required>
                  <select value={form.time} onChange={set('time')}>
                    <option value="">Select a time</option>
                    {SLOTS.map((t) => <option key={t} value={t}>{formatTime(t)}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Location / venue" error={errors.location} hint="Studio, home, venue name or area"><input value={form.location} onChange={set('location')} /></Field>
              <Field label="Additional message" error={errors.message}><textarea rows={4} value={form.message} onChange={set('message')} placeholder={serviceTitle ? `Tell us more about your ${serviceTitle.toLowerCase()}…` : 'Tell us about your occasion…'} /></Field>
              {message && <p className="form-error" role="alert">{Object.keys(errors).length ? 'Please correct the highlighted fields.' : message}</p>}
              <Btn type="submit" size="lg" block disabled={busy}>{busy ? 'Sending request…' : 'Request booking'}</Btn>
              <p className="muted small center">Submitting this form does not confirm your booking. We’ll contact you to confirm.</p>
            </form>
          </Reveal>

          <Reveal className="booking__side" delay={0.1}>
            <ManageBooking />
            {services.error && <ErrorState error={services.error} onRetry={services.reload} />}
          </Reveal>
        </div>
      </section>
    </>
  );
}

function ManageBooking() {
  const [form, setForm] = useState({ reference: '', phone: '' });
  const [booking, setBooking] = useState(null);
  const [resched, setResched] = useState({ open: false, newDate: '', newTime: '', note: '' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const call = async (path, extra = {}) => {
    setBusy(true); setError(''); setInfo('');
    try {
      const res = await api.post(path, { ...form, ...extra });
      setBooking(res);
      return res;
    } catch (err) { setError(err.message); return null; } finally { setBusy(false); }
  };

  const lookup = (e) => { e.preventDefault(); call('/bookings/lookup'); };
  const cancel = async () => {
    if (!window.confirm('Cancel this booking?')) return;
    if (await call('/bookings/cancel')) setInfo('Your booking has been cancelled.');
  };
  const requestResched = async (e) => {
    e.preventDefault();
    if (await call('/bookings/reschedule', { newDate: resched.newDate, newTime: resched.newTime, note: resched.note })) {
      setInfo('Reschedule request sent. We’ll confirm the new time with you.');
      setResched({ open: false, newDate: '', newTime: '', note: '' });
    }
  };
  const canChange = booking && ['Pending', 'Confirmed'].includes(booking.status);

  return (
    <div className="panel manage">
      <h2>Already booked?</h2>
      <p className="muted">Check the status of your request, ask to reschedule or cancel.</p>
      <form onSubmit={lookup} noValidate>
        <Field label="Booking reference"><input value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} placeholder="KK-BK-…" /></Field>
        <Field label="Phone number used"><input type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></Field>
        <Btn type="submit" variant="outline" block disabled={busy || !form.reference || !form.phone}>{busy ? <Spinner /> : 'Check booking'}</Btn>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
      {info && <p className="form-ok" role="status">{info}</p>}
      {booking && (
        <div className="manage__result">
          <p className={`status status--${booking.status.toLowerCase()}`}>{booking.status}</p>
          <p className="muted">{STATUS_TEXT[booking.status]}</p>
          <dl>
            <div><dt>Service</dt><dd>{booking.serviceTitle}</dd></div>
            <div><dt>Date</dt><dd>{formatDate(booking.date)} · {formatTime(booking.time)}</dd></div>
          </dl>
          {booking.rescheduleRequest && <p className="note">Reschedule requested for {formatDate(booking.rescheduleRequest.date)} · {formatTime(booking.rescheduleRequest.time)}. Awaiting confirmation.</p>}
          {canChange && !resched.open && (
            <div className="manage__actions">
              <Btn size="sm" variant="outline" onClick={() => setResched((r) => ({ ...r, open: true }))}>Request reschedule</Btn>
              <Btn size="sm" variant="ghost" onClick={cancel} disabled={busy}>Cancel booking</Btn>
            </div>
          )}
          {canChange && resched.open && (
            <form onSubmit={requestResched} className="manage__resched" noValidate>
              <div className="form-row">
                <Field label="New date"><input type="date" min={todayISO()} value={resched.newDate} onChange={(e) => setResched((r) => ({ ...r, newDate: e.target.value }))} /></Field>
                <Field label="New time"><select value={resched.newTime} onChange={(e) => setResched((r) => ({ ...r, newTime: e.target.value }))}><option value="">Select</option>{SLOTS.map((t) => <option key={t} value={t}>{formatTime(t)}</option>)}</select></Field>
              </div>
              <Field label="Note (optional)"><input value={resched.note} onChange={(e) => setResched((r) => ({ ...r, note: e.target.value }))} /></Field>
              <div className="manage__actions">
                <Btn type="submit" size="sm" disabled={busy || !resched.newDate || !resched.newTime}>Send request</Btn>
                <Btn size="sm" variant="ghost" onClick={() => setResched((r) => ({ ...r, open: false }))}>Close</Btn>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
