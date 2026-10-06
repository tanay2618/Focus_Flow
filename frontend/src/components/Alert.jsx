const ICONS = {
  error: 'M12 8v5m0 3.5h.01M10.3 4.2L2.8 17.5A2 2 0 004.5 20.5h15a2 2 0 001.7-3L13.7 4.2a2 2 0 00-3.4 0z',
  warning: 'M12 8v5m0 3.5h.01M10.3 4.2L2.8 17.5A2 2 0 004.5 20.5h15a2 2 0 001.7-3L13.7 4.2a2 2 0 00-3.4 0z',
  success: 'M5 12.5l4.5 4.5L19 7.5',
  info: 'M12 11v5m0-8.5h.01M12 21a9 9 0 100-18 9 9 0 000 18z',
};

/** type: error | warning | success | info. Errors use role="alert", the rest role="status". */
export default function Alert({ type = 'info', title, children, actions }) {
  return (
    <div className={`alert alert--${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <svg className="alert__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={ICONS[type]} />
      </svg>
      <div className="alert__body">
        {title && <strong className="alert__title">{title}</strong>}
        <span>{children}</span>
      </div>
      {actions && <div className="alert__actions">{actions}</div>}
    </div>
  );
}
