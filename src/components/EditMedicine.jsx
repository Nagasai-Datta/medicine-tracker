import { useState } from 'react';
import { TEXT } from '../config';

// Rename, archive and delete live here, under the record tabs rather than on
// the big cards, so there is no way for her to hit them by accident on the
// screen she uses every day.
export default function EditMedicine({ medicine, doseCount, onRename, onSetActive, onDelete }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(medicine.name);
  const [asking, setAsking] = useState(null); // null | 'archive' | 'delete'
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const archived = medicine.active === false;

  async function run(fn) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      setErr('');
      setAsking(null);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="mt-link-btn" onClick={() => setOpen(true)}>
        {TEXT.edit}
      </button>
    );
  }

  return (
    <div className="mt-edit-box">
      <div className="mt-field-label">{TEXT.renameLabel}</div>
      <input
        className="mt-input"
        value={name}
        autoComplete="off"
        onChange={(e) => {
          setName(e.target.value);
          setErr('');
        }}
      />
      <button
        type="button"
        className="mt-primary-btn"
        disabled={busy || !name.trim() || name.trim() === medicine.name}
        onClick={() => run(() => onRename(medicine.id, name))}
      >
        {busy ? TEXT.saving : TEXT.renameSave}
      </button>

      {err && <div className="mt-error mt-edit-error">{err}</div>}

      <div className="mt-edit-divider" />

      {asking === 'archive' ? (
        <div>
          <div className="mt-edit-warning">{TEXT.archiveConfirm}</div>
          <div className="mt-add-actions">
            <button type="button" className="mt-secondary-btn" onClick={() => setAsking(null)}>
              {TEXT.cancel}
            </button>
            <button
              type="button"
              className="mt-primary-btn"
              disabled={busy}
              onClick={() => run(() => onSetActive(medicine.id, false))}
            >
              {TEXT.archiveYes}
            </button>
          </div>
        </div>
      ) : asking === 'delete' ? (
        <div>
          <div className="mt-edit-warning">
            {TEXT.deleteConfirm(medicine.name, doseCount)}
          </div>
          <div className="mt-add-actions">
            <button type="button" className="mt-secondary-btn" onClick={() => setAsking(null)}>
              {TEXT.cancel}
            </button>
            <button
              type="button"
              className="mt-danger-btn"
              disabled={busy}
              onClick={() => run(() => onDelete(medicine.id))}
            >
              {busy ? TEXT.saving : TEXT.deleteYes}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <button
            type="button"
            className="mt-secondary-btn"
            disabled={busy}
            onClick={() =>
              archived ? run(() => onSetActive(medicine.id, true)) : setAsking('archive')
            }
          >
            {archived ? TEXT.unarchive : TEXT.archive}
          </button>
          <button
            type="button"
            className="mt-danger-btn mt-delete-btn"
            onClick={() => setAsking('delete')}
          >
            {TEXT.deleteBtn}
          </button>
        </div>
      )}

      <button type="button" className="mt-link-btn" onClick={() => setOpen(false)}>
        {TEXT.editClose}
      </button>
    </div>
  );
}
