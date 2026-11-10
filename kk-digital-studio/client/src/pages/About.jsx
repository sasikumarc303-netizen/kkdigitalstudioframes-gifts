import { PageHero, Split } from '../components/Sections.jsx';
import SectionHead from '../components/SectionHead.jsx';
import Reveal from '../components/Reveal.jsx';
import { Btn } from '../components/Buttons.jsx';
import { useSite } from '../context/SiteContext.jsx';

export default function About() {
  const { config, brand } = useSite();
  const s = config.homepage.sections;
  return (
    <>
      <PageHero eyebrow={`About ${brand}`} title={s.about.title} text={s.intro.text} />
      <Split section={{ ...s.about, eyebrow: undefined, title: 'Our approach' }} tone="white" />
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
      {s.experience.visible && (
        <section className="section section--white">
          <div className="container container--narrow">
            <SectionHead eyebrow={s.experience.eyebrow} title={s.experience.title} subtitle={s.experience.text} />
            <ol className="steps steps--light">
              {s.experience.steps.map((st, i) => (
                <Reveal as="li" key={st.title} delay={0.06 * i} className="steps__item">
                  <span className="steps__n">{i + 1}</span>
                  <div><h3>{st.title}</h3><p>{st.text}</p></div>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>
      )}
      <section className="cta-band">
        <div className="container cta-band__inner">
          <Reveal><h2>{s.booking.title}</h2><p>{s.booking.text}</p></Reveal>
          <Reveal delay={0.1} className="cta-band__actions"><Btn to="/booking" variant="light" size="lg">Book your session</Btn></Reveal>
        </div>
      </section>
    </>
  );
}
