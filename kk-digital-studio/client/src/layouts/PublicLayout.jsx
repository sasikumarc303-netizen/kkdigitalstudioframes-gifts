import { useEffect } from 'react';
import { Outlet, useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import WhatsAppFloat from '../components/WhatsAppFloat.jsx';
import Seo from '../components/Seo.jsx';
import { Btn } from '../components/Buttons.jsx';
import { SiteProvider, useSite } from '../context/SiteContext.jsx';
import { CartProvider } from '../context/CartContext.jsx';
import { ToastProvider } from '../components/Toast.jsx';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, [pathname]);
  return null;
}

function Shell() {
  const { config, usingFallback, reload } = useSite();
  const { pathname } = useLocation();
  const outlet = useOutlet();
  const reduce = useReducedMotion();

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== 's') return;
      const target = event.target;
      if (target instanceof HTMLElement && (
        target.isContentEditable ||
        target.closest('input, textarea, select, [contenteditable="true"]')
      )) return;
      if (!document.querySelector('[data-protected-media] img, [data-protected-media] video')) return;
      event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <ScrollToTop />
      <Seo />
      <Header />
      {usingFallback && (
        <div className="container" role="status">
          <p className="muted small">
            Live site settings could not be refreshed. Showing the last available studio information; online actions still require a live connection.
            {' '}<Btn size="sm" variant="ghost" onClick={reload}>Retry</Btn>
          </p>
        </div>
      )}
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          id="main"
          key={pathname}
          className="page"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          {outlet}
        </motion.main>
      </AnimatePresence>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}

export default function PublicLayout() {
  return (
    <SiteProvider>
      <CartProvider>
        <ToastProvider>
          <Shell />
        </ToastProvider>
      </CartProvider>
    </SiteProvider>
  );
}
// Outlet is re-exported for pages that need nested routes in the future.
export { Outlet };
