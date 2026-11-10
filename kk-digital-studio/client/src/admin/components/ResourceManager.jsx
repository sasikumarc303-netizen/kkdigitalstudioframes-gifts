import { useMemo, useState } from 'react';
import Img from '../../components/Img.jsx';
import Icon from '../../components/Icon.jsx';
import { Btn } from '../../components/Buttons.jsx';
import { useToast } from '../../components/Toast.jsx';
import { api } from '../../services/api.js';
import { usePaged } from '../hooks/usePaged.js';
import { ImageField, ImagesField } from './MediaPicker.jsx';
import {
  Badge, EmptyRow, ErrorBox, Loading, Modal, NumberField, PageHeader, Pager, SearchBox, SelectField, StringList, Switch,
  TextArea, TextField, useConfirm, useSaveState,
} from './ui.jsx';

/** Renders one form control from a field definition. */
export function FieldControl({ def, form, set, errors }) {
  const v = form[def.key];
  const common = { label: def.label, error: errors?.[def.key], hint: def.hint };
  switch (def.type) {
    case 'textarea': return <TextArea {...common} rows={def.rows || 4} value={v} onChange={(x) => set(def.key, x)} maxLength={def.max} />;
    case 'number': return <NumberField {...common} value={v} onChange={(x) => set(def.key, x)} min={def.min ?? 0} step={def.step} />;
    case 'select': return <SelectField {...common} value={v} onChange={(x) => set(def.key, x)} options={def.options} placeholder={def.placeholder} />;
    case 'switch': return <Switch label={def.label} hint={def.hint} checked={v} onChange={(x) => set(def.key, x)} />;
    case 'strings': return <StringList label={def.label} value={v} onChange={(x) => set(def.key, x)} placeholder={def.placeholder} />;
    case 'image': return <ImageField label={def.label} hint={def.hint} value={v} onChange={(x) => set(def.key, x)} folder={def.folder} />;
    case 'images': return <ImagesField label={def.label} value={v} onChange={(x) => set(def.key, x)} folder={def.folder} />;
    default: return <TextField {...common} type={def.type || 'text'} value={v} onChange={(x) => set(def.key, x)} maxLength={def.max} required={def.required} />;
  }
}

export function FormGrid({ fields, form, set, errors }) {
  return (
    <div className="a-form">
      {fields.map((f) => (
        <div key={f.key} className={`a-form__item ${f.wide || ['textarea', 'strings', 'image', 'images'].includes(f.type) ? 'is-wide' : ''}`}>
          <FieldControl def={f} form={form} set={set} errors={errors} />
        </div>
      ))}
    </div>
  );
}

/**
 * Generic list + create/edit modal manager for a simple REST resource.
 * `fields` drive the form; `columns` drive the table (cell(item) renders content).
 */
