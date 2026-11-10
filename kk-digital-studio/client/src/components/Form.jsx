import { cloneElement, useId } from 'react';

/** Label + control + inline error with correct aria wiring. The child control receives id/aria props. */
export function Field({ label, error, hint, required, children, className = '' }) {
  const id = useId();
  const child = cloneElement(children, {
    id,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': error ? `${id}-err` : hint ? `${id}-hint` : undefined,
    required: undefined,
  });
  return (
    <div className={`field ${error ? 'has-error' : ''} ${className}`}>
      <label htmlFor={id}>{label}{required && <span className="req" aria-hidden="true"> *</span>}</label>
      {child}
      {hint && !error && <small id={`${id}-hint`} className="field__hint">{hint}</small>}
      {error && <small id={`${id}-err`} className="field__error" role="alert">{error}</small>}
    </div>
  );
}
