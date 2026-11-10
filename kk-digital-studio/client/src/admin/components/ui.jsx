import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { Btn } from '../../components/Buttons.jsx';
import { Field } from '../../components/Form.jsx';
import { useLockBody } from '../../hooks/useMedia.js';

export const slugClass = (s = '') => String(s).toLowerCase().replace(/\s+/g, '-');

export function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="a-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="a-head__actions">{actions}</div>}
    </header>
  );
}

export const Card = ({ title, actions, children, className = '', pad = true }) => (
  <section className={`a-card ${className}`}>
    {(title || actions) && <header className="a-card__head"><h2>{title}</h2>{actions && <div>{actions}</div>}</header>}
    <div className={pad ? 'a-card__body' : ''}>{children}</div>
  </section>
);

export const Badge = ({ children, tone }) => <span className={`a-badge a-badge--${tone || slugClass(children)}`}>{children}</span>;

export function Modal({ open, onClose, title, children, footer, wide = false }) {
  useLockBody(open);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="a-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`a-modal ${wide ? 'a-modal--wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="a-modal__head">
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </header>
        <div className="a-modal__body">{children}</div>
        {footer && <footer className="a-modal__foot">{footer}</footer>}
      </div>
    </div>
  );
}

// ---- promise-based confirm dialog ----
const ConfirmCtx = createContext(() => Promise.resolve(false));
export const useConfirm = () => useContext(ConfirmCtx);
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolver = useRef(null);
  const confirm = useCallback((opts) => new Promise((resolve) => { resolver.current = resolve; setState(opts); }), []);
  const close = (v) => { resolver.current?.(v); setState(null); };
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Modal open={Boolean(state)} onClose={() => close(false)} title={state?.title || 'Are you sure?'}
        footer={<><Btn variant="ghost" onClick={() => close(false)}>Cancel</Btn><Btn variant={state?.danger === false ? 'primary' : 'danger'} onClick={() => close(true)}>{state?.confirmLabel || 'Confirm'}</Btn></>}>
        <p>{state?.message}</p>
      </Modal>
    </ConfirmCtx.Provider>
  );
}

// ---- form controls ----
export function TextField({ label, value, onChange, error, hint, required, type = 'text', ...rest }) {
  return (
    <Field label={label} error={error} hint={hint} required={required}>
      <input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />
    </Field>
  );
}
export function NumberField({ label, value, onChange, error, hint, ...rest }) {
  return (
    <Field label={label} error={error} hint={hint}>
      <input type="number" inputMode="decimal" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} {...rest} />
    </Field>
  );
}
export function TextArea({ label, value, onChange, error, hint, rows = 4, ...rest }) {
  return (
    <Field label={label} error={error} hint={hint}>
      <textarea rows={rows} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />
    </Field>
  );
}
export function SelectField({ label, value, onChange, options, error, hint, placeholder, ...rest }) {
  return (
    <Field label={label} error={error} hint={hint}>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
    </Field>
  );
}
export function Switch({ label, checked, onChange, hint }) {
  return (
    <label className="a-switch">
      <input type="checkbox" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} role="switch" />
      <span className="a-switch__track" aria-hidden="true"><i /></span>
      <span className="a-switch__text">{label}{hint && <small>{hint}</small>}</span>
    </label>
  );
}

/** Editable list of plain strings (features, points…). */
export function StringList({ label, value = [], onChange, placeholder = 'Add item', max = 30 }) {
  const items = value || [];
  const set = (i, v) => onChange(items.map((x, n) => (n === i ? v : x)));
  return (
    <fieldset className="a-list">
      <legend>{label}</legend>
      {items.map((it, i) => (
        <div className="a-list__row" key={i}>
          <input value={it} onChange={(e) => set(i, e.target.value)} placeholder={placeholder} aria-label={`${label} ${i + 1}`} />
          <button type="button" className="a-icon-btn" onClick={() => onChange(items.filter((_, n) => n !== i))} aria-label={`Remove ${label} ${i + 1}`}><Icon name="trash" size={16} /></button>
        </div>
      ))}
      {items.length < max && <Btn size="sm" variant="outline" icon="plus" onClick={() => onChange([...items, ''])}>Add</Btn>}
    </fieldset>
  );
}

