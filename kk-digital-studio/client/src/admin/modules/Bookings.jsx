import { useState } from 'react';
import { Btn } from '../../components/Buttons.jsx';
import { useToast } from '../../components/Toast.jsx';
import { api } from '../../services/api.js';
import { formatDate, formatDateTime, formatTime, todayISO } from '../../services/format.js';
import { usePaged } from '../hooks/usePaged.js';
import { Badge, Chips, EmptyRow, ErrorBox, Loading, Modal, PageHeader, Pager, SearchBox, SelectField, TextArea, TextField, useConfirm, useSaveState } from '../components/ui.jsx';

const STATUSES = ['Pending', 'Confirmed', 'Rejected', 'Completed', 'Cancelled'];

export default function Bookings() {
  const toast = useToast();
  const confirm = useConfirm();
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const list = usePaged('/admin/bookings', { filters: { status, from, to } });
  const [open, setOpen] = useState(null);
  const [f, setF] = useState({ status: '', note: '', adminNotes: '', location: '', date: '', time: '' });
  const [{ saving, error, errors }, run] = useSaveState();
  const counts = list.extra.statusCounts || {};
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  const show = (b) => {
    setOpen(b);
    setF({ status: b.status, note: '', adminNotes: b.adminNotes || '', location: b.location || '', date: b.rescheduleRequest?.date || b.date, time: b.rescheduleRequest?.time || b.time });
  };

  const save = async () => {
    const r = await run(async () => {
      let b = open;
      if (f.adminNotes !== (b.adminNotes || '') || f.location !== (b.location || '')) b = await api.put(`/admin/bookings/${open.id}`, { adminNotes: f.adminNotes, location: f.location });
      if (f.status !== b.status) b = await api.patch(`/admin/bookings/${open.id}/status`, { status: f.status, note: f.note });
      return b;
    });
    if (r) { toast('Booking updated'); setOpen(null); list.reload(); }
  };

  const reschedule = async () => {
    const r = await run(() => api.post(`/admin/bookings/${open.id}/reschedule`, { date: f.date, time: f.time, note: f.note }));
    if (r) { toast('Session rescheduled'); setOpen(null); list.reload(); }
  };

  const remove = async () => {
    if (!(await confirm({ title: 'Delete this booking?', message: 'The booking record will be permanently deleted. Prefer “Cancelled” if you want to keep a record.', confirmLabel: 'Delete' }))) return;
    try { await api.del(`/admin/bookings/${open.id}`); toast('Booking deleted'); setOpen(null); list.reload(); } catch (e) { toast(e.message, 'error'); }
  };

  const waDigits = open ? open.phone.replace(/\D/g, '') : '';
  const wa = `https://wa.me/${waDigits.length === 10 ? `91${waDigits}` : waDigits}`;
  const rr = open?.rescheduleRequest;

  return (
    <>
      <PageHeader title="Bookings" subtitle="Session requests from the website. Nothing is confirmed until you confirm it here." />
      <Chips value={status} onChange={setStatus} counts={{ '': total, ...counts }} options={[{ value: '', label: 'All' }, ...STATUSES]} />
      <div className="a-toolbar">
        <SearchBox value={list.q} onChange={list.setQ} placeholder="Reference, name, phone, service…" />
        <label className="a-inline-field"><span>Session from</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="a-inline-field"><span>to</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>
      <ErrorBox error={list.error} onRetry={list.reload} />
      {list.loading && !list.items.length ? <Loading /> : list.items.length === 0 ? <EmptyRow>No bookings {status || list.q || from || to ? 'match these filters' : 'yet'}.</EmptyRow> : (
        <div className="a-table-wrap">
          <table className="a-table a-table--clickable">
            <thead><tr><th>Reference</th><th>Client</th><th>Service</th><th>Session</th><th>Status</th><th>Requested</th></tr></thead>
            <tbody>
              {list.items.map((b) => (
                <tr key={b.id} onClick={() => show(b)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && show(b)} className={list.loading ? 'is-stale' : ''}>
                  <td data-label="Reference"><strong>{b.reference}</strong>{b.rescheduleRequest?.date && <Badge tone="warning">Reschedule asked</Badge>}</td>
                  <td data-label="Client">{b.name}<small className="a-sub">{b.phone}</small></td>
                  <td data-label="Service">{b.serviceTitle}</td>
                  <td data-label="Session">{formatDate(b.date)}<small className="a-sub">{formatTime(b.time)}</small></td>
                  <td data-label="Status"><Badge>{b.status}</Badge></td>
                  <td data-label="Requested">{formatDateTime(b.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager {...list} />

      <Modal open={Boolean(open)} onClose={() => !saving && setOpen(null)} wide title={open ? `Booking ${open.reference}` : ''}
        footer={open && <><Btn variant="ghost" onClick={remove} disabled={saving}>Delete</Btn><Btn variant="ghost" onClick={() => setOpen(null)} disabled={saving}>Close</Btn><Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Btn></>}>
        {open && (
          <div className="a-detail">
            {error && <p className="a-error" role="alert">{error}</p>}
            <div className="a-grid a-grid--2">
              <section>
                <h3>Request</h3>
                <dl className="a-dl">
                  <dt>Client</dt><dd>{open.name}</dd>
                  <dt>Phone</dt><dd><a href={`tel:${open.phone}`}>{open.phone}</a> · <a href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a></dd>
                  {open.email && <><dt>Email</dt><dd><a href={`mailto:${open.email}`}>{open.email}</a></dd></>}
                  <dt>Service</dt><dd>{open.serviceTitle}</dd>
                  <dt>Requested slot</dt><dd>{formatDate(open.date)} at {formatTime(open.time)}</dd>
                  {open.message && <><dt>Message</dt><dd>{open.message}</dd></>}
                </dl>
              </section>
              <section>
                <h3>Manage</h3>
                <SelectField label="Status" value={f.status} onChange={set('status')} options={STATUSES} />
                {f.status !== open.status && <TextArea label="Note for history (optional)" rows={2} value={f.note} onChange={set('note')} />}
                <TextField label="Location" value={f.location} onChange={set('location')} maxLength={300} hint="Studio, venue or address for the session" />
                <TextArea label="Internal notes" rows={3} value={f.adminNotes} onChange={set('adminNotes')} hint="Only visible to your team" />
              </section>
            </div>

            <section className="a-reschedule">
              <h3>Reschedule</h3>
              {rr?.date && <p className="a-note">The client asked to move this session to <b>{formatDate(rr.date)} at {formatTime(rr.time)}</b>{rr.note ? ` — “${rr.note}”` : ''}. Review below and apply, or leave as is.</p>}
              <div className="a-form">
                <div className="a-form__item"><TextField label="New date" type="date" min={todayISO()} value={f.date} onChange={set('date')} error={errors.date} /></div>
                <div className="a-form__item"><TextField label="New time" type="time" value={f.time} onChange={set('time')} error={errors.time} /></div>
              </div>
              <Btn variant="outline" size="sm" onClick={reschedule} disabled={saving || !f.date || !f.time || (f.date === open.date && f.time === open.time)}>Apply new date &amp; time</Btn>
            </section>

            <h3>History</h3>
            <ol className="a-timeline">
              {[...(open.history || [])].reverse().map((h, i) => <li key={i}><b>{h.action}{h.status ? ` · ${h.status}` : ''}</b>{h.note && <span>{h.note}</span>}<small>{formatDateTime(h.at)} · {h.by}</small></li>)}
            </ol>
          </div>
        )}
      </Modal>
    </>
  );
}
