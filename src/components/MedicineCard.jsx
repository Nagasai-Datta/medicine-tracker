import { TEXT } from '../config';
import { formatStamp } from '../day';

export default function MedicineCard({ card, onTake }) {
  const { name, state, takenCount, total, remaining, lastTakenAt, lastTodayAt } = card;

  // Nothing taken yet: whole card red.
  if (state === 'none') {
    return (
      <div className="mt-card mt-card-nottaken">
        <div className="mt-card-name">{name}</div>
        <div className="mt-card-status">{TEXT.notTaken}</div>
        <div className="mt-card-stamp">
          {lastTakenAt ? `${TEXT.lastTakenPrefix} ${formatStamp(lastTakenAt)}` : TEXT.neverTaken}
        </div>
        <div className="mt-card-count">{TEXT.doseCount(0, total)}</div>
        <button type="button" className="mt-take-btn" onClick={() => onTake(card)}>
          {TEXT.takeButton}
        </button>
      </div>
    );
  }

  // Some taken, some left: green card body, red strip for what is still due.
  if (state === 'partial') {
    return (
      <div className="mt-card mt-card-taken">
        <div className="mt-card-name">{name}</div>
        <div className="mt-card-status mt-card-status-partial">
          {TEXT.doseCount(takenCount, total)}
        </div>
        <div className="mt-card-stamp">{formatStamp(lastTodayAt)}</div>
        <div className="mt-strip">
          <div className="mt-strip-text">
            {remaining === 1 ? TEXT.dosesLeftOne : TEXT.dosesLeftMany(remaining)}
          </div>
          <button type="button" className="mt-take-btn mt-take-btn-strip" onClick={() => onTake(card)}>
            {TEXT.takeNextButton}
          </button>
        </div>
      </div>
    );
  }

  // All doses done: whole card green, no button.
  return (
    <div className="mt-card mt-card-taken">
      <div className="mt-card-name">{name}</div>
      <div className="mt-card-status">{TEXT.taken}</div>
      <div className="mt-card-stamp">{formatStamp(lastTodayAt)}</div>
      <div className="mt-card-count">{TEXT.doseCount(takenCount, total)}</div>
    </div>
  );
}
