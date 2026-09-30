import { useCallback, useEffect, useState } from 'react';
import { dayKey } from './day';
import {
  fetchEvents,
  fetchMedications,
  fetchOverrides,
  insertDose,
  insertOverrides,
  insertMedication,
  renameMedication,
  setMedicationActive,
  deleteMedication,
} from './db';

export function useLedger() {
  const [medicines, setMedicines] = useState([]);
  const [events, setEvents] = useState([]);
  // null means the dose_overrides table does not exist yet: no overrides,
  // no Override button, everything else exactly as before.
  const [overrides, setOverrides] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Bumping this on resume forces every dayKey() comparison to run again.
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    try {
      const [meds, evs, ovs] = await Promise.all([
        fetchMedications(),
        fetchEvents(),
        fetchOverrides(),
      ]);
      setMedicines(meds);
      setEvents(evs);
      setOverrides(ovs);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // iOS suspends the page instead of reloading it. Without this the card
  // stays green from yesterday when she reopens the app.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') {
        setTick((t) => t + 1);
        load();
      }
    }
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [load]);

  async function recordDose(medicationId) {
    const row = await insertDose(medicationId);
    setEvents((prev) => [row, ...prev]);
  }

  // Adds override rows only. The doses stay in dose_events and in the record.
  // The reload afterwards makes sure the card matches what the database now
  // holds, even if another phone overrode one of these doses first.
  async function overrideDoses(doseEventIds) {
    const rows = await insertOverrides(doseEventIds);
    setOverrides((prev) => [...(prev || []), ...rows]);
    load();
  }

  async function addMedicine(name, dosesPerDay) {
    const med = await insertMedication(name, dosesPerDay);
    setMedicines((prev) => [...prev, med]);
  }

  async function renameMedicine(id, name) {
    await renameMedication(id, name);
    setMedicines((prev) =>
      prev.map((m) => (m.id === id ? { ...m, name: name.trim() } : m))
    );
  }

  async function setActive(id, active) {
    await setMedicationActive(id, active);
    setMedicines((prev) => prev.map((m) => (m.id === id ? { ...m, active } : m)));
  }

  async function removeMedicine(id) {
    await deleteMedication(id);
    setMedicines((prev) => prev.filter((m) => m.id !== id));
    setEvents((prev) => prev.filter((e) => e.medication_id !== id));
  }

  // dose id -> when it was overridden. An overridden dose stays in the record
  // but no longer counts on the card.
  const overriddenAt = new Map();
  for (const o of overrides || []) {
    if (!overriddenAt.has(o.dose_event_id)) overriddenAt.set(o.dose_event_id, o.overridden_at);
  }

  // Card state is derived here, never stored. The events are the only fact,
  // minus the ones that have been overridden.
  const today = dayKey();
  const cards = medicines.filter((m) => m.active !== false).map((med) => {
    const mine = events.filter((e) => e.medication_id === med.id && !overriddenAt.has(e.id));
    const todays = mine.filter((e) => dayKey(new Date(e.taken_at)) === today);
    const total = med.doses_per_day || 1;
    const takenCount = Math.min(todays.length, total);
    return {
      ...med,
      total,
      takenCount,
      remaining: Math.max(total - todays.length, 0),
      // 'none' | 'partial' | 'complete'
      state: todays.length === 0 ? 'none' : todays.length >= total ? 'complete' : 'partial',
      lastTakenAt: mine.length ? mine[0].taken_at : null,
      lastTodayAt: todays.length ? todays[0].taken_at : null,
      // Newest first, so overriding the last k is todayDoseIds.slice(0, k).
      todayDoseIds: todays.map((e) => e.id),
      canOverride: overrides !== null,
    };
  });

  return {
    cards,
    medicines,
    events,
    overriddenAt,
    loading,
    error,
    recordDose,
    overrideDoses,
    addMedicine,
    renameMedicine,
    setActive,
    removeMedicine,
    reload: load,
  };
}
