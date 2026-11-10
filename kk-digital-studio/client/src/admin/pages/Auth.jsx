import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../../components/Icon.jsx';
import { Btn } from '../../components/Buttons.jsx';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { TextField, useSaveState } from '../components/ui.jsx';

function AuthFrame({ title, text, children, footer }) {
  return (
    <div className="a-auth">
      <div className="a-auth__card">
        <div className="a-auth__logo"><Icon name="camera" size={30} stroke={1.4} /></div>
        <h1>{title}</h1>
        {text && <p className="a-muted">{text}</p>}
        {children}
        {footer && <p className="a-auth__foot">{footer}</p>}
      </div>
      <a className="a-auth__back" href="/">← Back to website</a>
    </div>
  );
}

export function Login() {
  const { user, login, loading } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [{ saving, error, errors }, run] = useSaveState();
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  if (!loading && user) return <Navigate to={location.state?.from?.startsWith('/admin') ? location.state.from : '/admin/dashboard'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    const u = await run(() => login(form.email.trim(), form.password));
    if (u) nav(location.state?.from?.startsWith('/admin') ? location.state.from : '/admin/dashboard', { replace: true });
  };

  return (
    <AuthFrame title="Admin sign in" text="Manage your website, bookings and orders." footer={<Link to="/admin/forgot-password">Forgot your password?</Link>}>
      <form onSubmit={submit} noValidate>
        <TextField label="Email" type="email" autoComplete="username" value={form.email} onChange={set('email')} error={errors.email} />
        <TextField label="Password" type="password" autoComplete="current-password" value={form.password} onChange={set('password')} error={errors.password} />
        {error && <p className="a-error" role="alert">{error}</p>}
        <Btn block type="submit" disabled={saving || !form.email || !form.password}>{saving ? 'Signing in…' : 'Sign in'}</Btn>
      </form>
    </AuthFrame>
  );
}

export function Forgot() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState('');
  const [{ saving, error, errors }, run] = useSaveState();
  const submit = async (e) => {
    e.preventDefault();
    const r = await run(() => api.post('/admin/auth/forgot', { email: email.trim() }));
    if (r) setDone(r.message);
  };
  return (
    <AuthFrame title="Reset your password" text="Enter your admin email and we will send a reset link, if email delivery has been configured on the server." footer={<Link to="/admin/login">Back to sign in</Link>}>
      {done ? <p className="a-note" role="status">{done}</p> : (
        <form onSubmit={submit} noValidate>
          <TextField label="Email" type="email" value={email} onChange={setEmail} error={errors.email} autoComplete="username" />
          {error && <p className="a-error" role="alert">{error}</p>}
          <Btn block type="submit" disabled={saving || !email}>{saving ? 'Sending…' : 'Send reset link'}</Btn>
        </form>
      )}
    </AuthFrame>
  );
}

export function Reset() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const email = params.get('email') || '';
  const token = params.get('token') || '';
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [done, setDone] = useState(false);
  const [{ saving, error, errors }, run] = useSaveState();
  const mismatch = pw2 && pw !== pw2 ? 'Passwords do not match' : '';
  const submit = async (e) => {
    e.preventDefault();
    if (pw !== pw2) return;
    const r = await run(() => api.post('/admin/auth/reset', { email, token, password: pw }));
    if (r) { setDone(true); setTimeout(() => nav('/admin/login'), 1800); }
  };
  if (!email || !token) return <AuthFrame title="Link not valid" text="This reset link is incomplete. Request a new one." footer={<Link to="/admin/forgot-password">Request a new link</Link>} />;
  return (
    <AuthFrame title="Choose a new password" text={`For ${email}`}>
      {done ? <p className="a-note" role="status">Password updated. Redirecting to sign in…</p> : (
        <form onSubmit={submit} noValidate>
          <TextField label="New password" type="password" autoComplete="new-password" value={pw} onChange={setPw} error={errors.password} hint="At least 10 characters, with a letter and a number" />
          <TextField label="Confirm password" type="password" autoComplete="new-password" value={pw2} onChange={setPw2} error={mismatch} />
          {error && <p className="a-error" role="alert">{error}</p>}
          <Btn block type="submit" disabled={saving || !pw || Boolean(mismatch)}>{saving ? 'Saving…' : 'Update password'}</Btn>
        </form>
      )}
    </AuthFrame>
  );
}
