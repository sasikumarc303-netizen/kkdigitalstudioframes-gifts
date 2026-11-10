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
  const { config, loading, error, reload } = useSite();
  const { pathname } = useLocation();
  const outlet = useOutlet();
  const reduce = useReducedMotion();

  if (loading && !config) return <div className="splash" role="status" aria-label="Loading"><span className="splash__mark">KK</span></div>;
  if (error || !config) {
    return (
      <div className="splash splash--error">
        <h1>We’ll be right back</h1>
        <p>{error?.message || 'The website could not be loaded.'}</p>
        <Btn onClick={reload}>Try again</Btn>
      </div>
    );
  }

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <ScrollToTop />
      <Seo />
      <Header />
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
