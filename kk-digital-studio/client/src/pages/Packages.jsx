import { PageHero } from '../components/Sections.jsx';
import { PackageCard } from '../components/Cards.jsx';
import { Btn } from '../components/Buttons.jsx';
import Reveal from '../components/Reveal.jsx';
import { ErrorState, Skeleton, EmptyState } from '../components/States.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { useSite } from '../context/SiteContext.jsx';
import { api } from '../services/api.js';

export default function Packages() {
  const { data, loading, error, reload } = useAsync(() => api.get('/packages'), []);
  const { waLink } = useSite();
  return (
    <>
      <PageHero eyebrow="Packages" title="Photography packages" text="Pick a starting point and we’ll tailor it to your occasion, your people and your budget." />
      <section className="section section--ivory section--tight">
        <div className="container">
          {error && <ErrorState error={error} onRetry={reload} />}
          {loading && <div className="grid grid--3"><Skeleton h={420} /><Skeleton h={420} /><Skeleton h={420} /></div>}
          {data && data.length === 0 && <EmptyState title="Packages coming soon" text="Contact us for a personalised quote." action={<Btn to="/contact">Contact us</Btn>} />}
          {data && data.length > 0 && <div className="grid grid--3 grid--align-stretch">{data.map((p, i) => <PackageCard key={p.id} pkg={p} delay={(i % 3) * 0.08} />)}</div>}
          <Reveal className="note-card">
            <h3>Need something different?</h3>
            <p>Every occasion is unique. Tell us what you have in mind and we’ll put together a custom quote.</p>
            <div className="note-card__actions">
              <Btn to="/contact" variant="primary">Request a custom quote</Btn>
              {waLink() && <Btn href={waLink('Hello, I would like a custom photography quote.')} variant="outline" icon="whatsapp">WhatsApp</Btn>}
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
