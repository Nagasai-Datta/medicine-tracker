import { useEffect, useState } from 'react';
import { TEXT } from '../config';

export default function ConfirmDialog({ card, onConfirm, onCancel }) {
  const [busy, setBusy] = useState(false);

  // Nothing behind the dialog scrolls while it is open.
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  async function handleDone() {
    if (busy) return; // second tap on a laggy phone hits this and stops
    setBusy(true);
    try {
      await onConfirm(card);
    } catch (e) {
      setBusy(false);
    }
  }

  return (
    <div className="mt-overlay" role="dialog" aria-modal="true">
      <div className="mt-dialog">
        <div className="mt-dialog-name">{card.name}</div>
        <div className="mt-dialog-heading">{TEXT.confirmHeading}</div>
        <div className="mt-dialog-warning">{TEXT.confirmWarning}</div>
        <button type="button" className="mt-done-btn" onClick={handleDone} disabled={busy}>
          {busy ? TEXT.saving : TEXT.confirmDone}
        </button>
        <button type="button" className="mt-back-btn" onClick={onCancel} disabled={busy}>
          {TEXT.confirmBack}
        </button>
      </div>
    </div>
  );
}
