import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from './Icon.jsx';
import { Btn } from './Buttons.jsx';
import { Field } from './Form.jsx';
import { useSite } from '../context/SiteContext.jsx';
import { api } from '../services/api.js';
import { useLockBody } from '../hooks/useMedia.js';

/**
 * Enquiry dialog used for service and product enquiries. Submits to the enquiry inbox in the admin panel
 * and also offers a WhatsApp shortcut when a number is configured.
 */
export default function EnquiryModal({ open, onClose, type = 'service', subject, reference, defaultMessage = '' }) {
  const { waLink } = useSite();
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: defaultMessage, website: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const first = useRef(null);
  useLockBody(open);

  useEffect(() => {
    if (open) {
      setDone(false); setError(''); setErrors({});
      setForm((f) => ({ ...f, message: defaultMessage }));
      setTimeout(() => first.current?.focus(), 50);
    }
  }, [open, defaultMessage]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setErrors({});
    try {
      await api.post('/enquiries', { ...form, type, subject, reference });
      setDone(true);
    } catch (err) {
      setErrors(err.errors || {});
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const wa = waLink(`Hello, I'd like to enquire about: ${reference || subject || ''}`);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div className="modal" role="dialog" aria-modal="true" aria-labelledby="enq-title" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}>
            <button type="button" className="modal__close" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
            {done ? (
              <div className="modal__done">
                <span className="modal__tick"><Icon name="check" size={28} /></span>
                <h3 id="enq-title">Thank you!</h3>
                <p>We’ve received your enquiry and will get back to you soon.</p>
                <Btn onClick={onClose}>Close</Btn>
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
                <h3 id="enq-title">Enquire{subject ? `: ${subject}` : ''}</h3>
                <p className="muted">Tell us a little about what you need.</p>
                <input type="text" name="website" value={form.website} onChange={set('website')} className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
                <Field label="Your name" error={errors.name} required><input ref={first} value={form.name} onChange={set('name')} autoComplete="name" /></Field>
                <div className="form-row">
                  <Field label="Phone" error={errors.phone}><input type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" /></Field>
                  <Field label="Email" error={errors.email}><input type="email" value={form.email} onChange={set('email')} autoComplete="email" /></Field>
                </div>
                <Field label="Message" error={errors.message} required><textarea rows={4} value={form.message} onChange={set('message')} /></Field>
                {error && !Object.keys(errors).length && <p className="form-error" role="alert">{error}</p>}
                <div className="modal__actions">
                  <Btn type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send enquiry'}</Btn>
                  {wa && <Btn href={wa} variant="outline" icon="whatsapp">WhatsApp instead</Btn>}
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
