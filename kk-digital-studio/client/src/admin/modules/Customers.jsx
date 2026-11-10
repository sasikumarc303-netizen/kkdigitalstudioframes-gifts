import { useState } from 'react';
import { Btn } from '../../components/Buttons.jsx';
import { useToast } from '../../components/Toast.jsx';
import { api } from '../../services/api.js';
import { formatDate, formatDateTime, formatTime, money } from '../../services/format.js';
import { usePaged } from '../hooks/usePaged.js';
import { Badge, EmptyRow, ErrorBox, Loading, Modal, PageHeader, Pager, SearchBox, TextArea, TextField, useConfirm, useSaveState } from '../components/ui.jsx';

export default function Customers() {
  const toast = useToast();
  const confirm = useConfirm();
  const list = usePaged('/admin/customers');
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(null);
  const [loadingId, setLoadingId] = useState('');
  const [{ saving, error, errors }, run] = useSaveState();
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const open = async (c) => {
    setLoadingId(c.id);
    try {
      const d = await api.get(`/admin/customers/${c.id}`);
      setDetail(d);
      setForm({ name: d.customer.name, phone: d.customer.phone, email: d.customer.email, address: d.customer.address, notes: d.customer.notes });
    } catch (e) { toast(e.message, 'error'); } finally { setLoadingId(''); }
  };

  const save = async () => {
    const r = await run(() => api.put(`/admin/customers/${detail.customer.id}`, form));
    if (r) { toast('Customer updated'); setDetail(null); list.reload(); }
  };
  const remove = async () => {
    if (!(await confirm({ title: 'Delete this customer?', message: 'Their orders and bookings stay on record with the contact details they provided.', confirmLabel: 'Delete' }))) return;
    try { await api.del(`/admin/customers/${detail.customer.id}`); toast('Customer deleted'); setDetail(null); list.reload(); } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <>
      <PageHeader title="Customers" subtitle="Created automatically from bookings, orders and enquiries, matched by phone number." />
      <div className="a-toolbar"><SearchBox value={list.q} onChange={list.setQ} placeholder="Name, phone or email…" /></div>
      <ErrorBox error={list.error} onRetry={list.reload} />
      {list.loading && !list.items.length ? <Loading /> : list.items.length === 0 ? <EmptyRow>{list.q ? 'No customers match your search.' : 'No customers yet. They appear automatically when someone books, orders or enquires.'}</EmptyRow> : (
        <div className="a-table-wrap">
          <table className="a-table a-table--clickable">
            <thead><tr><th>Customer</th><th>Email</th><th>Bookings</th><th>Orders</th><th>Total ordered</th><th>Since</th></tr></thead>
            <tbody>
              {list.items.map((c) => (
                <tr key={c.id} onClick={() => open(c)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && open(c)} className={list.loading || loadingId === c.id ? 'is-stale' : ''}>
                  <td data-label="Customer"><strong>{c.name}</strong><small className="a-sub">{c.phone}</small></td>
                  <td data-label="Email">{c.email || '—'}</td>
                  <td data-label="Bookings">{c.bookingCount}</td>
                  <td data-label="Orders">{c.orderCount}</td>
                  <td data-label="Total ordered">{money(c.totalSpent)}</td>
                  <td data-label="Since">{formatDate(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager {...list} />

      <Modal open={Boolean(detail)} onClose={() => !saving && setDetail(null)} wide title={detail ? detail.customer.name : ''}
        footer={detail && <><Btn variant="ghost" onClick={remove} disabled={saving}>Delete</Btn><Btn variant="ghost" onClick={() => setDetail(null)} disabled={saving}>Close</Btn><Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Btn></>}>
        {detail && form && (
          <div className="a-detail">
            {error && <p className="a-error" role="alert">{error}</p>}
            <div className="a-form">
              <div className="a-form__item"><TextField label="Name" value={form.name} onChange={set('name')} error={errors.name} required /></div>
              <div className="a-form__item"><TextField label="Phone" value={form.phone} onChange={set('phone')} error={errors.phone} /></div>
              <div className="a-form__item"><TextField label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} /></div>
              <div className="a-form__item"><TextField label="Address" value={form.address} onChange={set('address')} error={errors.address} /></div>
              <div className="a-form__item is-wide"><TextArea label="Internal notes" rows={3} value={form.notes} onChange={set('notes')} /></div>
            </div>
            <h3>Bookings ({detail.bookings.length})</h3>
            {detail.bookings.length === 0 ? <p className="a-muted">None</p> : <ul className="a-simple-list">{detail.bookings.map((b) => <li key={b.id}><span>{b.reference} · {b.serviceTitle}<small>{formatDate(b.date)} at {formatTime(b.time)}</small></span><Badge>{b.status}</Badge></li>)}</ul>}
            <h3>Orders ({detail.orders.length})</h3>
            {detail.orders.length === 0 ? <p className="a-muted">None</p> : <ul className="a-simple-list">{detail.orders.map((o) => <li key={o.id}><span>{o.orderNumber} · {money(o.total)}<small>{formatDateTime(o.createdAt)}</small></span><Badge>{o.status}</Badge></li>)}</ul>}
            <h3>Enquiries ({detail.enquiries.length})</h3>
            {detail.enquiries.length === 0 ? <p className="a-muted">None</p> : <ul className="a-simple-list">{detail.enquiries.map((e) => <li key={e.id}><span>{e.subject || e.type}<small>{formatDateTime(e.createdAt)}</small></span><Badge>{e.status}</Badge></li>)}</ul>}
          </div>
        )}
      </Modal>
    </>
  );
}
