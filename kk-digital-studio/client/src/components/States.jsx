import { Btn } from './Buttons.jsx';

export function Spinner({ label = 'Loading' }) {
  return (
    <div className="spinner" role="status" aria-label={label}>
      <span />
    </div>
  );
}

export function Skeleton({ h = 200, w = '100%', r = 6, className = '' }) {
  return <div className={`skeleton ${className}`} style={{ height: h, width: w, borderRadius: r }} aria-hidden="true" />;
}

export function EmptyState({ title, text, action }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="empty empty--error" role="alert">
      <h3>We couldn’t load this</h3>
      <p>{error?.message || 'Something went wrong. Please try again.'}</p>
      {onRetry && <Btn variant="primary" onClick={onRetry}>Try again</Btn>}
    </div>
  );
}

export function Stars({ value = 5, size = 16 }) {
  return (
    <span className="stars" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" className={i <= value ? 'is-on' : ''} aria-hidden="true">
          <path d="M12 3.500l2.600 5.300 5.800.8-4.200 4.100 1 5.800L12 16.700l-5.200 2.800 1-5.800L3.600 9.600l5.800-.8z" />
        </svg>
      ))}
    </span>
  );
}
