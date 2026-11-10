import { useRef, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import Img from '../../components/Img.jsx';
import { Btn } from '../../components/Buttons.jsx';
import { Field } from '../../components/Form.jsx';
import { useToast } from '../../components/Toast.jsx';
import { api } from '../../services/api.js';
import { usePaged } from '../hooks/usePaged.js';
import { FormGrid } from '../components/ResourceManager.jsx';
import { Badge, EmptyRow, ErrorBox, Loading, Modal, PageHeader, Pager, SearchBox, useConfirm, useSaveState } from '../components/ui.jsx';
import { useCategories } from './Simple.jsx';

export default function Gallery() {
  const toast = useToast();
  const confirm = useConfirm();
  const categories = useCategories('gallery');
  const catOptions = categories.map((c) => ({ value: c.id, label: c.name }));
  const [cat, setCat] = useState('');
  const [state, setState] = useState('');
  const list = usePaged('/admin/gallery', { filters: { category: cat, published: state }, limit: 24 });
  const [selected, setSelected] = useState(new Set());
  const [uploading, setUploading] = useState(false);
  const [upCat, setUpCat] = useState('');
  const [upPub, setUpPub] = useState(true);
  const fileRef = useRef(null);
  const [editing, setEditing] = useState(null);
  const [{ saving, error, errors }, run] = useSaveState();

  const toggle = (id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allOnPage = list.items.length > 0 && list.items.every((i) => selected.has(i.id));
  const toggleAll = () => setSelected(allOnPage ? new Set() : new Set(list.items.map((i) => i.id)));

  const upload = async (files) => {
    if (!files?.length) return;
    const fd = new FormData();
    [...files].forEach((f) => fd.append('files', f));
    if (upCat) fd.append('category', upCat);
    fd.append('published', String(upPub));
    setUploading(true);
    try {
      const { created, errors: errs } = await api.upload('/admin/gallery/upload', fd);
      if (created.length) toast(`${created.length} photo${created.length > 1 ? 's' : ''} added to the gallery`);
      if (errs?.length) toast(errs.map((e) => `${e.file}: ${e.message}`).join('\n'), 'error');
      list.reload();
    } catch (e) { toast(e.message, 'error'); } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const bulk = async (action) => {
    const ids = [...selected];
    if (action === 'delete' && !(await confirm({ title: `Delete ${ids.length} photo${ids.length > 1 ? 's' : ''}?`, message: 'They will be removed from your gallery and portfolio. The uploaded files remain in the media library.', confirmLabel: 'Delete' }))) return;
    try {
      await api.post('/admin/gallery/bulk', { ids, action });
      toast(action === 'delete' ? 'Photos deleted' : action === 'publish' ? 'Photos published' : 'Photos hidden');
      setSelected(new Set());
      list.reload();
    } catch (e) { toast(e.message, 'error'); }
  };

  const openEdit = (it) => setEditing({ id: it.id, form: { title: it.title || '', caption: it.caption || '', image: it.image, category: it.category?.id || it.category || '', featured: it.featured, order: it.order || 0, published: it.published, width: it.width, height: it.height } });
  const set = (k, v) => setEditing((e) => ({ ...e, form: { ...e.form, [k]: v } }));
  const save = async () => {
    const r = await run(() => api.put(`/admin/gallery/${editing.id}`, { ...editing.form, category: editing.form.category || null }));
    if (r) { toast('Photo updated'); setEditing(null); list.reload(); }
  };
  const removeOne = async () => {
    if (!(await confirm({ title: 'Delete this photo?', message: 'It will be removed from the gallery.', confirmLabel: 'Delete' }))) return;
    try { await api.del(`/admin/gallery/${editing.id}`); toast('Photo deleted'); setEditing(null); list.reload(); } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <>
      <PageHeader title="Gallery" subtitle="Photos shown in the portfolio and the homepage preview. Upload many at once, then add titles and categories."
        actions={<><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden onChange={(e) => upload(e.target.files)} /><Btn icon="upload" onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? 'Uploading…' : 'Upload photos'}</Btn></>} />

      <div className="a-card a-upload-opts">
        <Field label="Upload into category"><select value={upCat} onChange={(e) => setUpCat(e.target.value)}><option value="">No category</option>{catOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
        <label className="a-switch"><input type="checkbox" checked={upPub} onChange={(e) => setUpPub(e.target.checked)} role="switch" /><span className="a-switch__track" aria-hidden="true"><i /></span><span className="a-switch__text">Publish immediately</span></label>
        {categories.length === 0 && <small className="a-muted">Tip: add gallery categories first (Categories page) to enable portfolio filters.</small>}
      </div>

      <div className="a-toolbar">
        <SearchBox value={list.q} onChange={list.setQ} placeholder="Search photos…" />
        <Field label=""><select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by category"><option value="">All categories</option>{catOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></Field>
        <Field label=""><select value={state} onChange={(e) => setState(e.target.value)} aria-label="Filter by status"><option value="">All statuses</option><option value="true">Published</option><option value="false">Hidden</option></select></Field>
      </div>

      {selected.size > 0 && (
        <div className="a-bulk" role="region" aria-label="Bulk actions">
          <strong>{selected.size} selected</strong>
          <Btn size="sm" variant="outline" onClick={() => bulk('publish')}>Publish</Btn>
          <Btn size="sm" variant="outline" onClick={() => bulk('unpublish')}>Hide</Btn>
          <Btn size="sm" variant="danger" onClick={() => bulk('delete')}>Delete</Btn>
          <Btn size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Btn>
        </div>
      )}

      <ErrorBox error={list.error} onRetry={list.reload} />
      {list.loading && !list.items.length ? <Loading rows={3} /> : list.items.length === 0 ? (
        <EmptyRow>{list.q || cat || state ? 'No photos match these filters.' : 'No photos yet. Upload your first photos to build your portfolio.'}</EmptyRow>
      ) : (
        <>
          <label className="a-selectall"><input type="checkbox" checked={allOnPage} onChange={toggleAll} /> Select all on this page</label>
          <div className="a-gallery">
            {list.items.map((it) => (
              <figure key={it.id} className={`a-gitem ${selected.has(it.id) ? 'is-on' : ''} ${list.loading ? 'is-stale' : ''}`}>
                <label className="a-gitem__check"><input type="checkbox" checked={selected.has(it.id)} onChange={() => toggle(it.id)} aria-label={`Select ${it.title || 'photo'}`} /></label>
                <button type="button" className="a-gitem__img" onClick={() => openEdit(it)} aria-label={`Edit ${it.title || 'photo'}`}><Img src={it.image} alt={it.title || ''} ratio="1/1" width={360} /></button>
                <figcaption>
                  <span>{it.title || <em className="a-muted">Untitled</em>}</span>
                  <span className="a-gitem__meta">{it.category?.name && <small>{it.category.name}</small>}{it.featured && <Icon name="star" size={13} />}{!it.published && <Badge tone="muted">Hidden</Badge>}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </>
      )}
      <Pager {...list} />

      <Modal open={Boolean(editing)} onClose={() => !saving && setEditing(null)} title="Edit photo"
        footer={<><Btn variant="ghost" onClick={removeOne} disabled={saving}>Delete</Btn><Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Btn></>}>
        {editing && (<>
          {error && <p className="a-error" role="alert">{error}</p>}
          <FormGrid form={editing.form} set={set} errors={errors} fields={[
            { key: 'image', label: 'Photo', type: 'image', folder: 'gallery' },
            { key: 'title', label: 'Title', max: 160 },
            { key: 'category', label: 'Category', type: 'select', options: catOptions, placeholder: 'No category' },
            { key: 'caption', label: 'Caption', type: 'textarea', rows: 3, max: 600 },
            { key: 'order', label: 'Display order', type: 'number' },
            { key: 'featured', label: 'Feature on homepage', type: 'switch' },
            { key: 'published', label: 'Show on website', type: 'switch' },
          ]} />
        </>)}
      </Modal>
    </>
  );
}
