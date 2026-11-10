import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { Brand } from './Header.jsx';
import { useSite } from '../context/SiteContext.jsx';

export default function Footer() {
  const { config, waLink, telLink, mapsLink, brand, hasPhone } = useSite();
  const c = config.contact;
  const nav = config.navigation.filter((n) => n.visible !== false);
  const social = [
    ['instagram', c.social.instagram, 'Instagram'],
    ['facebook', c.social.facebook, 'Facebook'],
    ['youtube', c.social.youtube, 'YouTube'],
    ['x', c.social.x, 'X'],
  ].filter(([, url]) => url);

  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div className="footer__brand">
          <Brand light />
          <p>{config.general.footerText}</p>
          {social.length > 0 && (
            <div className="footer__social">
              {social.map(([icon, url, label]) => (
                <a key={icon} href={url} target="_blank" rel="noopener noreferrer" aria-label={label}><Icon name={icon} /></a>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="footer__title">Explore</h3>
          <ul className="footer__links">
            {nav.map((n) => <li key={n.path + n.label}>{/^https?:/i.test(n.path) ? <a href={n.path} target="_blank" rel="noopener noreferrer">{n.label}</a> : <Link to={n.path}>{n.label}</Link>}</li>)}
            <li><Link to="/booking">Book a session</Link></li>
            <li><Link to="/orders">Track an order</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="footer__title">Visit & contact</h3>
          <ul className="footer__contact">
            {c.address && <li><Icon name="pin" size={18} /><span>{c.address}</span></li>}
            {hasPhone && c.phone && <li><Icon name="phone" size={18} /><a href={telLink()}>{c.phone}</a></li>}
            {waLink() && <li><Icon name="whatsapp" size={18} /><a href={waLink()} target="_blank" rel="noopener noreferrer">WhatsApp us</a></li>}
            {c.email && <li><Icon name="mail" size={18} /><a href={`mailto:${c.email}`}>{c.email}</a></li>}
            {mapsLink() && <li><Icon name="arrow" size={18} /><a href={mapsLink()} target="_blank" rel="noopener noreferrer">Get directions</a></li>}
          </ul>
        </div>

        {c.hours.length > 0 && (
          <div>
            <h3 className="footer__title">Opening hours</h3>
            <ul className="footer__hours">
              {c.hours.map((h, i) => <li key={i}><span>{h.days}</span><span>{h.time}</span></li>)}
            </ul>
          </div>
        )}
      </div>
      <div className="footer__bar">
        <div className="container footer__bar-inner">
          <span>© {new Date().getFullYear()} {brand}. All rights reserved.</span>
          <span>{c.address ? c.address.split(',').slice(0, 2).join(',') : ''}</span>
        </div>
      </div>
    </footer>
  );
}
