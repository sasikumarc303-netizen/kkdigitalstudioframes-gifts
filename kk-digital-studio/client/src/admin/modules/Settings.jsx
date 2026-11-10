import { useState } from 'react';
import { useConfigGroup } from '../hooks/useConfigGroup.js';
import { ImageField } from '../components/MediaPicker.jsx';
import { Badge, Card, ErrorBox, Loading, ObjectList, PageHeader, SaveBar, Switch, Tabs, TextArea, TextField } from '../components/ui.jsx';

const Frame = ({ title, subtitle, g, children }) => {
  if (g.loading && !g.draft) return <><PageHeader title={title} /><Loading /></>;
  if (g.error) return <><PageHeader title={title} /><ErrorBox error={g.error} onRetry={g.reload} /></>;
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      {children}
      <SaveBar dirty={g.dirty} saving={g.saving} onSave={() => g.save()} onReset={g.reset} error={g.saveError} />
    </>
  );
};

export function ContactInfo() {
  const g = useConfigGroup('contact');
  const d = g.draft;
  const { set } = g;
  return (
    <Frame title="Contact info" subtitle="Used on the Contact page, footer, floating WhatsApp button and every call or WhatsApp button. Nothing is shown until you add it." g={g}>
      {d && (
        <>
          <Card title="Phone, WhatsApp & email">
            <div className="a-form">
              <div className="a-form__item"><TextField label="Phone number" type="tel" value={d.phone} onChange={(v) => set('phone', v)} hint="With country code, e.g. +91… Leave blank to hide call buttons." /></div>
              <div className="a-form__item"><TextField label="WhatsApp number" type="tel" value={d.whatsapp} onChange={(v) => set('whatsapp', v)} hint="Leave blank to use the phone number. Blank for both hides WhatsApp buttons." /></div>
              <div className="a-form__item"><TextField label="Email" type="email" value={d.email} onChange={(v) => set('email', v)} /></div>
            </div>
          </Card>
          <Card title="Address & map">
            <div className="a-form">
              <div className="a-form__item is-wide"><TextArea label="Studio address" rows={2} value={d.address} onChange={(v) => set('address', v)} /></div>
              <div className="a-form__item is-wide"><TextField label="Map search text" value={d.mapQuery} onChange={(v) => set('mapQuery', v)} hint="What Google Maps should search for. Leave blank to use the address." /></div>
            </div>
          </Card>
          <Card title="Opening hours">
            <ObjectList items={d.hours} onChange={(v) => set('hours', v)} max={10} addLabel="Add hours" blank={{ days: '', time: '' }} itemTitle={(h) => h.days || 'Hours'}
              renderRow={(h, up) => (<div className="a-form"><div className="a-form__item"><TextField label="Days" value={h.days} onChange={(v) => up({ days: v })} placeholder="e.g. Monday – Saturday" /></div><div className="a-form__item"><TextField label="Time" value={h.time} onChange={(v) => up({ time: v })} placeholder="e.g. 9:00 AM – 7:00 PM" /></div></div>)} />
            {d.hours.length === 0 && <p className="a-muted">No hours are displayed until you add them.</p>}
          </Card>
          <Card title="Social media">
            <div className="a-form">
              {[['instagram', 'Instagram URL'], ['facebook', 'Facebook URL'], ['youtube', 'YouTube URL'], ['x', 'X (Twitter) URL']].map(([k, l]) => (
                <div className="a-form__item" key={k}><TextField label={l} type="url" value={d.social[k]} onChange={(v) => set(`social.${k}`, v)} placeholder="https://" /></div>
              ))}
            </div>
          </Card>
        </>
      )}
    </Frame>
  );
}

export function Navigation() {
  const g = useConfigGroup('navigation');
  return (
    <Frame title="Navigation" subtitle="The links in the website header and footer. Drag order with the arrows; hide a link without deleting it." g={g}>
      {g.draft && (
        <Card>
          <ObjectList items={g.draft} onChange={(v) => g.setDraft(v)} max={12} addLabel="Add link" blank={{ label: '', path: '/', visible: true }} itemTitle={(n) => n.label || 'Link'}
            renderRow={(n, up) => (
              <div className="a-form">
                <div className="a-form__item"><TextField label="Label" value={n.label} onChange={(v) => up({ label: v })} /></div>
                <div className="a-form__item"><TextField label="Link" value={n.path} onChange={(v) => up({ path: v })} hint="e.g. /services, or a full https:// link" /></div>
                <div className="a-form__item"><Switch label="Visible" checked={n.visible} onChange={(v) => up({ visible: v })} /></div>
              </div>
            )} />
        </Card>
      )}
    </Frame>
  );
}

