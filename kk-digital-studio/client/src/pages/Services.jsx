import { useState } from 'react';
import { PageHero } from '../components/Sections.jsx';
import Img from '../components/Img.jsx';
import Icon from '../components/Icon.jsx';
import Reveal, { ImageReveal } from '../components/Reveal.jsx';
import { Btn } from '../components/Buttons.jsx';
import { ErrorState, Skeleton, EmptyState } from '../components/States.jsx';
import { serviceIcon } from '../components/Cards.jsx';
import EnquiryModal from '../components/EnquiryModal.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { api } from '../services/api.js';

export default function Services() {
  const { data, loading, error, reload } = useAsync(() => api.get('/services'), []);
  const [enquiry, setEnquiry] = useState(null);

  return (
    <>
      <PageHero eyebrow="What we do" title="Photography services" text="From milestone celebrations to everyday portraits, printing and framing, explore everything we offer." />
      <section className="section section--ivory section--tight">
        <div className="container">
          {error && <ErrorState error={error} onRetry={reload} />}
          {loading && <div className="stack"><Skeleton h={320} /><Skeleton h={320} /></div>}
          {data && data.length === 0 && <EmptyState title="Services coming soon" text="Please check back shortly, or contact us directly." action={<Btn to="/contact">Contact us</Btn>} />}
          {data && data.length > 0 && (
            <div className="service-list">
              {data.map((s, i) => (
                <article key={s.id} className={`service-row ${i % 2 ? 'service-row--reverse' : ''}`} id={s.slug}>
                  <ImageReveal className="service-row__media">
                    <Img src={s.image} alt={s.image ? s.title : ''} ratio="4/3" width={900} icon={serviceIcon(s.title)} label={s.title} />
                  </ImageReveal>
                  <Reveal className="service-row__body" delay={0.08}>
                    <p className="eyebrow">{String(i + 1).padStart(2, '0')}</p>
                    <h2>{s.title}</h2>
                    {s.tagline && <p className="service-row__tag">{s.tagline}</p>}
                    <p>{s.description}</p>
                    {s.features.length > 0 && <ul className="ticks">{s.features.map((f) => <li key={f}><Icon name="check" size={16} />{f}</li>)}</ul>}
                    {s.startingPrice && <p className="service-row__price">{s.startingPrice}</p>}
                    <div className="service-row__actions">
                      <Btn to={`/booking?service=${s.id}`} variant="primary">Book this service</Btn>
                      <Btn variant="outline" onClick={() => setEnquiry(s)}>Enquire</Btn>
                    </div>
                  </Reveal>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
      <EnquiryModal
        open={Boolean(enquiry)}
        onClose={() => setEnquiry(null)}
        type="service"
        subject={enquiry?.title}
        reference={enquiry?.title}
        defaultMessage={enquiry ? `Hello, I'd like to know more about ${enquiry.title}.` : ''}
      />
    </>
  );
}
