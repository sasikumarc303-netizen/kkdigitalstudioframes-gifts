import { useMemo, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { Btn } from '../../components/Buttons.jsx';
import { money } from '../../services/format.js';
import ResourceManager, { PublishedBadge } from '../components/ResourceManager.jsx';
import { Field } from '../../components/Form.jsx';
import { Badge, TextField } from '../components/ui.jsx';
import { useCategories } from './Simple.jsx';

const DEFAULT_SIZES = ['6x8 in', '8x10 in', '12x16 in', '16x20 in', '20x24 in'];
const DEFAULT_FINISHES = ['Oak', 'Acrylic', 'Metal'];

function VariantEditor({ variants, onChange }) {
  const [gen, setGen] = useState({ sizes: '', finishes: '' });
  const set = (i, k, v) => onChange(variants.map((x, n) => (n === i ? { ...x, [k]: v } : x)));
  const num = (v) => (v === '' ? '' : Math.max(0, Number(v)));

  const generate = () => {
    const sizes = gen.sizes.split(',').map((s) => s.trim()).filter(Boolean);
    const finishes = gen.finishes.split(',').map((s) => s.trim()).filter(Boolean);
    const sz = sizes.length ? sizes : [''];
    const fn = finishes.length ? finishes : [''];
    const existing = new Set(variants.map((v) => `${v.size}|${v.finish}`));
    const added = [];
    sz.forEach((size) => fn.forEach((finish) => { if (!existing.has(`${size}|${finish}`)) added.push({ sku: '', size, finish, price: 0, compareAtPrice: 0, stock: 0, active: true }); }));
    onChange([...variants, ...added]);
  };

  return (
    <fieldset className="a-variants">
      <legend>Sizes, finishes, prices &amp; stock</legend>
      <p className="a-muted">Each row is one buyable option. A price of 0 shows “Price on request” and cannot be added to the cart. Stock is reduced automatically when an order is placed and restored if it is cancelled.</p>

      <div className="a-variants__gen">
        <TextField label="Sizes (comma separated)" value={gen.sizes} onChange={(v) => setGen((g) => ({ ...g, sizes: v }))} placeholder={DEFAULT_SIZES.join(', ')} />
        <TextField label="Finishes (comma separated)" value={gen.finishes} onChange={(v) => setGen((g) => ({ ...g, finishes: v }))} placeholder={DEFAULT_FINISHES.join(', ')} />
        <Btn variant="outline" size="sm" icon="plus" onClick={generate} disabled={!gen.sizes.trim() && !gen.finishes.trim()}>Generate combinations</Btn>
      </div>

      {variants.length === 0 && <p className="a-muted">No options yet. Generate them above or add one manually.</p>}
      {variants.length > 0 && (
        <div className="a-table-wrap a-table-wrap--flat">
          <table className="a-table a-table--variants">
            <thead><tr><th>Size</th><th>Finish</th><th>Price ₹</th><th>Was ₹</th><th>Stock</th><th>SKU</th><th>Active</th><th /></tr></thead>
            <tbody>
              {variants.map((v, i) => (
                <tr key={v._id || `n${i}`}>
                  <td data-label="Size"><input aria-label="Size" value={v.size} onChange={(e) => set(i, 'size', e.target.value)} /></td>
                  <td data-label="Finish"><input aria-label="Finish" value={v.finish} onChange={(e) => set(i, 'finish', e.target.value)} /></td>
                  <td data-label="Price ₹"><input aria-label="Price" type="number" min="0" inputMode="decimal" value={v.price} onChange={(e) => set(i, 'price', num(e.target.value))} /></td>
                  <td data-label="Was ₹"><input aria-label="Compare-at price" type="number" min="0" inputMode="decimal" value={v.compareAtPrice} onChange={(e) => set(i, 'compareAtPrice', num(e.target.value))} /></td>
                  <td data-label="Stock"><input aria-label="Stock" type="number" min="0" inputMode="numeric" value={v.stock} onChange={(e) => set(i, 'stock', num(e.target.value))} /></td>
                  <td data-label="SKU"><input aria-label="SKU" value={v.sku} onChange={(e) => set(i, 'sku', e.target.value)} /></td>
                  <td data-label="Active"><input aria-label="Active" type="checkbox" checked={v.active !== false} onChange={(e) => set(i, 'active', e.target.checked)} /></td>
                  <td><button type="button" className="a-icon-btn is-danger" onClick={() => onChange(variants.filter((_, n) => n !== i))} aria-label="Remove option"><Icon name="trash" size={16} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Btn size="sm" variant="ghost" icon="plus" onClick={() => onChange([...variants, { sku: '', size: '', finish: '', price: 0, compareAtPrice: 0, stock: 0, active: true }])}>Add option</Btn>
    </fieldset>
  );
}

export default function Products() {
  const categories = useCategories('product');
  const options = useMemo(() => categories.map((c) => ({ value: c.id, label: c.name })), [categories]);
  const [cat, setCat] = useState('');

  return (
    <ResourceManager
      wide title="Products" singular="Product" endpoint="/admin/products" filters={{ category: cat }}
      subtitle="Your photo-frame shop. Prices and stock are enforced by the server at checkout."
      searchPlaceholder="Search products…"
      thumb={(i) => i.images?.[0]}
      extraToolbar={
        <Field label="" className="a-inline-field"><select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by category"><option value="">All categories</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
      }
      columns={[
        { label: 'Product', cell: (i) => <><strong>{i.name}</strong>{i.featured && <Badge tone="info">Featured</Badge>}<small className="a-sub">{i.category?.name || 'No category'}</small></> },
        {
          label: 'Price',
          cell: (i) => {
            const p = (i.variants || []).filter((v) => v.active && v.price > 0).map((v) => v.price);
            return p.length ? `From ${money(Math.min(...p))}` : <span className="a-muted">Price on request</span>;
          },
        },
        {
          label: 'Stock',
          cell: (i) => {
            const act = (i.variants || []).filter((v) => v.active);
            const units = act.reduce((a, v) => a + v.stock, 0);
            return <>{units} <small className="a-sub">{act.length} option{act.length === 1 ? '' : 's'}</small></>;
          },
        },
        { label: 'Status', cell: (i) => <PublishedBadge on={i.published} /> },
      ]}
      blank={{ name: '', shortDescription: '', description: '', category: '', images: [], features: [], variants: [], featured: false, order: 0, published: true }}
      toForm={(i) => ({ ...i, category: i.category?.id || i.category || '', variants: (i.variants || []).map((v) => ({ ...v })), images: i.images || [], features: i.features || [] })}
      toPayload={(f) => ({ ...f, category: f.category || null })}
      fields={[
        { key: 'name', label: 'Product name', required: true, max: 140 },
        { key: 'category', label: 'Category', type: 'select', options, placeholder: 'No category' },
        { key: 'shortDescription', label: 'Short description', max: 240, wide: true },
        { key: 'description', label: 'Full description', type: 'textarea', rows: 5, max: 4000 },
        { key: 'features', label: 'Key features', type: 'strings', placeholder: 'e.g. Handcrafted solid wood frame' },
        { key: 'images', label: 'Product images (first is the main image)', type: 'images', folder: 'products' },
        { key: 'order', label: 'Display order', type: 'number' },
        { key: 'featured', label: 'Feature on homepage', type: 'switch' },
        { key: 'published', label: 'Show on website', type: 'switch' },
      ]}
      modalExtra={(form, set) => <VariantEditor variants={form.variants} onChange={(v) => set('variants', v)} />}
    />
  );
}
