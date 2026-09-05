import { useCallback, useEffect, useState } from 'react';
import { dayKey } from './day';
import {
  fetchEvents,
  fetchMedications,
  insertDose,
  insertMedication,
  renameMedication,
  setMedicationActive,
  deleteMedication,
} from './db';

export function useLedger() {
  const [medicines, setMedicines] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Bumping this on resume forces every dayKey() comparison to run again.
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    try {
      const [meds, evs] = await Promise.all([fetchMedications(), fetchEvents()]);
      setMedicines(meds);
      setEvents(evs);
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

  // Card state is derived here, never stored. The events are the only fact.
  const today = dayKey();
  const cards = medicines.filter((m) => m.active !== false).map((med) => {
    const mine = events.filter((e) => e.medication_id === med.id);
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
    };
  });

  return {
    cards,
    medicines,
    events,
    loading,
    error,
    recordDose,
    addMedicine,
    renameMedicine,
    setActive,
    removeMedicine,
    reload: load,
  };
}
