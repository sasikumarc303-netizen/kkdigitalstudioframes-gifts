import { useState } from 'react';
import { Btn } from '../../components/Buttons.jsx';
import { useToast } from '../../components/Toast.jsx';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatDate } from '../../services/format.js';
import { Card, PageHeader, TextField, Badge, useSaveState } from '../components/ui.jsx';

export default function Account() {
  const { user, can } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [{ saving, error, errors }, run] = useSaveState();
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const mismatch = f.confirm && f.newPassword !== f.confirm ? 'Passwords do not match' : '';

  const submit = async (e) => {
    e.preventDefault();
    if (mismatch) return;
    const r = await run(() => api.post('/admin/auth/change-password', { currentPassword: f.currentPassword, newPassword: f.newPassword }));
    if (r) { toast('Password changed'); setF({ currentPassword: '', newPassword: '', confirm: '' }); }
  };

  return (
    <>
      <PageHeader title="My account" subtitle="Your profile and password" />
      <div className="a-grid a-grid--2">
        <Card title="Profile">
          <dl className="a-dl">
            <dt>Name</dt><dd>{user.name}</dd>
            <dt>Email</dt><dd>{user.email}</dd>
            <dt>Role</dt><dd><Badge tone="info">{user.role}</Badge></dd>
            <dt>Last sign in</dt><dd>{user.lastLoginAt ? formatDate(user.lastLoginAt) : '—'}</dd>
            <dt>Access</dt><dd className="a-tags">{user.permissions.map((p) => <span key={p} className="a-tag">{p}</span>)}</dd>
          </dl>
          {can('users') && <p className="a-muted">Roles and permissions are managed under Users &amp; permissions.</p>}
        </Card>
        <Card title="Change password">
          <form onSubmit={submit} noValidate>
            <TextField label="Current password" type="password" autoComplete="current-password" value={f.currentPassword} onChange={set('currentPassword')} error={errors.currentPassword} />
            <TextField label="New password" type="password" autoComplete="new-password" value={f.newPassword} onChange={set('newPassword')} error={errors.newPassword} hint="At least 10 characters, with a letter and a number" />
            <TextField label="Confirm new password" type="password" autoComplete="new-password" value={f.confirm} onChange={set('confirm')} error={mismatch} />
            {error && <p className="a-error" role="alert">{error}</p>}
            <Btn type="submit" disabled={saving || !f.currentPassword || !f.newPassword || Boolean(mismatch)}>{saving ? 'Saving…' : 'Change password'}</Btn>
          </form>
        </Card>
      </div>
    </>
  );
}
