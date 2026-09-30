import { dayKey } from './day';

// Works out, for each dose of ONE medicine, which dose of the day it was
// (1st, 2nd, ...) and, for an overridden dose, which override of that dose
// number it was that day.
//
//   events       this medicine's dose rows, any order
//   overriddenAt Map of dose id -> overridden_at, for overridden doses only
//
// Returns a Map of dose id -> { number, overrideNumber }. overrideNumber is
// null for a dose that still counts.
//
// Numbers use dayKey(), the same 6am day the card uses, so dose 2 in the
// record is the dose that made the card read 2 of N.
//
// A dose's number is 1 + the doses before it that same day which were still
// counting when it was taken. A dose overridden before this one was taken no
// longer counted, so the redo gets the same number as the dose it replaced:
//
//   8:00 am  1
//   2:00 pm  2  (overridden 1)
//   4:00 pm  2  (overridden 2)
//   9:00 pm  2
export function numberDoses(events, overriddenAt) {
  const byDay = {};
  for (const ev of events) {
    const key = dayKey(new Date(ev.taken_at));
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(ev);
  }

  const out = new Map();
  for (const doses of Object.values(byDay)) {
    doses.sort((a, b) => time(a.taken_at) - time(b.taken_at));
    const overridesSoFar = {}; // dose number -> overrides of it so far today

    doses.forEach((dose, i) => {
      const takenAt = time(dose.taken_at);
      let number = 1;
      for (let j = 0; j < i; j++) {
        const earlier = overriddenAt.get(doses[j].id);
        if (earlier === undefined || time(earlier) > takenAt) number += 1;
      }

      let overrideNumber = null;
      if (overriddenAt.has(dose.id)) {
        overridesSoFar[number] = (overridesSoFar[number] || 0) + 1;
        overrideNumber = overridesSoFar[number];
      }

      out.set(dose.id, { number, overrideNumber });
    });
  }
  return out;
}

// Supabase sends "+00:00" and the phone sends "Z", so never compare the
// strings themselves.
function time(iso) {
  return new Date(iso).getTime();
}
