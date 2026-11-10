import { useState } from 'react';
import { formatDateTime } from '../../services/format.js';
import { usePaged } from '../hooks/usePaged.js';
import { Badge, Chips, EmptyRow, ErrorBox, Loading, PageHeader, Pager, SearchBox } from '../components/ui.jsx';

const ACTIONS = ['', 'create', 'update', 'delete', 'status', 'upload', 'login', 'logout'];

export default function Logs() {
  const [action, setAction] = useState('');
  const list = usePaged('/admin/logs', { filters: { action }, limit: 40 });
  return (
    <>
      <PageHeader title="Activity logs" subtitle="A record of what happened in the admin panel and on public forms." />
      <Chips value={action} onChange={setAction} options={ACTIONS.map((a) => ({ value: a, label: a ? a[0].toUpperCase() + a.slice(1) : 'All' }))} />
      <div className="a-toolbar"><SearchBox value={list.q} onChange={list.setQ} placeholder="Search activity…" /></div>
      <ErrorBox error={list.error} onRetry={list.reload} />
      {list.loading && !list.items.length ? <Loading /> : list.items.length === 0 ? <EmptyRow>No activity recorded.</EmptyRow> : (
        <div className="a-table-wrap">
          <table className="a-table">
            <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Details</th></tr></thead>
            <tbody>
              {list.items.map((l) => (
                <tr key={l.id} className={list.loading ? 'is-stale' : ''}>
                  <td data-label="When">{formatDateTime(l.createdAt)}</td>
                  <td data-label="Who">{l.actorName}{l.actorType !== 'admin' && <small className="a-sub">{l.actorType}</small>}</td>
                  <td data-label="Action"><Badge tone="info">{l.action}</Badge></td>
                  <td data-label="Details">{l.summary}{l.ip && <small className="a-sub">{l.ip}</small>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager {...list} />
    </>
  );
}
