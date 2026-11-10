import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { PageHero, MasonryGallery } from '../components/Sections.jsx';
import { Btn } from '../components/Buttons.jsx';
import { ErrorState, Skeleton, EmptyState } from '../components/States.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { api, qs } from '../services/api.js';

export default function Portfolio() {
  const photos = useAsync(() => api.get('/gallery'), []);
  const cats = useAsync(() => api.get(`/categories${qs({ type: 'gallery' })}`), []);
  const [active, setActive] = useState('all');
  const reduce = useReducedMotion();

  const items = useMemo(() => (photos.data || []).filter((g) => active === 'all' || g.category?.slug === active), [photos.data, active]);

  return (
    <>
      <PageHero eyebrow="Selected work" title="Portfolio" text="A look at the stories we’ve had the privilege to photograph. Tap any image to view it full screen." />
      <section className="section section--ivory section--tight">
        <div className="container">
          {cats.data && cats.data.length > 0 && (
            <div className="filters" role="tablist" aria-label="Filter portfolio by category">
              <button type="button" role="tab" aria-selected={active === 'all'} className={`filter ${active === 'all' ? 'is-active' : ''}`} onClick={() => setActive('all')}>All</button>
              {cats.data.map((c) => (
                <button key={c.id} type="button" role="tab" aria-selected={active === c.slug} className={`filter ${active === c.slug ? 'is-active' : ''}`} onClick={() => setActive(c.slug)}>{c.name}</button>
              ))}
            </div>
          )}
          {photos.error && <ErrorState error={photos.error} onRetry={photos.reload} />}
          {photos.loading && <div className="masonry masonry--skeleton">{[300, 420, 340, 380, 300, 440].map((h, i) => <Skeleton key={i} h={h} />)}</div>}
          {photos.data && items.length === 0 && (
            <EmptyState
              title={photos.data.length === 0 ? 'Our portfolio is on its way' : 'No photographs in this category yet'}
              text="We’re curating our best work. In the meantime, get in touch to see more of what we do."
              action={<Btn to="/contact">Contact us</Btn>}
            />
          )}
          {items.length > 0 && (
            <motion.div key={active} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
              <MasonryGallery items={items} />
            </motion.div>
          )}
        </div>
      </section>
    </>
  );
}
