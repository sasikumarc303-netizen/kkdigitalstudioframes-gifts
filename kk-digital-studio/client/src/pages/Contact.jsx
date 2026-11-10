import { useState } from 'react';
import { PageHero, ContactBlock } from '../components/Sections.jsx';
import Reveal from '../components/Reveal.jsx';
import Icon from '../components/Icon.jsx';
import { Btn } from '../components/Buttons.jsx';
import { Field } from '../components/Form.jsx';
import { api } from '../services/api.js';

export default function Contact() {
  const [form, setForm] = useState({ name: '', phone: '', email: '', subject: '', message: '', website: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErrors({}); setMessage('');
    try {
      await api.post('/enquiries', { ...form, type: 'contact' });
      setSent(true);
      setForm({ name: '', phone: '', email: '', subject: '', message: '', website: '' });
    } catch (err) { setErrors(err.errors || {}); setMessage(err.message); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHero eyebrow="Get in touch" title="Contact & location" text="Questions about a session, a print or a frame? Send us a message and we’ll respond as soon as we can." />
      <section className="section section--ivory section--tight">
        <div className="container contact-grid">
          <Reveal>
            <form className="panel" onSubmit={submit} noValidate id="enquiry">
              <h2>Send an enquiry</h2>
              {sent && <p className="form-ok" role="status"><Icon name="check" size={16} /> Thank you! Your message has been sent. We’ll be in touch soon.</p>}
              <input type="text" name="website" className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={set('website')} />
              <Field label="Your name" error={errors.name} required><input value={form.name} onChange={set('name')} autoComplete="name" /></Field>
              <div className="form-row">
                <Field label="Phone" error={errors.phone}><input type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" /></Field>
                <Field label="Email" error={errors.email}><input type="email" value={form.email} onChange={set('email')} autoComplete="email" /></Field>
              </div>
              <Field label="Subject" error={errors.subject}><input value={form.subject} onChange={set('subject')} /></Field>
              <Field label="Message" error={errors.message} required><textarea rows={5} value={form.message} onChange={set('message')} /></Field>
              {message && <p className="form-error" role="alert">{Object.keys(errors).length ? 'Please correct the highlighted fields.' : message}</p>}
              <Btn type="submit" size="lg" block disabled={busy}>{busy ? 'Sending…' : 'Send message'}</Btn>
            </form>
          </Reveal>
          <Reveal delay={0.1}><ContactBlock /></Reveal>
        </div>
      </section>
    </>
  );
}
