import { Link } from 'react-router-dom';

export function Spinner({ label = 'Loading' }) {
  return (
    <span className="spinner" role="status">
      <span className="spinner__ring" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function PageLoader({ label = 'Loading' }) {
  return (
    <div className="page-loader">
      <Spinner label={label} />
      <p className="muted">{label}</p>
    </div>
  );
}

export function ListSkeleton({ rows = 4 }) {
  return (
    <ul className="task-list" aria-busy="true" aria-label="Loading tasks">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="task task--skeleton" aria-hidden="true">
          <div className="skeleton skeleton--line" style={{ width: `${55 + ((i * 13) % 30)}%` }} />
          <div className="skeleton skeleton--line skeleton--short" />
        </li>
      ))}
    </ul>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="empty">
      <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true" focusable="false">
        <circle cx="28" cy="28" r="26" fill="var(--primary-soft)" />
        <rect x="16" y="17" width="24" height="24" rx="5" fill="#fff" stroke="var(--primary)" strokeWidth="2" />
        <path d="M16 24h24" stroke="var(--primary)" strokeWidth="2" />
        <path d="M22 32l3.5 3.5L33 28" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <h3>{title}</h3>
      {description && <p className="muted">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="empty empty--error" role="alert">
      <h3>We couldn't load this</h3>
      <p className="muted">{message}</p>
      {onRetry && <button type="button" className="btn btn--primary" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export const LinkButton = ({ to, children, variant = 'primary' }) => (
  <Link to={to} className={`btn btn--${variant}`}>{children}</Link>
);
