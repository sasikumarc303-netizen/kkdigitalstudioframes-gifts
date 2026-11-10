import { Link } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { api } from '../../services/api.js';
import { formatDate, formatDateTime, formatTime, money } from '../../services/format.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { BarChart, HBars, LineChart } from '../components/Charts.jsx';
import { Badge, Card, EmptyRow, ErrorBox, Loading, PageHeader } from '../components/ui.jsx';

function Stat({ to, icon, label, value, note, tone }) {
  const body = (
    <>
      <span className={`a-stat__icon ${tone ? `is-${tone}` : ''}`}><Icon name={icon} size={20} /></span>
      <span className="a-stat__text"><b>{value}</b><small>{label}</small>{note && <em>{note}</em>}</span>
    </>
  );
  return to ? <Link to={to} className="a-stat">{body}</Link> : <div className="a-stat">{body}</div>;
}

export default function Dashboard() {
  const { can, user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.get('/admin/dashboard'), []);

  if (loading && !data) return <><PageHeader title="Dashboard" /><Loading rows={5} /></>;
  if (error) return <><PageHeader title="Dashboard" /><ErrorBox error={error} onRetry={reload} /></>;
  const { bookings: b, orders: o, enquiries: e, inventory: inv, customers: c, services: s, gallery: g, recent = [] } = data;
  const nothing = !b && !o && !e && !inv && !c && !s && !g;

  return (
    <>
      <PageHeader title={`Welcome, ${user.name.split(' ')[0]}`} subtitle="A live summary of your studio. All figures come from your database." />
      {nothing && <Card><EmptyRow>Your role has no dashboard data to show. Use the menu to open the modules you can manage.</EmptyRow></Card>}

      <div className="a-stats">
        {b && <Stat to="/admin/bookings" icon="calendar" label="Pending bookings" value={b.pending} note={`${b.total} in total`} tone={b.pending ? 'warn' : ''} />}
        {b && <Stat to="/admin/bookings" icon="check" label="Confirmed bookings" value={b.confirmed} />}
        {o && <Stat to="/admin/orders" icon="truck" label="Pending orders" value={o.pending} note={`${o.total} in total`} tone={o.pending ? 'warn' : ''} />}
        {o && <Stat to="/admin/orders" icon="gift" label="Order value this month" value={money(o.revenueThisMonth)} note={`${money(o.revenuePaid)} marked paid overall`} />}
        {e && <Stat to="/admin/enquiries" icon="inbox" label="New enquiries" value={e.new} note={`${e.total} in total`} tone={e.new ? 'warn' : ''} />}
        {c && <Stat to="/admin/customers" icon="users" label="Customers" value={c.total} />}
        {s && <Stat to="/admin/services" icon="camera" label="Services" value={s.total} />}
        {g && <Stat to="/admin/gallery" icon="image" label="Published photos" value={g.published} />}
        {inv && <Stat to="/admin/products" icon="frame" label="Products" value={inv.products} note={`${inv.published} published · ${inv.units} units in stock`} />}
      </div>

      <div className="a-grid a-grid--2">
        {b && (
          <Card title="Booking requests · last 30 days">
            {b.total === 0 ? <EmptyRow>No bookings yet. They will appear here as customers book.</EmptyRow> : (
              <LineChart data={b.perDay.map((d) => ({ ...d, short: d.label.slice(5) }))} labelEvery={5} ariaLabel="Booking requests per day, last 30 days" />
            )}
          </Card>
        )}
        {o && (
          <Card title="Order value · last 6 months">
            {o.total === 0 ? <EmptyRow>No orders yet.</EmptyRow> : (
              <BarChart data={o.perMonth.map((d) => ({ ...d, short: d.label.slice(5) }))} format={(v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : v)} ariaLabel="Order value per month" />
            )}
          </Card>
        )}
        {b && <Card title="Bookings by status"><HBars data={Object.entries(b.byStatus).map(([label, value]) => ({ label, value }))} empty="No bookings yet" /></Card>}
        {b && <Card title="Most booked services"><HBars data={b.topServices} empty="No bookings yet" /></Card>}
        {o && <Card title="Orders by status"><HBars data={Object.entries(o.byStatus).map(([label, value]) => ({ label, value }))} empty="No orders yet" color="var(--brown)" /></Card>}
        {inv && (
          <Card title="Low stock" actions={inv.outOfStock ? <Badge tone="danger">{inv.outOfStock} sold out</Badge> : null}>
            {inv.low.length === 0 ? <EmptyRow>No priced variants are running low.</EmptyRow> : (
              <ul className="a-simple-list">{inv.low.map((l, i) => <li key={i}><span>{l.product}<small>{l.variant}</small></span><Badge tone="warning">{l.stock} left</Badge></li>)}</ul>
            )}
          </Card>
        )}
      </div>

      <div className="a-grid a-grid--2">
        {b && (
          <Card title="Upcoming confirmed sessions" actions={<Link to="/admin/bookings" className="a-link">All bookings</Link>}>
            {b.upcoming.length === 0 ? <EmptyRow>No confirmed upcoming sessions.</EmptyRow> : (
              <ul className="a-simple-list">{b.upcoming.map((x) => <li key={x.id}><span>{x.name} · {x.serviceTitle}<small>{formatDate(x.date)} at {formatTime(x.time)} · {x.reference}</small></span></li>)}</ul>
            )}
          </Card>
        )}
        <Card title="Recent activity" actions={can('logs') ? <Link to="/admin/logs" className="a-link">All activity</Link> : null}>
          {recent.length === 0 ? <EmptyRow>No activity recorded yet.</EmptyRow> : (
            <ul className="a-simple-list">{recent.map((l) => <li key={l.id}><span>{l.summary || l.action}<small>{l.actorName} · {formatDateTime(l.createdAt)}</small></span></li>)}</ul>
          )}
        </Card>
      </div>
    </>
  );
}
