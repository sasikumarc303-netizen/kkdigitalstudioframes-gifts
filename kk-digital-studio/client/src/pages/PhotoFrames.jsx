import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHero } from '../components/Sections.jsx';
import { ProductCard } from '../components/Cards.jsx';
import { Btn } from '../components/Buttons.jsx';
import { ErrorState, Skeleton, EmptyState } from '../components/States.jsx';
import { useAsync } from '../hooks/useAsync.js';
import { api, qs } from '../services/api.js';

export default function PhotoFrames() {
  const [cat, setCat] = useState('');
  const cats = useAsync(() => api.get(`/categories${qs({ type: 'product' })}`), []);
  const products = useAsync(() => api.get(`/products${qs({ category: cat })}`), [cat]);

  return (
    <>
      <PageHero eyebrow="Photo frame collection" title="Frames & keepsakes" text="Give your favourite photographs a home. Choose a size and finish, or send us your photo and we’ll print and frame it for you.">
        <p className="page-hero__links"><Link to="/orders">Track an existing order</Link></p>
      </PageHero>
      <section className="section section--ivory section--tight">
        <div className="container">
          {cats.data && cats.data.length > 1 && (
            <div className="filters" role="tablist" aria-label="Filter by category">
              <button type="button" role="tab" aria-selected={cat === ''} className={`filter ${cat === '' ? 'is-active' : ''}`} onClick={() => setCat('')}>All</button>
              {cats.data.map((c) => <button key={c.id} type="button" role="tab" aria-selected={cat === c.slug} className={`filter ${cat === c.slug ? 'is-active' : ''}`} onClick={() => setCat(c.slug)}>{c.name}</button>)}
            </div>
          )}
          {products.error && <ErrorState error={products.error} onRetry={products.reload} />}
          {products.loading && <div className="grid grid--4"><Skeleton h={340} /><Skeleton h={340} /><Skeleton h={340} /><Skeleton h={340} /></div>}
          {products.data && products.data.length === 0 && <EmptyState title="No products here yet" text="New frames and keepsakes are added regularly." action={<Btn to="/contact">Ask us about custom frames</Btn>} />}
          {products.data && products.data.length > 0 && (
            <div className="grid grid--4">{products.data.map((p, i) => <ProductCard key={p.id} product={p} delay={(i % 4) * 0.06} />)}</div>
          )}
        </div>
      </section>
    </>
  );
}
