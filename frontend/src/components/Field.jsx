import { useState } from 'react';

/** Label + control + hint/error wired together for screen readers. `as` picks input | select | textarea. */
export function Field({ id, label, error, hint, as: Tag = 'input', children, ...props }) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <Tag id={id} name={id} aria-invalid={error ? 'true' : undefined} aria-describedby={describedBy} {...props}>
        {children}
      </Tag>
      {error ? <p id={`${id}-error`} className="field__error">{error}</p>
        : hint ? <p id={`${id}-hint`} className="field__hint">{hint}</p> : null}
    </div>
  );
}

export function PasswordField({ id, label, error, hint, ...props }) {
  const [visible, setVisible] = useState(false);
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <div className="field__password">
        <input id={id} name={id} type={visible ? 'text' : 'password'} aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy} {...props} />
        <button type="button" className="field__toggle" onClick={() => setVisible((v) => !v)} aria-pressed={visible}
          aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}>
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      {error ? <p id={`${id}-error`} className="field__error">{error}</p>
        : hint ? <p id={`${id}-hint`} className="field__hint">{hint}</p> : null}
    </div>
  );
}