export default function ResourceManager({
  title, subtitle, singular, endpoint, columns, fields, blank, toForm = (i) => ({ ...blank, ...i }), toPayload = (f) => f,
  filters = {}, extraToolbar, searchPlaceholder, thumb, canDelete = true, modalExtra, afterSave, wide = false,
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const list = usePaged(endpoint, { filters });
  const [editing, setEditing] = useState(null); // null | { id?, form }
  const [{ saving, error, errors }, run] = useSaveState();
  const [busyId, setBusyId] = useState('');

  const set = (k, v) => setEditing((e) => ({ ...e, form: { ...e.form, [k]: v } }));
  const open = (item) => setEditing({ id: item?.id, form: item ? toForm(item) : { ...blank } });

  const save = async () => {
    const payload = toPayload(editing.form);
    const r = await run(() => (editing.id ? api.put(`${endpoint}/${editing.id}`, payload) : api.post(endpoint, payload)));
    if (r) {
      toast(`${singular} ${editing.id ? 'updated' : 'created'}`);
      setEditing(null);
      list.reload();
      afterSave?.(r);
    }
  };

  const togglePublish = async (item) => {
    setBusyId(item.id);
    try {
      await api.put(`${endpoint}/${item.id}`, { ...toPayload(toForm(item)), published: !item.published });
      toast(item.published ? `${singular} hidden from the website` : `${singular} published`);
      list.reload();
    } catch (e) { toast(e.message, 'error'); } finally { setBusyId(''); }
  };

  const remove = async (item) => {
    const name = item.title || item.name || singular;
    if (!(await confirm({ title: `Delete ${singular.toLowerCase()}?`, message: `“${name}” will be permanently removed. This cannot be undone.`, confirmLabel: 'Delete' }))) return;
    try { await api.del(`${endpoint}/${item.id}`); toast(`${singular} deleted`); list.reload(); } catch (e) { toast(e.message, 'error'); }
  };

  const cols = useMemo(() => columns, [columns]);

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} actions={<Btn icon="plus" onClick={() => open(null)}>Add {singular.toLowerCase()}</Btn>} />
      <div className="a-toolbar">
        <SearchBox value={list.q} onChange={list.setQ} placeholder={searchPlaceholder || `Search ${title.toLowerCase()}…`} />
        {extraToolbar}
      </div>
      <ErrorBox error={list.error} onRetry={list.reload} />
      {list.loading && !list.items.length ? <Loading /> : list.items.length === 0 ? (
        <EmptyRow>{list.q ? 'Nothing matches your search.' : `No ${title.toLowerCase()} yet.`} {!list.q && <Btn size="sm" onClick={() => open(null)}>Add the first one</Btn>}</EmptyRow>
      ) : (
        <div className="a-table-wrap">
          <table className="a-table">
            <thead><tr>{thumb && <th aria-label="Image" />}{cols.map((c) => <th key={c.label}>{c.label}</th>)}<th className="a-table__actions">Actions</th></tr></thead>
            <tbody>
              {list.items.map((it) => (
                <tr key={it.id} className={list.loading ? 'is-stale' : ''}>
                  {thumb && <td className="a-table__thumb"><Img src={thumb(it)} alt="" ratio="1/1" width={80} /></td>}
                  {cols.map((c) => <td key={c.label} data-label={c.label}>{c.cell(it)}</td>)}
                  <td className="a-table__actions" data-label="Actions">
                    <button type="button" className="a-icon-btn" onClick={() => open(it)} aria-label={`Edit ${it.title || it.name}`} title="Edit"><Icon name="edit" size={17} /></button>
                    {'published' in it && (
                      <button type="button" className="a-icon-btn" disabled={busyId === it.id} onClick={() => togglePublish(it)} aria-label={it.published ? 'Hide from website' : 'Publish'} title={it.published ? 'Hide from website' : 'Publish'}><Icon name={it.published ? 'eye' : 'eyeOff'} size={17} /></button>
                    )}
                    {canDelete && <button type="button" className="a-icon-btn is-danger" onClick={() => remove(it)} aria-label={`Delete ${it.title || it.name}`} title="Delete"><Icon name="trash" size={17} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager {...list} />

      <Modal open={Boolean(editing)} onClose={() => !saving && setEditing(null)} wide={wide} title={editing?.id ? `Edit ${singular.toLowerCase()}` : `Add ${singular.toLowerCase()}`}
        footer={<><Btn variant="ghost" onClick={() => setEditing(null)} disabled={saving}>Cancel</Btn><Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Btn></>}>
        {editing && (
          <>
            {error && <p className="a-error" role="alert">{error}</p>}
            <FormGrid fields={fields} form={editing.form} set={set} errors={errors} />
            {modalExtra?.(editing.form, set)}
          </>
        )}
      </Modal>
    </>
  );
}

export const PublishedBadge = ({ on }) => <Badge tone={on ? 'success' : 'muted'}>{on ? 'Published' : 'Hidden'}</Badge>;
