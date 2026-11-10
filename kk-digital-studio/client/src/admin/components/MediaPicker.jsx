import { useRef, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import Img from '../../components/Img.jsx';
import { Btn } from '../../components/Buttons.jsx';
import { useToast } from '../../components/Toast.jsx';
import { api } from '../../services/api.js';
import { usePaged } from '../hooks/usePaged.js';
import { Modal, Pager, SearchBox, Loading, ErrorBox } from './ui.jsx';

/** Pick (or upload) media from the library. `type` = image | video. onSelect receives the media record(s). */
export function MediaPicker({ open, onClose, type = 'image', multiple = false, onSelect, folder = 'general', title }) {
  const toast = useToast();
  const list = usePaged('/admin/media', { filters: { type }, limit: 24 });
  const [picked, setPicked] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const toggle = (m) => {
    if (!multiple) { onSelect([m]); onClose(); return; }
    setPicked((p) => (p.find((x) => x.id === m.id) ? p.filter((x) => x.id !== m.id) : [...p, m]));
  };

  const upload = async (files) => {
    if (!files?.length) return;
    const fd = new FormData();
    [...files].forEach((f) => fd.append('files', f));
    fd.append('folder', folder);
    setUploading(true);
    try {
      const { created, errors } = await api.upload('/admin/media', fd);
      if (errors?.length) toast(errors.map((e) => `${e.file}: ${e.message}`).join('\n'), 'error');
      if (created.length) {
        toast(`${created.length} file${created.length > 1 ? 's' : ''} uploaded`);
        list.reload();
        if (multiple) setPicked((p) => [...p, ...created]);
        else { onSelect(created); onClose(); }
      }
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const done = () => { onSelect(picked); setPicked([]); onClose(); };
  const accept = type === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/jpeg,image/png,image/webp,image/gif,image/avif';

  return (
    <Modal open={open} onClose={onClose} wide title={title || `Choose ${type === 'video' ? 'a video' : multiple ? 'images' : 'an image'}`}
      footer={multiple ? <><span className="a-muted">{picked.length} selected</span><Btn onClick={done} disabled={!picked.length}>Use selected</Btn></> : undefined}>
      <div className="a-toolbar">
        <SearchBox value={list.q} onChange={list.setQ} placeholder="Search media…" />
        <input ref={fileRef} type="file" accept={accept} multiple={multiple} hidden onChange={(e) => upload(e.target.files)} />
        <Btn icon="upload" onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? 'Uploading…' : 'Upload new'}</Btn>
      </div>
      <ErrorBox error={list.error} onRetry={list.reload} />
      {list.loading && !list.items.length ? <Loading rows={3} /> : (
        <div className="a-media-grid">
          {list.items.map((m) => {
            const on = picked.some((x) => x.id === m.id);
            return (
              <button key={m.id} type="button" className={`a-media ${on ? 'is-on' : ''}`} onClick={() => toggle(m)} aria-pressed={on} title={m.title}>
                {m.type === 'video' ? <Img src={m.poster} alt="" ratio="1/1" icon="video" /> : <Img src={m.url} alt={m.alt} ratio="1/1" width={240} />}
                {m.type === 'video' && <span className="a-media__tag"><Icon name="video" size={14} /></span>}
                {on && <span className="a-media__check"><Icon name="check" size={16} /></span>}
                <span className="a-media__name">{m.title}</span>
              </button>
            );
          })}
          {!list.loading && list.items.length === 0 && <p className="a-muted">Nothing here yet. Upload your first file.</p>}
        </div>
      )}
      <Pager {...list} />
    </Modal>
  );
}

/** Single-image field with preview, library picker and optional manual URL. */
export function ImageField({ label, value, onChange, type = 'image', hint, folder }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="a-imgfield">
      <span className="a-imgfield__label">{label}</span>
      <div className="a-imgfield__box">
        <div className="a-imgfield__preview">
          {value ? (type === 'video'
            ? <video src={value} muted playsInline preload="metadata" />
            : <Img src={value} alt="" ratio="4/3" width={320} />) : <span><Icon name={type === 'video' ? 'video' : 'image'} size={28} stroke={1.2} /></span>}
        </div>
        <div className="a-imgfield__actions">
          <Btn size="sm" variant="outline" onClick={() => setOpen(true)}>{value ? 'Change' : `Choose ${type}`}</Btn>
          {value && <Btn size="sm" variant="ghost" onClick={() => onChange('')}>Remove</Btn>}
        </div>
      </div>
      {hint && <small className="a-muted">{hint}</small>}
      <MediaPicker open={open} onClose={() => setOpen(false)} type={type} folder={folder} onSelect={([m]) => onChange(m.url)} />
    </div>
  );
}

/** Multi-image field (product galleries). */
export function ImagesField({ label, value = [], onChange, folder }) {
  const [open, setOpen] = useState(false);
  const move = (i, d) => { const a = [...value]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; onChange(a); };
  return (
    <div className="a-imgfield">
      <span className="a-imgfield__label">{label}</span>
      <div className="a-thumbs">
        {value.map((u, i) => (
          <div className="a-thumb" key={u + i}>
            <Img src={u} alt="" ratio="1/1" width={200} />
            <div className="a-thumb__bar">
              <button type="button" onClick={() => move(i, -1)} aria-label="Move earlier" disabled={i === 0}><Icon name="chevronLeft" size={14} /></button>
              <button type="button" onClick={() => move(i, 1)} aria-label="Move later" disabled={i === value.length - 1}><Icon name="chevronRight" size={14} /></button>
              <button type="button" onClick={() => onChange(value.filter((_, n) => n !== i))} aria-label="Remove image"><Icon name="trash" size={14} /></button>
            </div>
            {i === 0 && <span className="a-thumb__main">Main</span>}
          </div>
        ))}
        <button type="button" className="a-thumb a-thumb--add" onClick={() => setOpen(true)}><Icon name="plus" /> Add</button>
      </div>
      <MediaPicker open={open} onClose={() => setOpen(false)} multiple folder={folder} onSelect={(ms) => onChange([...value, ...ms.map((m) => m.url).filter((u) => !value.includes(u))])} />
    </div>
  );
}
