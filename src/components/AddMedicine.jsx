import { useState } from 'react';
import { DOSE_OPTIONS, TEXT } from '../config';

export default function AddMedicine({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [doses, setDoses] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    if (busy) return;
    if (!name.trim()) {
      setErr('Enter a name first');
      return;
    }
    setBusy(true);
    try {
      await onAdd(name, doses);
      setName('');
      setDoses(1);
      setErr('');
      setOpen(false);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="mt-secondary-btn" onClick={() => setOpen(true)}>
        {TEXT.addMedicine}
      </button>
    );
  }

  return (
    <div className="mt-add-box">
      <input
        className="mt-input"
        value={name}
        placeholder={TEXT.addPlaceholder}
        autoComplete="off"
        onChange={(e) => {
          setName(e.target.value);
          setErr('');
        }}
      />

      <div className="mt-field-label">{TEXT.addDosesLabel}</div>
      <div className="mt-dose-picker">
        {DOSE_OPTIONS.map((n) => (
          <button
            key={n}
            type="button"
            className={n === doses ? 'mt-dose-opt mt-dose-opt-on' : 'mt-dose-opt'}
            onClick={() => setDoses(n)}
          >
            {n}
          </button>
        ))}
      </div>

      {err && <div className="mt-error">{err}</div>}
      <div className="mt-add-actions">
        <button type="button" className="mt-secondary-btn" onClick={() => setOpen(false)}>
          {TEXT.addCancel}
        </button>
        <button type="button" className="mt-primary-btn" onClick={save} disabled={busy}>
          {busy ? TEXT.saving : TEXT.addSave}
        </button>
      </div>
    </div>
  );
}
