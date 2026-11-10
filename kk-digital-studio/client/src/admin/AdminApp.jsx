import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '../components/Toast.jsx';
import { AuthProvider } from '../context/AuthContext.jsx';
import { ConfirmProvider, Loading } from './components/ui.jsx';
import AdminLayout from './AdminLayout.jsx';
import { Login, Forgot, Reset } from './pages/Auth.jsx';
import './admin.css';

const Dashboard = lazy(() => import('./modules/Dashboard.jsx'));
const Homepage = lazy(() => import('./modules/Homepage.jsx'));
const Videos = lazy(() => import('./modules/Videos.jsx'));
const Gallery = lazy(() => import('./modules/Gallery.jsx'));
const { Services, Packages, Categories, Testimonials } = {
  Services: lazy(() => import('./modules/Simple.jsx').then((m) => ({ default: m.Services }))),
  Packages: lazy(() => import('./modules/Simple.jsx').then((m) => ({ default: m.Packages }))),
  Categories: lazy(() => import('./modules/Simple.jsx').then((m) => ({ default: m.Categories }))),
  Testimonials: lazy(() => import('./modules/Simple.jsx').then((m) => ({ default: m.Testimonials }))),
};
const Products = lazy(() => import('./modules/Products.jsx'));
const Orders = lazy(() => import('./modules/Orders.jsx'));
const Bookings = lazy(() => import('./modules/Bookings.jsx'));
const Customers = lazy(() => import('./modules/Customers.jsx'));
const Enquiries = lazy(() => import('./modules/Enquiries.jsx'));
const ContactInfo = lazy(() => import('./modules/Settings.jsx').then((m) => ({ default: m.ContactInfo })));
const Navigation = lazy(() => import('./modules/Settings.jsx').then((m) => ({ default: m.Navigation })));
const SiteSettings = lazy(() => import('./modules/Settings.jsx').then((m) => ({ default: m.SiteSettings })));
const Seo_ = lazy(() => import('./modules/SeoManager.jsx'));
const MediaLibrary = lazy(() => import('./modules/MediaLibrary.jsx'));
const Users = lazy(() => import('./modules/Users.jsx'));
const Logs = lazy(() => import('./modules/Logs.jsx'));
const Account = lazy(() => import('./pages/Account.jsx'));

/** The admin area is private: keep it out of search results and give the tab a clear title (no public SiteProvider needed). */
function AdminHead() {
  useEffect(() => {
    const prev = document.title;
    document.title = 'Admin | KK Digital Studio';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => { document.title = prev; meta.remove(); };
  }, []);
  return null;
}

export default function AdminApp() {
  return (
    <ToastProvider>
      <AuthProvider>
        <ConfirmProvider>
          <AdminHead />
          <Suspense fallback={<div className="a-boot"><Loading rows={3} /></div>}>
            <Routes>
              <Route path="login" element={<Login />} />
              <Route path="forgot-password" element={<Forgot />} />
              <Route path="reset-password" element={<Reset />} />
              <Route element={<AdminLayout />}>
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="homepage" element={<Homepage />} />
                <Route path="videos" element={<Videos />} />
                <Route path="gallery" element={<Gallery />} />
                <Route path="services" element={<Services />} />
                <Route path="packages" element={<Packages />} />
                <Route path="products" element={<Products />} />
                <Route path="categories" element={<Categories />} />
                <Route path="orders" element={<Orders />} />
                <Route path="bookings" element={<Bookings />} />
                <Route path="customers" element={<Customers />} />
                <Route path="enquiries" element={<Enquiries />} />
                <Route path="testimonials" element={<Testimonials />} />
                <Route path="contact" element={<ContactInfo />} />
                <Route path="navigation" element={<Navigation />} />
                <Route path="settings" element={<SiteSettings />} />
                <Route path="seo" element={<Seo_ />} />
                <Route path="media" element={<MediaLibrary />} />
                <Route path="users" element={<Users />} />
                <Route path="logs" element={<Logs />} />
                <Route path="account" element={<Account />} />
              </Route>
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Routes>
          </Suspense>
        </ConfirmProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
