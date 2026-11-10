import { useRef, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import Img from '../../components/Img.jsx';
import { Btn } from '../../components/Buttons.jsx';
import { useToast } from '../../components/Toast.jsx';
import { api } from '../../services/api.js';
import { formatDate } from '../../services/format.js';
import { usePaged } from '../hooks/usePaged.js';
import { FormGrid } from '../components/ResourceManager.jsx';
import { Chips, EmptyRow, ErrorBox, Loading, Modal, PageHeader, Pager, SearchBox, useConfirm, useSaveState } from '../components/ui.jsx';

const mb = (b) => (b ? (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`) : '');

export default function MediaLibrary() {
  const toast = useToast();
  const confirm = useConfirm();
  const [type, setType] = useState('');
  const list = usePaged('/admin/media', { filters: { type }, limit: 24 });
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [edit, setEdit] = useState(null);
  const [{ saving, error }, run] = useSaveState();

  const upload = async (files) => {
    if (!files?.length) return;
    const fd = new FormData();
    [...files].forEach((f) => fd.append('files', f));
    setUploading(true);
    try {
      const { created, errors } = await api.upload('/admin/media', fd);
      if (created.length) toast(`${created.length} file${created.length > 1 ? 's' : ''} uploaded`);
      if (errors?.length) toast(errors.map((e) => `${e.file}: ${e.message}`).join('\n'), 'error');
      list.reload();
    } catch (e) { toast(e.message, 'error'); } finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const save = async () => {
    const r = await run(() => api.put(`/admin/media/${edit.id}`, edit.form));
    if (r) { toast('Saved'); setEdit(null); list.reload(); }
  };
  const remove = async () => {
    if (!(await confirm({ title: 'Delete this file?', message: 'It will be permanently deleted. Files that are in use on the website cannot be deleted.', confirmLabel: 'Delete' }))) return;
    try { await api.del(`/admin/media/${edit.id}`); toast('File deleted'); setEdit(null); list.reload(); } catch (e) { toast(e.message, 'error'); }
  };
  const copy = async (url) => {
    try { await navigator.clipboard.writeText(new URL(url, window.location.origin).href); toast('Link copied'); } catch { toast('Could not copy the link', 'error'); }
  };

  return (
    <>
      <PageHeader title="Media library" subtitle="Every image and video uploaded to your website."
        actions={<><input ref={fileRef} type="file" multiple hidden accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime" onChange={(e) => upload(e.target.files)} /><Btn icon="upload" onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? 'Uploading…' : 'Upload files'}</Btn></>} />
      <Chips value={type} onChange={setType} options={[{ value: '', label: 'All' }, { value: 'image', label: 'Images' }, { value: 'video', label: 'Videos' }]} />
      <div className="a-toolbar"><SearchBox value={list.q} onChange={list.setQ} placeholder="Search by name or description…" /></div>
      <ErrorBox error={list.error} onRetry={list.reload} />
      {list.loading && !list.items.length ? <Loading rows={3} /> : list.items.length === 0 ? <EmptyRow>No files yet.</EmptyRow> : (
        <div className="a-media-grid a-media-grid--lib">
          {list.items.map((m) => (
            <button key={m.id} type="button" className={`a-media ${list.loading ? 'is-stale' : ''}`} onClick={() => setEdit({ id: m.id, m, form: { title: m.title, alt: m.alt || '' } })} title={m.title}>
              {m.type === 'video' ? <Img src={m.poster} alt="" ratio="1/1" icon="video" /> : <Img src={m.url} alt={m.alt} ratio="1/1" width={240} />}
              {m.type === 'video' && <span className="a-media__tag"><Icon name="video" size={14} /></span>}
              <span className="a-media__name">{m.title}</span>
            </button>
          ))}
        </div>
      )}
      <Pager {...list} />

      <Modal open={Boolean(edit)} onClose={() => !saving && setEdit(null)} title="File details" footer={<><Btn variant="ghost" onClick={remove} disabled={saving}>Delete</Btn><Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Btn></>}>
        {edit && (
          <>
            {error && <p className="a-error" role="alert">{error}</p>}
            <div className="a-preview">{edit.m.type === 'video' ? <video src={edit.m.url} controls muted playsInline preload="metadata" /> : <Img src={edit.m.url} alt={edit.m.alt} width={600} />}</div>
            <p className="a-muted">{[edit.m.type, mb(edit.m.bytes), edit.m.width && edit.m.height ? `${edit.m.width}×${edit.m.height}` : '', formatDate(edit.m.createdAt), edit.m.provider].filter(Boolean).join(' · ')}</p>
            <FormGrid form={edit.form} errors={{}} set={(k, v) => setEdit((e) => ({ ...e, form: { ...e.form, [k]: v } }))} fields={[{ key: 'title', label: 'Title', max: 160 }, { key: 'alt', label: 'Description (alt text)', max: 300, hint: 'Describe the image for screen readers and search engines.' }]} />
            <Btn size="sm" variant="outline" icon="copy" onClick={() => copy(edit.m.url)}>Copy link</Btn>
          </>
        )}
      </Modal>
    </>
  );
}
