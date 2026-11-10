import { useRef, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { Btn } from '../../components/Buttons.jsx';
import { useToast } from '../../components/Toast.jsx';
import { api } from '../../services/api.js';
import { formatDate } from '../../services/format.js';
import { usePaged } from '../hooks/usePaged.js';
import { FormGrid } from '../components/ResourceManager.jsx';
import { Badge, Card, EmptyRow, ErrorBox, Loading, Modal, PageHeader, Pager, useConfirm, useSaveState } from '../components/ui.jsx';

const mb = (b) => (b ? `${(b / 1048576).toFixed(1)} MB` : '');
const dur = (s) => (s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : '');

export default function Videos() {
  const toast = useToast();
  const confirm = useConfirm();
  const list = usePaged('/admin/media', { filters: { type: 'video' }, limit: 12 });
  const upRef = useRef(null);
  const replRef = useRef(null);
  const [replaceId, setReplaceId] = useState('');
  const [busy, setBusy] = useState('');
  const [edit, setEdit] = useState(null);
  const [{ saving, error }, run] = useSaveState();
  const hero = list.extra.hero || {};

  const upload = async (files) => {
    if (!files?.length) return;
    const fd = new FormData();
    [...files].forEach((f) => fd.append('files', f));
    fd.append('folder', 'videos');
    setBusy('upload');
    try {
      const { created, errors } = await api.upload('/admin/media', fd);
      if (created.length) toast('Video uploaded');
      if (errors?.length) toast(errors.map((e) => `${e.file}: ${e.message}`).join('\n'), 'error');
      list.reload();
    } catch (e) { toast(e.message, 'error'); } finally { setBusy(''); if (upRef.current) upRef.current.value = ''; }
  };

  const replace = async (files) => {
    if (!files?.length || !replaceId) return;
    const fd = new FormData();
    fd.append('files', files[0]);
    setBusy(replaceId);
    try { await api.upload(`/admin/media/${replaceId}/replace`, fd); toast('Video replaced. Anywhere it was used now shows the new file.'); list.reload(); } catch (e) { toast(e.message, 'error'); } finally { setBusy(''); setReplaceId(''); if (replRef.current) replRef.current.value = ''; }
  };

  const setHero = async (v, device) => {
    setBusy(v.id);
    try { await api.post(`/admin/media/${v.id}/set-hero`, { device }); toast(`Homepage hero video updated (${device})`); list.reload(); } catch (e) { toast(e.message, 'error'); } finally { setBusy(''); }
  };

  const remove = async (v) => {
    if (!(await confirm({ title: 'Delete this video?', message: `“${v.title}” will be permanently deleted from storage. Videos in use on the website cannot be deleted.`, confirmLabel: 'Delete' }))) return;
    try { await api.del(`/admin/media/${v.id}`); toast('Video deleted'); list.reload(); } catch (e) { toast(e.message, 'error'); }
  };

  const saveEdit = async () => {
    const r = await run(() => api.put(`/admin/media/${edit.id}`, edit.form));
    if (r) { toast('Video updated'); setEdit(null); list.reload(); }
  };

  const isDesktop = (v) => v.url === hero.desktop;
  const isMobile = (v) => v.url === hero.mobile;

  return (
    <>
      <PageHeader title="Video" subtitle="Upload, preview and choose the video that plays at the top of your homepage."
        actions={<><input ref={upRef} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={(e) => upload(e.target.files)} /><Btn icon="upload" onClick={() => upRef.current?.click()} disabled={busy === 'upload'}>{busy === 'upload' ? 'Uploading…' : 'Upload video'}</Btn></>} />
      <input ref={replRef} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={(e) => replace(e.target.files)} />

      <Card title="Currently on the homepage">
        <div className="a-hero-now">
          <div><span className="a-muted">Desktop</span>{hero.desktop ? <video src={hero.desktop} muted playsInline controls preload="metadata" /> : <EmptyRow>No video set</EmptyRow>}</div>
          <div><span className="a-muted">Mobile</span>{hero.mobile ? <video src={hero.mobile} muted playsInline controls preload="metadata" /> : <EmptyRow>No video set</EmptyRow>}</div>
        </div>
        <p className="a-muted">Tip: for best results use MP4 (H.264), 1280×720 or 1920×1080, 10–20 seconds, no audio, under 8 MB. Use a smaller 854×480 file for mobile.</p>
      </Card>

      <ErrorBox error={list.error} onRetry={list.reload} />
      {list.loading && !list.items.length ? <Loading rows={2} /> : list.items.length === 0 ? <EmptyRow>No videos in the library yet.</EmptyRow> : (
        <div className="a-videos">
          {list.items.map((v) => (
            <article key={v.id} className={`a-video ${list.loading ? 'is-stale' : ''}`}>
              <video src={v.url} poster={v.poster || undefined} controls muted playsInline preload="metadata" />
              <div className="a-video__body">
                <h3>{v.title}</h3>
                <p className="a-muted">{[mb(v.bytes), dur(v.duration), v.width && v.height ? `${v.width}×${v.height}` : '', formatDate(v.createdAt)].filter(Boolean).join(' · ')}</p>
                <div className="a-tags">
                  {isDesktop(v) && <Badge tone="success">Hero · desktop</Badge>}
                  {isMobile(v) && <Badge tone="success">Hero · mobile</Badge>}
                  {v.purpose === 'promo' && <Badge tone="info">Promo</Badge>}
                  {v.provider === 'static' && <Badge tone="muted">Built in</Badge>}
                </div>
                <div className="a-video__actions">
                  <Btn size="sm" disabled={busy === v.id} onClick={() => setHero(v, 'desktop')}>Use on desktop</Btn>
                  <Btn size="sm" variant="outline" disabled={busy === v.id} onClick={() => setHero(v, 'mobile')}>Use on mobile</Btn>
                  <Btn size="sm" variant="outline" disabled={busy === v.id} onClick={() => setHero(v, 'both')}>Both</Btn>
                </div>
                <div className="a-video__actions">
                  <button type="button" className="a-icon-btn" onClick={() => setEdit({ id: v.id, form: { title: v.title, alt: v.alt || '', poster: v.poster || '', purpose: v.purpose } })} aria-label="Edit details" title="Edit details"><Icon name="edit" size={17} /></button>
                  {v.provider !== 'static' && <button type="button" className="a-icon-btn" onClick={() => { setReplaceId(v.id); setTimeout(() => replRef.current?.click(), 0); }} aria-label="Replace file" title="Replace file"><Icon name="upload" size={17} /></button>}
                  <button type="button" className="a-icon-btn is-danger" onClick={() => remove(v)} aria-label="Delete video" title="Delete"><Icon name="trash" size={17} /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <Pager {...list} />

      <Modal open={Boolean(edit)} onClose={() => !saving && setEdit(null)} title="Video details" footer={<><Btn variant="ghost" onClick={() => setEdit(null)} disabled={saving}>Cancel</Btn><Btn onClick={saveEdit} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Btn></>}>
        {edit && (<>{error && <p className="a-error" role="alert">{error}</p>}
          <FormGrid form={edit.form} set={(k, v) => setEdit((e) => ({ ...e, form: { ...e.form, [k]: v } }))} errors={{}} fields={[
            { key: 'title', label: 'Title', max: 160 },
            { key: 'alt', label: 'Description (for accessibility)', max: 300 },
            { key: 'poster', label: 'Poster image', type: 'image', folder: 'hero', hint: 'Shown before the video plays and when motion is reduced.' },
            { key: 'purpose', label: 'Purpose', type: 'select', options: [{ value: 'general', label: 'General' }, { value: 'promo', label: 'Promotional' }] },
          ]} /></>)}
      </Modal>
    </>
  );
}
