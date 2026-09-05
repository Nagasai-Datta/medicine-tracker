import { useState } from 'react';
import EditMedicine from './EditMedicine';
import { LEDGER_DAYS, TEXT } from '../config';
import { calendarDayKey, formatDayLabel, formatTime, recentCalendarDays } from '../day';

export default function Ledger({ medicines, events, onRename, onSetActive, onDelete }) {
  const [selectedId, setSelectedId] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  const archived = medicines.filter((m) => m.active === false);
  const inUse = medicines.filter((m) => m.active !== false);
  const visible = showArchived ? archived : inUse;

  if (medicines.length === 0) return null;

  const selected = visible.find((m) => m.id === selectedId) || visible[0] || null;

  return (
    <div className="mt-ledger">
      <div className="mt-ledger-heading">{TEXT.ledgerHeading}</div>

      {archived.length > 0 && (
        <div className="mt-seg">
          <button
            type="button"
            className={showArchived ? 'mt-seg-btn' : 'mt-seg-btn mt-seg-on'}
            onClick={() => {
              setShowArchived(false);
              setSelectedId(null);
            }}
          >
            {TEXT.tabActive}
          </button>
          <button
            type="button"
            className={showArchived ? 'mt-seg-btn mt-seg-on' : 'mt-seg-btn'}
            onClick={() => {
              setShowArchived(true);
              setSelectedId(null);
            }}
          >
            {`${TEXT.tabArchived} (${archived.length})`}
          </button>
        </div>
      )}

      {selected === null ? (
        <div className="mt-empty">{showArchived ? TEXT.noArchived : TEXT.noActive}</div>
      ) : (
        <Detail
          key={selected.id}
          medicine={selected}
          all={visible}
          events={events}
          selectedId={selected.id}
          onSelect={setSelectedId}
          onRename={onRename}
          onSetActive={onSetActive}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}

function Detail({ medicine, all, events, selectedId, onSelect, onRename, onSetActive, onDelete }) {
  const total = medicine.doses_per_day || 1;
  const mine = events.filter((e) => e.medication_id === medicine.id);

  // Days run from the day this medicine was added up to today, capped at
  // LEDGER_DAYS. Nothing before it existed, so nothing before it is shown.
  const addedOn = calendarDayKey(new Date(medicine.created_at));
  const days = recentCalendarDays(LEDGER_DAYS).filter((k) => k >= addedOn);

  const byDay = {};
  for (const ev of mine) {
    const key = calendarDayKey(new Date(ev.taken_at));
    if (!byDay[key]) byDay[key] = [];
    byDay[key].unshift(ev);
  }

  return (
    <>
      <div className="mt-tabs">
        {all.map((m) => (
          <button
            key={m.id}
            type="button"
            className={m.id === selectedId ? 'mt-tab mt-tab-on' : 'mt-tab'}
            onClick={() => onSelect(m.id)}
          >
            {m.name}
          </button>
        ))}
      </div>

      <div className="mt-ledger-list">
        {days.map((key) => {
          const rows = byDay[key] || [];
          const short = rows.length > 0 && rows.length < total;
          return (
            <div className="mt-ledger-row" key={key}>
              <span className="mt-ledger-date">{formatDayLabel(key)}</span>
              {rows.length === 0 ? (
                <span className="mt-ledger-no">{TEXT.noEntry}</span>
              ) : (
                <span className={short ? 'mt-ledger-short' : 'mt-ledger-yes'}>
                  {rows.map((r) => formatTime(r.taken_at)).join(', ')}
                  {short ? ` (${rows.length} of ${total})` : ''}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <EditMedicine
        medicine={medicine}
        doseCount={mine.length}
        onRename={onRename}
        onSetActive={onSetActive}
        onDelete={onDelete}
      />
    </>
  );
}
