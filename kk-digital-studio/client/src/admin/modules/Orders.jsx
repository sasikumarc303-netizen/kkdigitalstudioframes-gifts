import { useState } from 'react';
import Img from '../../components/Img.jsx';
import { Btn } from '../../components/Buttons.jsx';
import { useToast } from '../../components/Toast.jsx';
import { api } from '../../services/api.js';
import { formatDateTime, money } from '../../services/format.js';
import { usePaged } from '../hooks/usePaged.js';
import { Badge, Chips, EmptyRow, ErrorBox, Loading, Modal, PageHeader, Pager, SearchBox, SelectField, TextArea, useConfirm, useSaveState } from '../components/ui.jsx';

export const ORDER_STATUSES = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
const PAYMENT = ['Unpaid', 'Paid', 'Refunded'];

function Timeline({ items }) {
  return (
    <ol className="a-timeline">
      {[...items].reverse().map((h, i) => (
        <li key={i}><b>{h.status || h.action}</b>{h.note && <span>{h.note}</span>}<small>{formatDateTime(h.at)} · {h.by}</small></li>
      ))}
    </ol>
  );
}

export default function Orders() {
  const toast = useToast();
  const confirm = useConfirm();
  const [status, setStatus] = useState('');
  const [pay, setPay] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const list = usePaged('/admin/orders', { filters: { status, paymentStatus: pay, from, to } });
  const [open, setOpen] = useState(null);
  const [next, setNext] = useState({ status: '', note: '', paymentStatus: '', adminNotes: '' });
  const [{ saving, error }, run] = useSaveState();
  const counts = list.extra.statusCounts || {};
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const show = (o) => { setOpen(o); setNext({ status: o.status, note: '', paymentStatus: o.paymentStatus, adminNotes: o.adminNotes || '' }); };

  const save = async () => {
    const r = await run(async () => {
      let o = open;
      if (next.status !== open.status) o = await api.patch(`/admin/orders/${open.id}/status`, { status: next.status, note: next.note });
      if (next.paymentStatus !== o.paymentStatus || next.adminNotes !== (o.adminNotes || '')) o = await api.put(`/admin/orders/${open.id}`, { paymentStatus: next.paymentStatus, adminNotes: next.adminNotes });
      return o;
    });
    if (r) { toast('Order updated'); setOpen(null); list.reload(); }
  };

  const doCancel = async () => {
    if (!(await confirm({ title: 'Cancel this order?', message: 'Reserved stock will be returned to inventory. A cancelled order cannot be reopened.', confirmLabel: 'Cancel order' }))) return;
    setNext((n) => ({ ...n, status: 'Cancelled' }));
  };

  const remove = async () => {
    if (!(await confirm({ title: 'Delete this order?', message: 'The order record will be permanently deleted.', confirmLabel: 'Delete' }))) return;
    try { await api.del(`/admin/orders/${open.id}`); toast('Order deleted'); setOpen(null); list.reload(); } catch (e) { toast(e.message, 'error'); }
  };

  const locked = open?.status === 'Cancelled';
  const canDelete = open && (open.status === 'Cancelled' || open.status === 'Delivered');
  const addr = open?.shippingAddress;

  return (
    <>
      <PageHeader title="Orders" subtitle="Photo-frame orders placed on the website. Update status as you confirm, prepare and deliver." />
      <Chips value={status} onChange={setStatus} counts={{ '': total, ...counts }} options={[{ value: '', label: 'All' }, ...ORDER_STATUSES]} />
      <div className="a-toolbar">
        <SearchBox value={list.q} onChange={list.setQ} placeholder="Order no., name, phone, email…" />
        <label className="a-inline-field"><span>Payment</span><select value={pay} onChange={(e) => setPay(e.target.value)}><option value="">Any</option>{PAYMENT.map((p) => <option key={p}>{p}</option>)}</select></label>
        <label className="a-inline-field"><span>From</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="a-inline-field"><span>To</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </div>
      <ErrorBox error={list.error} onRetry={list.reload} />
      {list.loading && !list.items.length ? <Loading /> : list.items.length === 0 ? <EmptyRow>No orders {status || pay || list.q ? 'match these filters' : 'yet'}.</EmptyRow> : (
        <div className="a-table-wrap">
          <table className="a-table a-table--clickable">
            <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th>Placed</th></tr></thead>
            <tbody>
              {list.items.map((o) => (
                <tr key={o.id} onClick={() => show(o)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && show(o)} className={list.loading ? 'is-stale' : ''}>
                  <td data-label="Order"><strong>{o.orderNumber}</strong></td>
                  <td data-label="Customer">{o.contact.name}<small className="a-sub">{o.contact.phone}</small></td>
                  <td data-label="Items">{o.items.reduce((a, i) => a + i.quantity, 0)}</td>
                  <td data-label="Total">{money(o.total)}</td>
                  <td data-label="Payment"><Badge>{o.paymentStatus}</Badge></td>
                  <td data-label="Status"><Badge>{o.status}</Badge></td>
                  <td data-label="Placed">{formatDateTime(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager {...list} />

      <Modal open={Boolean(open)} onClose={() => !saving && setOpen(null)} wide title={open ? `Order ${open.orderNumber}` : ''}
        footer={open && <>{canDelete && <Btn variant="ghost" onClick={remove} disabled={saving}>Delete</Btn>}<Btn variant="ghost" onClick={() => setOpen(null)} disabled={saving}>Close</Btn><Btn onClick={save} disabled={saving || locked && next.paymentStatus === open.paymentStatus && next.adminNotes === (open.adminNotes || '')}>{saving ? 'Saving…' : 'Save changes'}</Btn></>}>
        {open && (
          <div className="a-detail">
            {error && <p className="a-error" role="alert">{error}</p>}
            <div className="a-grid a-grid--2">
              <section>
                <h3>Customer</h3>
                <dl className="a-dl">
                  <dt>Name</dt><dd>{open.contact.name}</dd>
                  <dt>Phone</dt><dd><a href={`tel:${open.contact.phone}`}>{open.contact.phone}</a></dd>
                  {open.contact.email && <><dt>Email</dt><dd><a href={`mailto:${open.contact.email}`}>{open.contact.email}</a></dd></>}
                  <dt>Fulfilment</dt><dd>{open.fulfilment === 'pickup' ? 'Store pickup' : 'Delivery'}</dd>
                  {open.fulfilment !== 'pickup' && addr && <><dt>Address</dt><dd>{[addr.line1, addr.line2, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}</dd></>}
                  <dt>Payment method</dt><dd>{open.paymentMethod}</dd>
                  {open.notes && <><dt>Customer note</dt><dd>{open.notes}</dd></>}
                </dl>
              </section>
              <section>
                <h3>Update</h3>
                <SelectField label="Order status" value={next.status} onChange={(v) => (v === 'Cancelled' ? doCancel() : setNext((n) => ({ ...n, status: v })))} options={locked ? ['Cancelled'] : ORDER_STATUSES} disabled={locked} hint={locked ? 'Cancelled orders cannot be reopened' : undefined} />
                {next.status !== open.status && <TextArea label="Note for history (optional)" rows={2} value={next.note} onChange={(v) => setNext((n) => ({ ...n, note: v }))} />}
                <SelectField label="Payment status" value={next.paymentStatus} onChange={(v) => setNext((n) => ({ ...n, paymentStatus: v }))} options={PAYMENT} />
                <TextArea label="Internal notes" rows={3} value={next.adminNotes} onChange={(v) => setNext((n) => ({ ...n, adminNotes: v }))} hint="Only visible to your team" />
              </section>
            </div>
            <h3>Items</h3>
            <ul className="a-items">
              {open.items.map((it, i) => (
                <li key={i}>
                  <Img src={it.image} alt="" ratio="1/1" width={80} />
                  <span><b>{it.name}</b><small>{[it.size, it.finish].filter(Boolean).join(' · ')}{it.sku ? ` · ${it.sku}` : ''}</small></span>
                  <span>{it.quantity} × {money(it.unitPrice)}</span><strong>{money(it.lineTotal)}</strong>
                </li>
              ))}
            </ul>
            <dl className="a-totals"><dt>Subtotal</dt><dd>{money(open.subtotal)}</dd><dt>Shipping</dt><dd>{open.shipping ? money(open.shipping) : 'Free'}</dd><dt>Total</dt><dd>{money(open.total)}</dd></dl>
            <h3>History</h3>
            <Timeline items={open.history || []} />
          </div>
        )}
      </Modal>
    </>
  );
}
