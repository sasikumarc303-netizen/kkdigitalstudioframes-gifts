import { useState } from 'react';
import { Btn } from '../../components/Buttons.jsx';
import { useToast } from '../../components/Toast.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { api } from '../../services/api.js';
import { formatDate } from '../../services/format.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Badge, EmptyRow, ErrorBox, Loading, Modal, PageHeader, SelectField, Switch, TextField, useConfirm, useSaveState } from '../components/ui.jsx';

const LABELS = {
  dashboard: 'Dashboard', homepage: 'Homepage', videos: 'Video', gallery: 'Gallery', services: 'Services', packages: 'Packages', products: 'Products', categories: 'Categories', orders: 'Orders',
  bookings: 'Bookings', customers: 'Customers', enquiries: 'Enquiries', testimonials: 'Testimonials', contact: 'Contact info', navigation: 'Navigation', settings: 'Website settings',
  seo: 'SEO', media: 'Media library', users: 'Users & permissions', logs: 'Activity logs',
};

export default function Users() {
  const toast = useToast();
  const confirm = useConfirm();
  const { user: me } = useAuth();
  const { data, loading, error, reload } = useAsync(() => api.get('/admin/users'), []);
  const [edit, setEdit] = useState(null);
  const [{ saving, error: saveError, errors }, run] = useSaveState();
  const roles = data?.roles || [];
  const modules = data?.modules || [];
  const defaults = data?.roleDefaults || {};
  const set = (k, v) => setEdit((e) => ({ ...e, form: { ...e.form, [k]: v } }));

  const open = (u) => setEdit(u
    ? { id: u.id, self: u.id === me.id, form: { name: u.name, email: u.email, role: u.role, active: u.active, permissions: u.permissions, password: '' } }
    : { form: { name: '', email: '', role: 'editor', active: true, permissions: defaults.editor || [], password: '' } });

  const changeRole = (role) => setEdit((e) => ({ ...e, form: { ...e.form, role, permissions: defaults[role] || e.form.permissions } }));
  const togglePerm = (m) => set('permissions', edit.form.permissions.includes(m) ? edit.form.permissions.filter((x) => x !== m) : [...edit.form.permissions, m]);

  const save = async () => {
    const f = edit.form;
    const body = { name: f.name, role: f.role, active: f.active, permissions: f.permissions };
    if (edit.id) { if (f.password) body.password = f.password; } else { body.email = f.email; body.password = f.password; }
    const r = await run(() => (edit.id ? api.put(`/admin/users/${edit.id}`, body) : api.post('/admin/users', body)));
    if (r) { toast(edit.id ? 'User updated' : 'User created'); setEdit(null); reload(); }
  };

  const remove = async () => {
    if (!(await confirm({ title: 'Delete this user?', message: `${edit.form.email} will no longer be able to sign in.`, confirmLabel: 'Delete' }))) return;
    try { await api.del(`/admin/users/${edit.id}`); toast('User deleted'); setEdit(null); reload(); } catch (e) { toast(e.message, 'error'); }
  };

  const isSuper = edit?.form.role === 'superadmin';

  return (
    <>
      <PageHeader title="Users & permissions" subtitle="Create team accounts and choose exactly which modules each person can use. Permissions are enforced by the server."
        actions={<Btn icon="plus" onClick={() => open(null)}>Add user</Btn>} />
      <ErrorBox error={error} onRetry={reload} />
      {loading && !data ? <Loading /> : !data?.items?.length ? <EmptyRow>No users.</EmptyRow> : (
        <div className="a-table-wrap">
          <table className="a-table a-table--clickable">
            <thead><tr><th>User</th><th>Role</th><th>Access</th><th>Status</th><th>Last sign in</th></tr></thead>
            <tbody>
              {data.items.map((u) => (
                <tr key={u.id} onClick={() => open(u)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && open(u)}>
                  <td data-label="User"><strong>{u.name}{u.id === me.id ? ' (you)' : ''}</strong><small className="a-sub">{u.email}</small></td>
                  <td data-label="Role"><Badge tone="info">{u.role}</Badge></td>
                  <td data-label="Access">{u.role === 'superadmin' ? 'Everything' : `${u.permissions.length} of ${modules.length} modules`}</td>
                  <td data-label="Status"><Badge tone={u.active ? 'success' : 'muted'}>{u.active ? 'Active' : 'Disabled'}</Badge></td>
                  <td data-label="Last sign in">{u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={Boolean(edit)} onClose={() => !saving && setEdit(null)} wide title={edit?.id ? 'Edit user' : 'Add user'}
        footer={edit && <>{edit.id && !edit.self && <Btn variant="ghost" onClick={remove} disabled={saving}>Delete</Btn>}<Btn variant="ghost" onClick={() => setEdit(null)} disabled={saving}>Cancel</Btn><Btn onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Btn></>}>
        {edit && (
          <>
            {saveError && <p className="a-error" role="alert">{saveError}</p>}
            <div className="a-form">
              <div className="a-form__item"><TextField label="Name" value={edit.form.name} onChange={(v) => set('name', v)} error={errors.name} required /></div>
              <div className="a-form__item"><TextField label="Email" type="email" value={edit.form.email} onChange={(v) => set('email', v)} error={errors.email} disabled={Boolean(edit.id)} required /></div>
              <div className="a-form__item"><SelectField label="Role" value={edit.form.role} onChange={changeRole} options={roles} error={errors.role} /></div>
              <div className="a-form__item"><TextField label={edit.id ? 'New password (optional)' : 'Password'} type="password" autoComplete="new-password" value={edit.form.password} onChange={(v) => set('password', v)} error={errors.password} hint="At least 10 characters, with a letter and a number" /></div>
              <div className="a-form__item is-wide"><Switch label="Account active" hint={edit.self ? 'You cannot disable your own account' : 'Disabled users cannot sign in'} checked={edit.form.active} onChange={(v) => set('active', v)} /></div>
            </div>
            <fieldset className="a-perms">
              <legend>Module access</legend>
              {isSuper ? <p className="a-muted">Superadmins always have access to every module.</p> : (
                <>
                  <p className="a-muted">Changing the role resets these to that role’s defaults. You can then adjust them.</p>
                  <div className="a-perms__grid">
                    {modules.map((m) => (
                      <label key={m} className={`a-pick__item ${edit.form.permissions.includes(m) ? 'is-on' : ''}`}>
                        <input type="checkbox" checked={edit.form.permissions.includes(m)} onChange={() => togglePerm(m)} />
                        <span>{LABELS[m] || m}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </fieldset>
          </>
        )}
      </Modal>
    </>
  );
}
