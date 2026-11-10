import { Link } from 'react-router-dom';
import Icon from './Icon.jsx';
import { useSite } from '../context/SiteContext.jsx';

/** Polymorphic button: `to` (router link), `href` (external) or a plain <button>. */
export function Btn({ to, href, variant = 'primary', size = 'md', icon, iconRight, children, className = '', block = false, ...rest }) {
  const cls = `btn btn--${variant} btn--${size} ${block ? 'btn--block' : ''} ${className}`;
  const inner = (
    <>
      {icon && <Icon name={icon} size={18} />}
      <span>{children}</span>
      {iconRight && <Icon name={iconRight} size={18} />}
    </>
  );
  if (to) return <Link to={to} className={cls} {...rest}>{inner}</Link>;
  if (href) {
    const external = /^https?:/i.test(href);
    return (
      <a href={href} className={cls} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} {...rest}>
        {inner}
      </a>
    );
  }
  return <button type="button" className={cls} {...rest}>{inner}</button>;
}

/** Renders a CTA defined in the admin panel: { label, type: route|whatsapp|call|url, target, variant }. */
export function CtaButton({ cta, size = 'lg', onDark = false }) {
  const { waLink, telLink } = useSite();
  if (!cta || cta.visible === false) return null;
  const variant = onDark ? ({ primary: 'light', secondary: 'outline-light', ghost: 'ghost-light' }[cta.variant] || 'light') : cta.variant || 'primary';
  const common = { variant, size, children: cta.label };
  if (cta.type === 'whatsapp') {
    const href = waLink(cta.target || 'Hello KK Digital Studio, I would like to know more about your photography services.');
    return href ? <Btn href={href} icon="whatsapp" {...common} /> : <Btn to="/contact" icon="whatsapp" {...common} />;
  }
  if (cta.type === 'call') {
    const href = telLink();
    return href ? <Btn href={href} icon="phone" {...common} /> : <Btn to="/contact" icon="phone" {...common} />;
  }
  if (cta.type === 'url' && cta.target) return <Btn href={cta.target} {...common} />;
  return <Btn to={cta.target || '/'} {...common} />;
}
