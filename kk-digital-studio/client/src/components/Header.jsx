import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from './Icon.jsx';
import { Btn } from './Buttons.jsx';
import { useSite } from '../context/SiteContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { useScrolled, useLockBody } from '../hooks/useMedia.js';

export function Brand({ light = false }) {
  const { config, brand } = useSite();
  const logo = config?.general?.logo;
  return (
    <Link to="/" className={`brand ${light ? 'brand--light' : ''}`} aria-label={`${brand} – home`}>
      {logo ? <img src={logo} alt={brand} className="brand__logo" height="44" /> : (
        <>
          <span className="brand__mark" aria-hidden="true">KK</span>
          <span className="brand__word">
            <strong>{brand.replace(/ studio$/i, '').toUpperCase()}</strong>
            <small>STUDIO</small>
          </span>
        </>
      )}
    </Link>
  );
}

export default function Header() {
  const { config } = useSite();
  const { count } = useCart();
  const { pathname } = useLocation();
  const scrolled = useScrolled(24);
  const [open, setOpen] = useState(false);
  const overHero = pathname === '/' && !scrolled && !open;
  useLockBody(open);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const nav = (config?.navigation || []).filter((n) => n.visible !== false);
  const isExternal = (p) => /^https?:/i.test(p);

  const renderLink = (n, extra = {}) =>
    isExternal(n.path) ? (
      <a key={n.label + n.path} href={n.path} target="_blank" rel="noopener noreferrer" {...extra}>{n.label}</a>
    ) : (
      <NavLink key={n.label + n.path} to={n.path} end={n.path === '/'} className={({ isActive }) => (isActive ? 'is-active' : '')} {...extra}>
        {n.label}
      </NavLink>
    );

  return (
    <>
      <header className={`header ${overHero ? 'header--hero' : 'header--solid'} ${open ? 'is-open' : ''}`}>
        <div className="header__inner">
          <Brand light={overHero || open} />
          <nav className="header__nav" aria-label="Primary">{nav.map((n) => renderLink(n))}</nav>
          <div className="header__actions">
            <Link to="/cart" className="header__cart" aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}>
              <Icon name="cart" size={22} />
              {count > 0 && <span className="header__badge">{count}</span>}
            </Link>
            <Btn to="/booking" size="sm" variant={overHero ? 'light' : 'primary'} className="header__book">Book now</Btn>
            <button type="button" className="header__toggle" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen((o) => !o)}>
              <Icon name={open ? 'close' : 'menu'} size={26} />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div id="mobile-menu" className="mobile-menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <nav aria-label="Mobile">
              {nav.map((n, i) => (
                <motion.div key={n.label + n.path} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i + 0.08 }}>
                  {renderLink(n)}
                </motion.div>
              ))}
              <motion.div className="mobile-menu__cta" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * nav.length + 0.1 }}>
                <Btn to="/booking" variant="light" size="lg" block>Book your session</Btn>
                <Btn to="/cart" variant="outline-light" size="lg" block icon="cart">Cart{count > 0 ? ` (${count})` : ''}</Btn>
              </motion.div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
