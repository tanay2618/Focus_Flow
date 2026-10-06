import { useEffect, useId, useRef } from 'react';

/** Modal confirmation built on the native <dialog>: focus trap, Esc to close and backdrop come for free. */
export default function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', busy = false, onConfirm, onCancel }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog || dialog.open) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }, [open]);

  if (!open) return null;
  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      onCancel={(e) => { e.preventDefault(); if (!busy) onCancel(); }}
      onClick={(e) => { if (e.target === ref.current && !busy) onCancel(); }}
    >
      <h2 id={titleId}>{title}</h2>
      <p className="muted">{message}</p>
      <div className="dialog__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={busy} autoFocus>Cancel</button>
        <button type="button" className="btn btn--danger" onClick={onConfirm} disabled={busy}>
          {busy ? 'Deleting…' : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
