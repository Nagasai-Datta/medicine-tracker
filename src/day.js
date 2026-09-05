import { DAY_START_HOUR, TIME_ZONE, LOCALE } from './config';

// Breaks a Date into calendar parts as seen in TIME_ZONE.
function zonedParts(date) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  });
  const out = {};
  for (const p of fmt.formatToParts(date)) out[p.type] = p.value;
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: Number(out.hour),
  };
}

function pad(n) {
  return String(n).padStart(2, '0');
}

// ---------------------------------------------------------------------------
// TWO different notions of "day". They are deliberately separate.
//
//   dayKey()          drives CARD COLOUR only. Rolls over at DAY_START_HOUR.
//   calendarDayKey()  drives the LEDGER only. Rolls over at real midnight.
//
// A dose at 5:55am counts towards yesterday's colour but is filed in the
// ledger under the real date it happened. Never use one where the other
// belongs.
// ---------------------------------------------------------------------------

export function dayKey(date = new Date()) {
  const p = zonedParts(date);
  let y = p.year;
  let m = p.month;
  let d = p.day;
  if (p.hour < DAY_START_HOUR) {
    const shifted = new Date(Date.UTC(y, m - 1, d));
    shifted.setUTCDate(shifted.getUTCDate() - 1);
    y = shifted.getUTCFullYear();
    m = shifted.getUTCMonth() + 1;
    d = shifted.getUTCDate();
  }
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function calendarDayKey(date = new Date()) {
  const p = zonedParts(date);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

// The last `count` real calendar days, newest first. Ledger only.
export function recentCalendarDays(count) {
  const keys = [];
  const [y, m, d] = calendarDayKey().split('-').map(Number);
  const cursor = new Date(Date.UTC(y, m - 1, d));
  for (let i = 0; i < count; i++) {
    keys.push(
      `${cursor.getUTCFullYear()}-${pad(cursor.getUTCMonth() + 1)}-${pad(cursor.getUTCDate())}`
    );
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return keys;
}

// "9:14 am"
export function formatTime(iso) {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
    .format(new Date(iso))
    .toLowerCase();
}

// "5 Sep, 9:14 am" - always absolute, never the word "today".
export function formatStamp(iso) {
  if (!iso) return '';
  const day = new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'short',
  }).format(new Date(iso));
  return `${day}, ${formatTime(iso)}`;
}

// "Fri 5 Sep" for ledger day headings.
export function formatDayLabel(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
