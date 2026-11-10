import { useState } from 'react';
import { useAsync } from '../../hooks/useAsync.js';
import { api } from '../../services/api.js';
import { useConfigGroup } from '../hooks/useConfigGroup.js';
import { FormGrid } from '../components/ResourceManager.jsx';
import { ImageField } from '../components/MediaPicker.jsx';
import { Card, ErrorBox, Loading, ObjectList, PageHeader, SaveBar, SelectField, StringList, Switch, Tabs, TextArea, TextField } from '../components/ui.jsx';

const CTA_TYPES = [
  { value: 'route', label: 'Page on this website' },
  { value: 'whatsapp', label: 'WhatsApp message' },
  { value: 'call', label: 'Phone call' },
  { value: 'url', label: 'External link' },
];
const CTA_VARIANTS = [{ value: 'primary', label: 'Solid' }, { value: 'secondary', label: 'Outlined' }, { value: 'ghost', label: 'Text' }];
const ROUTES = ['/', '/about', '/services', '/portfolio', '/packages', '/photo-frames', '/booking', '/contact'];

function SectionHeader({ s, path, set, extra }) {
  return (
    <div className="a-sechead">
      <Switch label="Show this section" checked={s.visible} onChange={(v) => set(`${path}.visible`, v)} />
      {extra}
    </div>
  );
}

function TitleFields({ s, path, set, text = false, subtitle = false }) {
  return (
    <div className="a-form">
      <div className="a-form__item"><TextField label="Small heading (eyebrow)" value={s.eyebrow} onChange={(v) => set(`${path}.eyebrow`, v)} /></div>
      <div className="a-form__item"><TextField label="Title" value={s.title} onChange={(v) => set(`${path}.title`, v)} /></div>
      {subtitle && <div className="a-form__item is-wide"><TextArea label="Subtitle" rows={2} value={s.subtitle} onChange={(v) => set(`${path}.subtitle`, v)} /></div>}
      {text && <div className="a-form__item is-wide"><TextArea label="Text" rows={4} value={s.text} onChange={(v) => set(`${path}.text`, v)} /></div>}
    </div>
  );
}

function Pick({ label, items, value = [], onChange, name }) {
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <fieldset className="a-pick">
      <legend>{label}</legend>
      <p className="a-muted">{value.length ? `${value.length} selected. They appear in this order of selection on the homepage.` : `None selected: the homepage shows the first ${name} automatically.`}</p>
      <div className="a-pick__grid">
        {items.map((it) => (
          <label key={it.id} className={`a-pick__item ${value.includes(it.id) ? 'is-on' : ''}`}>
            <input type="checkbox" checked={value.includes(it.id)} onChange={() => toggle(it.id)} />
            <span>{it.title || it.name}</span>
          </label>
        ))}
        {items.length === 0 && <span className="a-muted">Nothing to choose from yet.</span>}
      </div>
    </fieldset>
  );
}

