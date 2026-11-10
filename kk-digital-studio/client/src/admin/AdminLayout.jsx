import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../components/Toast.jsx';
import { Loading } from './components/ui.jsx';

export const NAV = [
  { group: 'Overview', items: [{ perm: 'dashboard', to: 'dashboard', label: 'Dashboard', icon: 'dashboard' }] },
  {
    group: 'Website',
    items: [
      { perm: 'homepage', to: 'homepage', label: 'Homepage', icon: 'home' },
      { perm: 'videos', to: 'videos', label: 'Video', icon: 'video' },
      { perm: 'gallery', to: 'gallery', label: 'Gallery', icon: 'image' },
      { perm: 'services', to: 'services', label: 'Services', icon: 'camera' },
      { perm: 'packages', to: 'packages', label: 'Packages', icon: 'gift' },
      { perm: 'testimonials', to: 'testimonials', label: 'Testimonials', icon: 'quote' },
      { perm: 'contact', to: 'contact', label: 'Contact info', icon: 'phone' },
      { perm: 'navigation', to: 'navigation', label: 'Navigation', icon: 'list' },
    ],
  },
  {
    group: 'Shop',
    items: [
      { perm: 'products', to: 'products', label: 'Products', icon: 'frame' },
      { perm: 'categories', to: 'categories', label: 'Categories', icon: 'tag' },
      { perm: 'orders', to: 'orders', label: 'Orders', icon: 'truck' },
    ],
  },
  {
    group: 'Clients',
    items: [
      { perm: 'bookings', to: 'bookings', label: 'Bookings', icon: 'calendar' },
      { perm: 'customers', to: 'customers', label: 'Customers', icon: 'users' },
      { perm: 'enquiries', to: 'enquiries', label: 'Enquiries', icon: 'inbox' },
    ],
  },
  {
    group: 'System',
    items: [
      { perm: 'settings', to: 'settings', label: 'Website settings', icon: 'settings' },
      { perm: 'seo', to: 'seo', label: 'SEO', icon: 'search' },
      { perm: 'media', to: 'media', label: 'Media library', icon: 'upload' },
      { perm: 'users', to: 'users', label: 'Users & permissions', icon: 'shield' },
      { perm: 'logs', to: 'logs', label: 'Activity logs', icon: 'logs' },
    ],
  },
];

export default function AdminLayout() {
  const { user, loading, logout, can } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [location.pathname]);
  useEffect(() => { document.body.classList.add('is-admin'); return () => document.body.classList.remove('is-admin'); }, []);

  if (loading) return <div className="a-boot"><Loading rows={3} /></div>;
  if (!user) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;

  const allowed = NAV.map((g) => ({ ...g, items: g.items.filter((i) => can(i.perm)) })).filter((g) => g.items.length);
  const current = allowed.flatMap((g) => g.items).find((i) => location.pathname.startsWith(`/admin/${i.to}`));
  const onAccount = location.pathname.startsWith('/admin/account');
  const first = allowed[0]?.items[0];

  // A signed-in user opening a module they have no permission for is sent to their first allowed one.
  if (!onAccount && !current) return first ? <Navigate to={`/admin/${first.to}`} replace /> : (
    <div className="a-boot"><p>Your account has no module permissions yet. Ask a superadmin to grant access.</p><button className="btn btn--outline btn--sm" onClick={logout}>Sign out</button></div>
  );

  const doLogout = async () => { try { await logout(); } catch (e) { toast(e.message, 'error'); } };

  return (
    <div className="a-shell">
      <a className="skip-link" href="#a-main">Skip to content</a>
      <aside className={`a-side ${open ? 'is-open' : ''}`} aria-label="Admin navigation">
        <div className="a-side__brand">
          <Link to="/admin/dashboard"><Icon name="camera" size={22} /><span>KK Digital<br /><small>Admin</small></span></Link>
          <button type="button" className="a-icon-btn a-side__close" onClick={() => setOpen(false)} aria-label="Close menu"><Icon name="close" /></button>
        </div>
        <nav>
          {allowed.map((g) => (
            <div className="a-nav__group" key={g.group}>
              <p>{g.group}</p>
              {g.items.map((i) => (
                <NavLink key={i.to} to={`/admin/${i.to}`} className={({ isActive }) => `a-nav__link ${isActive ? 'is-active' : ''}`}>
                  <Icon name={i.icon} size={18} /><span>{i.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="a-side__foot">
          <a href="/" target="_blank" rel="noopener noreferrer" className="a-nav__link"><Icon name="eye" size={18} /><span>View website</span></a>
        </div>
      </aside>
      {open && <div className="a-scrim" onClick={() => setOpen(false)} aria-hidden="true" />}

      <div className="a-main">
        <header className="a-top">
          <button type="button" className="a-icon-btn a-top__menu" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}><Icon name="menu" /></button>
          <strong className="a-top__title">{current?.label || 'My account'}</strong>
          <div className="a-top__user">
            <Link to="/admin/account" className="a-top__me"><span className="a-avatar" aria-hidden="true">{user.name.slice(0, 1).toUpperCase()}</span><span><b>{user.name}</b><small>{user.role}</small></span></Link>
            <button type="button" className="a-icon-btn" onClick={doLogout} aria-label="Sign out" title="Sign out"><Icon name="logout" /></button>
          </div>
        </header>
        <main id="a-main" className="a-content" tabIndex={-1}><Outlet /></main>
      </div>
    </div>
  );
}
