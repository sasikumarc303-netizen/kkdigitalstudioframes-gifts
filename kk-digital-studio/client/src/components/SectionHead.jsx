import Reveal from './Reveal.jsx';

export default function SectionHead({ eyebrow, title, subtitle, align = 'center', as: Tag = 'h2', light = false, children }) {
  return (
    <Reveal className={`section-head section-head--${align} ${light ? 'is-light' : ''}`}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      {title && <Tag className="section-head__title">{title}</Tag>}
      {subtitle && <p className="section-head__sub">{subtitle}</p>}
      {children}
    </Reveal>
  );
}