export default function Homepage() {
  const g = useConfigGroup('homepage');
  const [tab, setTab] = useState('hero');
  const services = useAsync(() => api.get('/admin/services?limit=200'), []);
  const products = useAsync(() => api.get('/admin/products?limit=200'), []);

  if (g.loading && !g.draft) return <><PageHeader title="Homepage" /><Loading /></>;
  if (g.error) return <><PageHeader title="Homepage" /><ErrorBox error={g.error} onRetry={g.reload} /></>;
  const d = g.draft;
  const { set } = g;
  const S = d.sections;

  return (
    <>
      <PageHeader title="Homepage" subtitle="Everything on the homepage is edited here. Changes go live as soon as you save." />
      <Tabs value={tab} onChange={setTab} tabs={[
        { value: 'hero', label: 'Hero & buttons' }, { value: 'intro', label: 'Intro & about' }, { value: 'content', label: 'Services · Portfolio · Packages · Frames' },
        { value: 'experience', label: 'Experience & why us' }, { value: 'closing', label: 'Testimonials · Booking · Contact' }, { value: 'featured', label: 'Featured items' },
      ]} />

      {tab === 'hero' && (
        <>
          <Card title="Hero text">
            <div className="a-form">
              <div className="a-form__item"><TextField label="Small heading (eyebrow)" value={d.hero.eyebrow} onChange={(v) => set('hero.eyebrow', v)} /></div>
              <div className="a-form__item is-wide"><TextField label="Headline" value={d.hero.heading} onChange={(v) => set('hero.heading', v)} /></div>
              <div className="a-form__item is-wide"><TextArea label="Subheading" rows={2} value={d.hero.subheading} onChange={(v) => set('hero.subheading', v)} /></div>
            </div>
          </Card>
          <Card title="Hero media" actions={<small className="a-muted">Upload and manage videos in the Video module</small>}>
            <div className="a-form">
              <div className="a-form__item"><ImageField type="video" label="Desktop video" value={d.hero.video} onChange={(v) => set('hero.video', v)} folder="hero" hint="Wide (16:9), muted, ideally under 8 MB." /></div>
              <div className="a-form__item"><ImageField type="video" label="Mobile video" value={d.hero.videoMobile} onChange={(v) => set('hero.videoMobile', v)} folder="hero" hint="Lighter file for phones, e.g. 854×480." /></div>
              <div className="a-form__item"><ImageField label="Desktop poster image" value={d.hero.poster} onChange={(v) => set('hero.poster', v)} folder="hero" hint="Shown while the video loads, and for visitors who prefer reduced motion." /></div>
              <div className="a-form__item"><ImageField label="Mobile poster image" value={d.hero.posterMobile} onChange={(v) => set('hero.posterMobile', v)} folder="hero" /></div>
            </div>
          </Card>
          <Card title="Hero buttons">
            <ObjectList items={d.ctas} onChange={(v) => set('ctas', v)} max={4} addLabel="Add button" blank={{ label: 'New button', type: 'route', target: '/contact', variant: 'secondary', visible: true }} itemTitle={(c) => c.label || 'Button'}
              renderRow={(c, up) => (
                <div className="a-form">
                  <div className="a-form__item"><TextField label="Label" value={c.label} onChange={(v) => up({ label: v })} /></div>
                  <div className="a-form__item"><SelectField label="Action" value={c.type} onChange={(v) => up({ type: v, target: v === 'route' ? '/booking' : '' })} options={CTA_TYPES} /></div>
                  <div className="a-form__item">
                    {c.type === 'route' ? <SelectField label="Page" value={c.target} onChange={(v) => up({ target: v })} options={ROUTES.includes(c.target) ? ROUTES : [c.target, ...ROUTES]} />
                      : c.type === 'url' ? <TextField label="Link (https://…)" value={c.target} onChange={(v) => up({ target: v })} />
                        : c.type === 'whatsapp' ? <TextField label="Pre-filled message" value={c.target} onChange={(v) => up({ target: v })} hint="Number comes from Contact info" />
                          : <p className="a-muted">Uses the phone number from Contact info.</p>}
                  </div>
                  <div className="a-form__item"><SelectField label="Style" value={c.variant} onChange={(v) => up({ variant: v })} options={CTA_VARIANTS} /></div>
                  <div className="a-form__item"><Switch label="Visible" checked={c.visible} onChange={(v) => up({ visible: v })} /></div>
                </div>
              )} />
          </Card>
        </>
      )}

      {tab === 'intro' && (
        <>
          <Card title="Introduction"><SectionHeader s={S.intro} path="sections.intro" set={set} /><TitleFields s={S.intro} path="sections.intro" set={set} text /><ImageField label="Image" value={S.intro.image} onChange={(v) => set('sections.intro.image', v)} folder="homepage" /></Card>
          <Card title="About the studio"><SectionHeader s={S.about} path="sections.about" set={set} /><TitleFields s={S.about} path="sections.about" set={set} text /><StringList label="Highlights" value={S.about.points} onChange={(v) => set('sections.about.points', v)} /><ImageField label="Image" value={S.about.image} onChange={(v) => set('sections.about.image', v)} folder="homepage" /></Card>
        </>
      )}

      {tab === 'content' && (
        ['services', 'portfolio', 'packages', 'frames'].map((k) => (
          <Card key={k} title={{ services: 'Photography services', portfolio: 'Portfolio preview', packages: 'Packages', frames: 'Photo frame collection' }[k]}>
            <SectionHeader s={S[k]} path={`sections.${k}`} set={set} />
            <TitleFields s={S[k]} path={`sections.${k}`} set={set} subtitle />
            {k === 'portfolio' && <p className="a-muted">The portfolio preview is hidden automatically until at least one photo is published in the Gallery.</p>}
          </Card>
        ))
      )}

      {tab === 'experience' && (
        <>
          <Card title="Photography experience">
            <SectionHeader s={S.experience} path="sections.experience" set={set} />
            <TitleFields s={S.experience} path="sections.experience" set={set} text />
            <div className="a-form"><div className="a-form__item"><ImageField label="Image" value={S.experience.image} onChange={(v) => set('sections.experience.image', v)} folder="homepage" /></div><div className="a-form__item"><ImageField type="video" label="Promotional video (optional)" value={S.experience.video} onChange={(v) => set('sections.experience.video', v)} folder="promo" hint="Replaces the image when set." /></div></div>
            <ObjectList label="Steps" items={S.experience.steps} onChange={(v) => set('sections.experience.steps', v)} max={8} addLabel="Add step" blank={{ title: '', text: '' }} itemTitle={(s, i) => `${i + 1}. ${s.title || 'Step'}`}
              renderRow={(s, up) => (<div className="a-form"><div className="a-form__item"><TextField label="Title" value={s.title} onChange={(v) => up({ title: v })} /></div><div className="a-form__item is-wide"><TextArea label="Text" rows={2} value={s.text} onChange={(v) => up({ text: v })} /></div></div>)} />
          </Card>
          <Card title="Why choose us">
            <SectionHeader s={S.why} path="sections.why" set={set} />
            <TitleFields s={S.why} path="sections.why" set={set} />
            <ObjectList label="Reasons" items={S.why.items} onChange={(v) => set('sections.why.items', v)} max={8} addLabel="Add reason" blank={{ title: '', text: '' }} itemTitle={(s) => s.title || 'Reason'}
              renderRow={(s, up) => (<div className="a-form"><div className="a-form__item"><TextField label="Title" value={s.title} onChange={(v) => up({ title: v })} /></div><div className="a-form__item is-wide"><TextArea label="Text" rows={2} value={s.text} onChange={(v) => up({ text: v })} /></div></div>)} />
          </Card>
        </>
      )}

      {tab === 'closing' && (
        <>
          <Card title="Testimonials"><SectionHeader s={S.testimonials} path="sections.testimonials" set={set} /><TitleFields s={S.testimonials} path="sections.testimonials" set={set} /><p className="a-muted">Only published testimonials are shown. The section stays hidden while there are none.</p></Card>
          <Card title="Booking call-to-action"><SectionHeader s={S.booking} path="sections.booking" set={set} /><div className="a-form"><div className="a-form__item is-wide"><TextField label="Title" value={S.booking.title} onChange={(v) => set('sections.booking.title', v)} /></div><div className="a-form__item is-wide"><TextArea label="Text" rows={3} value={S.booking.text} onChange={(v) => set('sections.booking.text', v)} /></div></div></Card>
          <Card title="Contact & location"><SectionHeader s={S.contact} path="sections.contact" set={set} /><TitleFields s={S.contact} path="sections.contact" set={set} /><p className="a-muted">Address, phone, hours and map come from Contact info.</p></Card>
        </>
      )}

      {tab === 'featured' && (
        <Card title="Featured items">
          <Pick label="Featured services" name="services" items={services.data?.items || []} value={d.featuredServices} onChange={(v) => set('featuredServices', v)} />
          <Pick label="Featured products" name="products" items={products.data?.items || []} value={d.featuredProducts} onChange={(v) => set('featuredProducts', v)} />
        </Card>
      )}

      <SaveBar dirty={g.dirty} saving={g.saving} onSave={() => g.save()} onReset={g.reset} error={g.saveError} />
    </>
  );
}