export function SiteSettings() {
  const general = useConfigGroup('general');
  const commerce = useConfigGroup('commerce');
  const [tab, setTab] = useState('branding');
  const combined = {
    loading: general.loading || commerce.loading,
    error: general.error || commerce.error,
    draft: general.draft && commerce.draft,
    dirty: general.dirty || commerce.dirty,
    saving: general.saving || commerce.saving,
    saveError: general.saveError || commerce.saveError,
    reload: () => { general.reload(); commerce.reload(); },
    reset: () => { general.reset(); commerce.reset(); },
    save: async () => { if (general.dirty) await general.save(); if (commerce.dirty) await commerce.save(); },
  };
  const d = general.draft;
  const c = commerce.draft;

  return (
    <Frame title="Website settings" subtitle="Branding, footer and shop settings." g={combined}>
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'branding', label: 'Branding' }, { value: 'footer', label: 'Footer' }, { value: 'commerce', label: 'Shop & checkout' }]} />
      {tab === 'branding' && d && (
        <Card title="Branding">
          <div className="a-form">
            <div className="a-form__item"><TextField label="Business name" value={d.businessName} onChange={(v) => general.set('businessName', v)} /></div>
            <div className="a-form__item"><TextField label="Tagline" value={d.tagline} onChange={(v) => general.set('tagline', v)} /></div>
            <div className="a-form__item"><TextField label="Currency symbol" value={d.currencySymbol} onChange={(v) => general.set('currencySymbol', v)} hint="Shown before prices" /></div>
            <div className="a-form__item"><TextField label="Currency code" value={d.currency} onChange={(v) => general.set('currency', v.toUpperCase())} maxLength={3} /></div>
            <div className="a-form__item"><ImageField label="Logo (optional)" value={d.logo} onChange={(v) => general.set('logo', v)} folder="branding" hint="Replaces the text logo in the header." /></div>
            <div className="a-form__item"><ImageField label="Favicon (optional)" value={d.favicon} onChange={(v) => general.set('favicon', v)} folder="branding" hint="Square image, at least 64×64." /></div>
          </div>
        </Card>
      )}
      {tab === 'footer' && d && (
        <Card title="Footer"><TextArea label="Footer description" rows={3} value={d.footerText} onChange={(v) => general.set('footerText', v)} hint="Address, phone and social links come from Contact info." /></Card>
      )}
      {tab === 'commerce' && c && (
        <>
          <Card title="Checkout options">
            <Switch label="Allow cash on delivery" hint="Customers can choose to pay when the order arrives." checked={c.allowCod} onChange={(v) => commerce.set('allowCod', v)} />
            <Switch label="Allow store pickup" hint="Customers can collect from the studio, so no shipping is charged." checked={c.allowPickup} onChange={(v) => commerce.set('allowPickup', v)} />
            <div className="a-form">
              <div className="a-form__item"><TextField label="Flat shipping charge" type="number" min="0" value={c.flatShipping} onChange={(v) => commerce.set('flatShipping', v === '' ? 0 : Number(v))} hint="0 = free shipping" /></div>
              <div className="a-form__item"><TextField label="Free shipping above" type="number" min="0" value={c.freeShippingAbove} onChange={(v) => commerce.set('freeShippingAbove', v === '' ? 0 : Number(v))} hint="Order value at which shipping becomes free. 0 = off" /></div>
              <div className="a-form__item is-wide"><TextArea label="Message shown after ordering" rows={3} value={c.paymentInstructions} onChange={(v) => commerce.set('paymentInstructions', v)} hint="Tell customers how payment will be arranged." /></div>
            </div>
          </Card>
          <Card title="Online payment">
            <p>{commerce.payment?.onlineEnabled ? <Badge tone="success">Connected: {commerce.payment.provider}</Badge> : <Badge tone="muted">Not connected</Badge>}</p>
            <p className="a-muted">Orders are taken as enquiries and payment is arranged with the customer. Online payment is configured on the server (see the README, “Payments”), not in this panel, so that payment keys are never stored in the database.</p>
          </Card>
        </>
      )}
    </Frame>
  );
}
