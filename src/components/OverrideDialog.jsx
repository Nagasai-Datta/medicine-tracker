import { useEffect, useState } from 'react';
import { TEXT } from '../config';

// Opened from the Override button on a green card. Each choice un-counts the
// most recent doses of today on the card. Nothing is deleted: the doses stay
// in the record, marked overridden.
export default function OverrideDialog({ card, onConfirm, onCancel }) {
  const [saving, setSaving] = useState(null); // the count being saved, or null
  const [err, setErr] = useState('');

  // Nothing behind the dialog scrolls while it is open.
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const ids = card.todayDoseIds; // newest first
  const n = ids.length;

  // 1 dose: one button. More: last 1, last 2, ..., then all.
  const choices =
    n <= 1
      ? [{ label: TEXT.overrideOnly, count: n }]
      : [
          ...Array.from({ length: n - 1 }, (_, i) => ({
            label: TEXT.overrideLast(i + 1),
            count: i + 1,
          })),
          { label: TEXT.overrideAll(n), count: n },
        ];

  async function choose(count) {
    if (saving !== null) return; // second tap on a laggy phone hits this and stops
    setSaving(count);
    try {
      await onConfirm(ids.slice(0, count));
    } catch (e) {
      setErr(e.message);
      setSaving(null);
    }
  }

  return (
    <div className="mt-overlay" role="dialog" aria-modal="true">
      <div className="mt-dialog mt-dialog-scroll">
        <div className="mt-dialog-name">{card.name}</div>
        <div className="mt-dialog-heading">{TEXT.overrideHeading}</div>
        <div className="mt-dialog-warning">{TEXT.overrideWarning}</div>
        {err && <div className="mt-error">{err}</div>}
        {choices.map((c) => (
          <button
            key={c.count}
            type="button"
            className="mt-override-opt"
            onClick={() => choose(c.count)}
            disabled={saving !== null}
          >
            {saving === c.count ? TEXT.saving : c.label}
          </button>
        ))}
        <button type="button" className="mt-back-btn" onClick={onCancel} disabled={saving !== null}>
          {TEXT.confirmBack}
        </button>
      </div>
    </div>
  );
}