export function Pager({ page, pages, total, setPage, loading }) {
  if (pages <= 1 && !total) return null;
  return (
    <nav className="a-pager" aria-label="Pagination">
      <span>{total} item{total === 1 ? '' : 's'}</span>
      <div>
        <Btn size="sm" variant="outline" icon="chevronLeft" disabled={page <= 1 || loading} onClick={() => setPage(page - 1)}>Prev</Btn>
        <span aria-live="polite">Page {page} of {pages}</span>
        <Btn size="sm" variant="outline" iconRight="chevronRight" disabled={page >= pages || loading} onClick={() => setPage(page + 1)}>Next</Btn>
      </div>
    </nav>
  );
}

export function SearchBox({ value, onChange, placeholder = 'Search…' }) {
  return (
    <label className="a-search">
      <Icon name="search" size={18} />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </label>
  );
}

export function Chips({ options, value, onChange, counts }) {
  return (
    <div className="a-chips" role="tablist">
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value;
        const l = typeof o === 'string' ? o : o.label;
        return (
          <button key={v} type="button" role="tab" aria-selected={value === v} className={`a-chip ${value === v ? 'is-active' : ''}`} onClick={() => onChange(v)}>
            {l}{counts && counts[v] !== undefined ? <em>{counts[v]}</em> : null}
          </button>
        );
      })}
    </div>
  );
}

export function Loading({ rows = 4 }) {
  return <div className="a-loading" role="status" aria-label="Loading">{Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton" style={{ height: 44 }} />)}</div>;
}

export function EmptyRow({ children }) {
  return <div className="a-empty">{children}</div>;
}

export function ErrorBox({ error, onRetry }) {
  if (!error) return null;
  return <div className="a-error" role="alert">{error.message}{onRetry && <Btn size="sm" variant="outline" onClick={onRetry}>Retry</Btn>}</div>;
}

export function useSaveState() {
  const [state, setState] = useState({ saving: false, error: '', errors: {} });
  const run = useCallback(async (fn) => {
    setState({ saving: true, error: '', errors: {} });
    try {
      const r = await fn();
      setState({ saving: false, error: '', errors: {} });
      return r;
    } catch (e) {
      setState({ saving: false, error: e.message, errors: e.errors || {} });
      return undefined;
    }
  }, []);
  return [state, run];
}

/** Sticky save bar for settings-style pages. */
export function SaveBar({ dirty, saving, onSave, onReset, error }) {
  return (
    <div className={`a-savebar ${dirty ? 'is-dirty' : ''}`} role="region" aria-label="Save changes">
      <span aria-live="polite">{error ? <b className="a-text-danger">{error}</b> : dirty ? 'You have unsaved changes' : 'All changes saved'}</span>
      <div>
        <Btn variant="ghost" size="sm" onClick={onReset} disabled={!dirty || saving}>Discard</Btn>
        <Btn size="sm" onClick={onSave} disabled={!dirty || saving}>{saving ? 'Saving…' : 'Save changes'}</Btn>
      </div>
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="a-tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.value} type="button" role="tab" aria-selected={value === t.value} className={`a-tab ${value === t.value ? 'is-active' : ''}`} onClick={() => onChange(t.value)}>{t.label}</button>
      ))}
    </div>
  );
}

/** Editable list of objects. `fields` use the same definitions as FormGrid (rendered by the caller via renderRow). */
export function ObjectList({ label, items = [], onChange, blank, renderRow, max = 30, addLabel = 'Add', itemTitle }) {
  const move = (i, d) => { const a = [...items]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; onChange(a); };
  const setItem = (i, patch) => onChange(items.map((x, n) => (n === i ? { ...x, ...patch } : x)));
  return (
    <fieldset className="a-objlist">
      {label && <legend>{label}</legend>}
      {items.map((it, i) => (
        <div className="a-objlist__item" key={i}>
          <div className="a-objlist__head">
            <strong>{itemTitle ? itemTitle(it, i) : `${label || 'Item'} ${i + 1}`}</strong>
            <span>
              <button type="button" className="a-icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"><Icon name="chevronDown" size={16} style={{ transform: 'rotate(180deg)' }} /></button>
              <button type="button" className="a-icon-btn" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down"><Icon name="chevronDown" size={16} /></button>
              <button type="button" className="a-icon-btn is-danger" onClick={() => onChange(items.filter((_, n) => n !== i))} aria-label="Remove"><Icon name="trash" size={16} /></button>
            </span>
          </div>
          <div className="a-objlist__body">{renderRow(it, (patch) => setItem(i, patch), i)}</div>
        </div>
      ))}
      {items.length < max && <Btn size="sm" variant="outline" icon="plus" onClick={() => onChange([...items, { ...blank }])}>{addLabel}</Btn>}
    </fieldset>
  );
}
