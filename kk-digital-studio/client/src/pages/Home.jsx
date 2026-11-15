import HeroVideo from '../components/HeroVideo.jsx';
import SectionHead from '../components/SectionHead.jsx';
import Reveal, { ImageReveal } from '../components/Reveal.jsx';
import Img from '../components/Img.jsx';
import { Btn } from '../components/Buttons.jsx';
import { ServiceCard, ProductCard, PackageCard, TestimonialCard } from '../components/Cards.jsx';
import { MasonryGallery, ContactBlock, Split } from '../components/Sections.jsx';
import { ErrorState, Skeleton } from '../components/States.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { api } from '../services/api.js';
import { useSite } from '../context/SiteContext.jsx';

export default function Home() {
  const { config, waLink } = useSite();
  const { data, loading, error, reload } = useAsync(() => api.get('/home'), []);
  const hp = config.homepage;
  const s = hp.sections;
  const ctas = hp.ctas.filter((c) => c.visible !== false);

  return (
    <>
      <HeroVideo hero={hp.hero} ctas={ctas} />

      {s.intro.visible && <Split section={s.intro} tone="ivory" />}
      {s.about.visible && (
        <Split
          section={s.about}
          reverse
          tone="white"
          cta={<Btn to="/about" variant="outline" iconRight="arrow">More about us</Btn>}
        />
      )}

      {error && <section className="section"><div className="container"><ErrorState error={error} onRetry={reload} /></div></section>}
      {loading && !data && (
        <section className="section"><div className="container grid grid--3"><Skeleton h={360} /><Skeleton h={360} /><Skeleton h={360} /></div></section>
      )}

      {data && (
        <>
          {s.services.visible && data.services.length > 0 && (
            <section className="section section--sand-soft">
              <div className="container">
                <SectionHead eyebrow={s.services.eyebrow} title={s.services.title} subtitle={s.services.subtitle} />
                <div className="grid grid--3">
                  {data.services.map((svc, i) => <ServiceCard key={svc.id} service={svc} delay={(i % 3) * 0.08} />)}
                </div>
                <div className="section__more"><Btn to="/services" variant="outline" iconRight="arrow">All services</Btn></div>
              </div>
            </section>
          )}

          {s.portfolio.visible && data.gallery.length > 0 && (
            <section className="section section--ivory">
              <div className="container">
                <SectionHead eyebrow={s.portfolio.eyebrow} title={s.portfolio.title} subtitle={s.portfolio.subtitle} />
                <MasonryGallery items={data.gallery} />
                <div className="section__more"><Btn to="/portfolio" variant="primary" iconRight="arrow">Explore portfolio</Btn></div>
              </div>
            </section>
          )}

          {s.experience.visible && <Experience section={s.experience} />}

          {s.packages.visible && data.packages.length > 0 && (
            <section className="section section--white">
              <div className="container">
                <SectionHead eyebrow={s.packages.eyebrow} title={s.packages.title} subtitle={s.packages.subtitle} />
                <div className="grid grid--3 grid--align-stretch">
                  {data.packages.map((p, i) => <PackageCard key={p.id} pkg={p} delay={i * 0.08} />)}
                </div>
                <div className="section__more"><Btn to="/packages" variant="outline" iconRight="arrow">Compare packages</Btn></div>
              </div>
            </section>
          )}

          {s.frames.visible && data.products.length > 0 && (
            <section className="section section--forest">
              <div className="container">
                <SectionHead light eyebrow={s.frames.eyebrow} title={s.frames.title} subtitle={s.frames.subtitle} />
                <div className="grid grid--4">
                  {data.products.map((p, i) => <ProductCard key={p.id} product={p} delay={i * 0.07} />)}
                </div>
                <div className="section__more"><Btn to="/photo-frames" variant="light" iconRight="arrow">Shop the collection</Btn></div>
              </div>
            </section>
          )}

          {s.why.visible && (
            <section className="section section--ivory">
              <div className="container">
                <SectionHead eyebrow={s.why.eyebrow} title={s.why.title} />
                <div className="grid grid--4 why">
                  {s.why.items.map((it, i) => (
                    <Reveal key={it.title} delay={i * 0.08} className="why__item">
                      <span className="why__num">{String(i + 1).padStart(2, '0')}</span>
                      <h3>{it.title}</h3>
                      <p>{it.text}</p>
                    </Reveal>
                  ))}
                </div>
              </div>
            </section>
          )}

          {s.testimonials.visible && data.testimonials.length > 0 && (
            <section className="section section--sand-soft">
              <div className="container">
                <SectionHead eyebrow={s.testimonials.eyebrow} title={s.testimonials.title} />
                <div className="grid grid--3 grid--align-stretch">
                  {data.testimonials.slice(0, 6).map((t, i) => <TestimonialCard key={t.id} t={t} delay={(i % 3) * 0.08} />)}
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {s.booking.visible && (
        <section className="cta-band">
          <div className="container cta-band__inner">
            <Reveal>
              <h2>{s.booking.title}</h2>
              <p>{s.booking.text}</p>
            </Reveal>
            <Reveal delay={0.1} className="cta-band__actions">
              <Btn to="/booking" variant="light" size="lg">Book your session</Btn>
              {waLink() && <Btn href={waLink('Hello, I would like to book a photography session.')} variant="outline-light" size="lg" icon="whatsapp">WhatsApp us</Btn>}
            </Reveal>
          </div>
        </section>
      )}

      {s.contact.visible && (
        <section className="section section--ivory">
          <div className="container">
            <SectionHead eyebrow={s.contact.eyebrow} title={s.contact.title} />
            <ContactBlock wide />
          </div>
        </section>
      )}
    </>
  );
}

function Experience({ section }) {
  return (
    <section className="section section--sage">
      <div className="container experience">
        <div className="experience__media">
          <ImageReveal>
            {section.video ? (
              <video className="experience__video" src={section.video} poster={section.image || undefined} controls muted loop playsInline preload="metadata" />
            ) : (
              <Img src={section.image} alt={section.title} ratio="4/3" width={1000} icon="camera" />
            )}
          </ImageReveal>
        </div>
        <div className="experience__text">
          <Reveal>
            {section.eyebrow && <p className="eyebrow eyebrow--light">{section.eyebrow}</p>}
            <h2>{section.title}</h2>
            <p>{section.text}</p>
          </Reveal>
          <ol className="steps">
            {section.steps.map((st, i) => (
              <Reveal as="li" key={st.title} delay={0.06 * i} className="steps__item">
                <span className="steps__n">{i + 1}</span>
                <div>
                  <h3>{st.title}</h3>
                  <p>{st.text}</p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
