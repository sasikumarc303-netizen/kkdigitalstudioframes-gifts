import { useState } from 'react';
import Img from './Img.jsx';
import Icon from './Icon.jsx';
import Lightbox from './Lightbox.jsx';
import Reveal, { ImageReveal } from './Reveal.jsx';
import { Btn } from './Buttons.jsx';
import { useSite } from '../context/SiteContext.jsx';

export function PageHero({ eyebrow, title, text, children }) {
  return (
    <section className="page-hero">
      <div className="container">
        <Reveal>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
          {text && <p className="page-hero__text">{text}</p>}
          {children}
        </Reveal>
      </div>
    </section>
  );
}

/** Image + text split block. */
export function Split({ section, reverse = false, cta, tone = 'ivory' }) {
  return (
    <section className={`section section--${tone}`}>
      <div className={`container split ${reverse ? 'split--reverse' : ''}`}>
        <ImageReveal className="split__media">
          <Img src={section.image} alt={section.title} ratio="4/3" width={900} icon="camera" />
        </ImageReveal>
        <Reveal className="split__text" delay={0.1}>
          {section.eyebrow && <p className="eyebrow">{section.eyebrow}</p>}
          <h2>{section.title}</h2>
          <p>{section.text}</p>
          {section.points?.length > 0 && (
            <ul className="ticks">{section.points.map((p) => <li key={p}><Icon name="check" size={16} />{p}</li>)}</ul>
          )}
          {cta}
        </Reveal>
      </div>
    </section>
  );
}

/** Masonry grid of published gallery photos that opens the lightbox. */
export function MasonryGallery({ items }) {
  const [index, setIndex] = useState(null);
  return (
    <>
      <div className="masonry">
        {items.map((g, i) => (
          <Reveal key={g.id} className="masonry__item" delay={(i % 3) * 0.06} y={20}>
            <button type="button" className="masonry__btn" onClick={() => setIndex(i)} aria-label={`Open photo${g.title ? `: ${g.title}` : ''}`}>
              <Img src={g.image} alt={g.title || g.caption || 'Photograph'} ratio={g.width && g.height ? `${g.width}/${g.height}` : '4/5'} width={720} sizes="(max-width: 600px) 100vw, (max-width: 1024px) 50vw, 33vw" />
              <span className="masonry__zoom"><Icon name="zoom" size={20} /></span>
              {(g.title || g.category?.name) && (
                <span className="masonry__cap">
                  {g.category?.name && <small>{g.category.name}</small>}
                  {g.title && <strong>{g.title}</strong>}
                </span>
              )}
            </button>
          </Reveal>
        ))}
      </div>
      <Lightbox items={items} index={index} onIndex={setIndex} onClose={() => setIndex(null)} />
    </>
  );
}

export function ContactBlock({ wide = false }) {
  const { config, waLink, telLink, mapsLink, mapsEmbed, hasPhone } = useSite();
  const c = config.contact;
  const embed = mapsEmbed();
  return (
    <div className={`contact-block ${wide ? 'contact-block--wide' : ''}`}>
      <div className="contact-block__info">
        <ul className="contact-list">
          {c.address && <li><Icon name="pin" /><div><strong>Studio address</strong><span>{c.address}</span></div></li>}
          {hasPhone && c.phone && <li><Icon name="phone" /><div><strong>Call us</strong><a href={telLink()}>{c.phone}</a></div></li>}
          {waLink() && <li><Icon name="whatsapp" /><div><strong>WhatsApp</strong><a href={waLink('Hello, I would like to make an enquiry.')} target="_blank" rel="noopener noreferrer">Message us</a></div></li>}
          {c.email && <li><Icon name="mail" /><div><strong>Email</strong><a href={`mailto:${c.email}`}>{c.email}</a></div></li>}
          {c.hours.length > 0 && (
            <li><Icon name="clock" /><div><strong>Opening hours</strong>{c.hours.map((h, i) => <span key={i}>{h.days}: {h.time}</span>)}</div></li>
          )}
        </ul>
        <div className="contact-block__actions">
          {mapsLink() && <Btn href={mapsLink()} icon="pin" variant="primary">Get directions</Btn>}
          {hasPhone && <Btn href={telLink()} icon="phone" variant="outline">Call now</Btn>}
          {waLink() && <Btn href={waLink('Hello, I would like to make an enquiry.')} icon="whatsapp" variant="outline">WhatsApp</Btn>}
        </div>
      </div>
      {embed && (
        <div className="contact-block__map">
          <iframe title="Studio location on Google Maps" src={embed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
        </div>
      )}
    </div>
  );
}
