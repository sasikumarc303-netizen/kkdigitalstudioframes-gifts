import { useState } from 'react';
import { useConfigGroup } from '../hooks/useConfigGroup.js';
import { ImageField } from '../components/MediaPicker.jsx';
import { Card, ErrorBox, Loading, PageHeader, SaveBar, SelectField, TextArea, TextField } from '../components/ui.jsx';

const LABELS = { '/': 'Home', '/about': 'About', '/services': 'Services', '/portfolio': 'Portfolio', '/packages': 'Packages', '/photo-frames': 'Photo frames', '/booking': 'Booking', '/contact': 'Contact', '/cart': 'Cart', '/checkout': 'Checkout' };

function Counter({ value = '', ideal }) {
  const n = value.length;
  const tone = n === 0 ? 'muted' : n > ideal[1] ? 'over' : n >= ideal[0] ? 'good' : 'short';
  return <small className={`a-counter is-${tone}`}>{n} characters · aim for {ideal[0]}–{ideal[1]}</small>;
}

export default function SeoManager() {
  const g = useConfigGroup('seo');
  const [route, setRoute] = useState('/');
  if (g.loading && !g.draft) return <><PageHeader title="SEO" /><Loading /></>;
  if (g.error) return <><PageHeader title="SEO" /><ErrorBox error={g.error} onRetry={g.reload} /></>;
  const d = g.draft;
  const p = d.pages[route] || { title: '', description: '', ogImage: '' };

  return (
    <>
      <PageHeader title="SEO" subtitle="Control how each page appears in Google and when shared on WhatsApp or social media." />
      <Card title="Page titles & descriptions">
        <SelectField label="Page" value={route} onChange={setRoute} options={Object.keys(d.pages).map((r) => ({ value: r, label: LABELS[r] || r }))} />
        <TextField label="Page title" value={p.title} onChange={(v) => g.set(`pages.${route}.title`, v)} maxLength={120} />
        <Counter value={p.title} ideal={[30, 60]} />
        <TextArea label="Meta description" rows={3} value={p.description} onChange={(v) => g.set(`pages.${route}.description`, v)} maxLength={320} />
        <Counter value={p.description} ideal={[70, 160]} />
        <ImageField label="Share image for this page (optional)" value={p.ogImage} onChange={(v) => g.set(`pages.${route}.ogImage`, v)} folder="seo" hint="Falls back to the default share image below." />
        <div className="a-serp" aria-label="Search result preview">
          <small>Search preview</small>
          <b>{p.title || 'Page title'}</b>
          <span>{window.location.origin}{route}</span>
          <p>{p.description || 'Meta description appears here.'}</p>
        </div>
      </Card>
      <Card title="Defaults">
        <ImageField label="Default share image" value={d.defaultOgImage} onChange={(v) => g.set('defaultOgImage', v)} folder="seo" hint="Recommended 1200×630." />
      </Card>
      <Card title="robots.txt">
        <TextArea label="Custom robots.txt (optional)" rows={6} value={d.robotsTxt} onChange={(v) => g.set('robotsTxt', v)} hint="Leave blank to use the default, which allows search engines and hides /admin and /api. Your sitemap is generated automatically at /sitemap.xml." />
      </Card>
      <SaveBar dirty={g.dirty} saving={g.saving} onSave={() => g.save()} onReset={g.reset} error={g.saveError} />
    </>
  );
}
