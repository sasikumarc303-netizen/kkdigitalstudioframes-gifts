import { useState } from 'react';
import { Btn } from '../../components/Buttons.jsx';
import { useToast } from '../../components/Toast.jsx';
import { api } from '../../services/api.js';
import { formatDateTime } from '../../services/format.js';
import { usePaged } from '../hooks/usePaged.js';
import { Badge, Chips, EmptyRow, ErrorBox, Loading, Modal, PageHeader, Pager, SearchBox, SelectField, TextArea, useConfirm, useSaveState } from '../components/ui.jsx';

const STATUSES = ['New', 'In Progress', 'Resolved', 'Closed'];

export default function Enquiries() {
  const toast = useToast();
  const confirm = useConfirm();
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const list = usePaged('/admin/enquiries', { filters: { status, type } });
  const [open, setOpen] = useState(null);
  const [note, setNote] = useState('');
  const [{ saving, error }, run] = useSaveState();
  const counts = list.extra.statusCounts || {};
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const changeStatus = async (s) => {
    const r = await run(() => api.patch(`/admin/enquiries/${open.id}/status`, { status: s }));
    if (r) { setOpen(r); list.reload(); toast('Status updated'); }
  };
  const addNote = async () => {
    const r = await run(() => api.post(`/admin/enquiries/${open.id}/notes`, { text: note }));
    if (r) { setOpen(r); setNote(''); toast('Note added'); }
  };
  const remove = async () => {
    if (!(await confirm({ title: 'Delete this enquiry?', message: 'It will be permanently removed.', confirmLabel: 'Delete' }))) return;
    try { await api.del(`/admin/enquiries/${open.id}`); toast('Enquiry deleted'); setOpen(null); list.reload(); } catch (e) { toast(e.message, 'error'); }
  };
  const digits = open?.phone?.replace(/\D/g, '') || '';

  return (
    <>
      <PageHeader title="Enquiries" subtitle="Messages from the contact form, product enquiries and service questions." />
      <Chips value={status} onChange={setStatus} counts={{ '': total, ...counts }} options={[{ value: '', label: 'All' }, ...STATUSES]} />
      <div className="a-toolbar">
        <SearchBox value={list.q} onChange={list.setQ} placeholder="Name, phone, subject, message…" />
        <label className="a-inline-field"><span>Type</span><select value={type} onChange={(e) => setType(e.target.value)}><option value="">Any</option><option value="contact">Contact</option><option value="product">Product</option><option value="service">Service</option></select></label>
      </div>
      <ErrorBox error={list.error} onRetry={list.reload} />
      {list.loading && !list.items.length ? <Loading /> : list.items.length === 0 ? <EmptyRow>No enquiries {status || type || list.q ? 'match these filters' : 'yet'}.</EmptyRow> : (
        <div className="a-table-wrap">
          <table className="a-table a-table--clickable">
            <thead><tr><th>From</th><th>About</th><th>Message</th><th>Type</th><th>Status</th><th>Received</th></tr></thead>
            <tbody>
              {list.items.map((e) => (
                <tr key={e.id} onClick={() => { setOpen(e); setNote(''); }} tabIndex={0} onKeyDown={(ev) => ev.key === 'Enter' && (setOpen(e), setNote(''))} className={list.loading ? 'is-stale' : ''}>
                  <td data-label="From"><strong>{e.name}</strong><small className="a-sub">{e.phone || e.email}</small></td>
                  <td data-label="About">{e.subject || e.reference || '—'}</td>
                  <td data-label="Message" className="a-clip">{e.message}</td>
                  <td data-label="Type"><Badge tone="info">{e.type}</Badge></td>
                  <td data-label="Status"><Badge>{e.status}</Badge></td>
                  <td data-label="Received">{formatDateTime(e.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager {...list} />

      <Modal open={Boolean(open)} onClose={() => setOpen(null)} wide title={open ? `Enquiry from ${open.name}` : ''}
        footer={open && <><Btn variant="ghost" onClick={remove}>Delete</Btn><Btn variant="ghost" onClick={() => setOpen(null)}>Close</Btn></>}>
        {open && (
          <div className="a-detail">
            {error && <p className="a-error" role="alert">{error}</p>}
            <div className="a-grid a-grid--2">
              <section>
                <h3>Message</h3>
                <dl className="a-dl">
                  {open.phone && <><dt>Phone</dt><dd><a href={`tel:${open.phone}`}>{open.phone}</a> · <a href={`https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`} target="_blank" rel="noopener noreferrer">WhatsApp</a></dd></>}
                  {open.email && <><dt>Email</dt><dd><a href={`mailto:${open.email}`}>{open.email}</a></dd></>}
                  {open.subject && <><dt>Subject</dt><dd>{open.subject}</dd></>}
                  {open.reference && <><dt>About</dt><dd>{open.reference}</dd></>}
                  <dt>Received</dt><dd>{formatDateTime(open.createdAt)}</dd>
                </dl>
                <p className="a-quote">{open.message}</p>
              </section>
              <section>
                <h3>Follow-up</h3>
                <SelectField label="Status" value={open.status} onChange={changeStatus} options={STATUSES} disabled={saving} />
                <TextArea label="Add an internal note" rows={3} value={note} onChange={setNote} maxLength={1000} />
                <Btn size="sm" variant="outline" onClick={addNote} disabled={saving || !note.trim()}>Add note</Btn>
              </section>
            </div>
            {open.notes?.length > 0 && (<><h3>Notes</h3><ol className="a-timeline">{[...open.notes].reverse().map((n, i) => <li key={i}><span>{n.text}</span><small>{formatDateTime(n.at)} · {n.by}</small></li>)}</ol></>)}
          </div>
        )}
      </Modal>
    </>
  );
}
