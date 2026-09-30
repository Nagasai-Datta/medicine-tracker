import { createClient } from '@supabase/supabase-js';
import { LEDGER_DAYS } from './config';

// crypto.randomUUID() only exists in a secure context: https or localhost.
// Testing on a phone over http://192.168.x.x is NOT secure, so it is undefined
// there. crypto.getRandomValues() works on plain http, so fall back to it.
function uuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const b = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(b);
  } else {
    for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  }
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0'));
  return (
    h.slice(0, 4).join('') + '-' +
    h.slice(4, 6).join('') + '-' +
    h.slice(6, 8).join('') + '-' +
    h.slice(8, 10).join('') + '-' +
    h.slice(10, 16).join('')
  );
}

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: window.localStorage,
    },
  }
);

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

// Retired medicines are fetched too. They lose their card but keep their
// record, so her history never disappears because you retired something.
export async function fetchMedications() {
  const { data, error } = await supabase
    .from('medications')
    .select('id, name, doses_per_day, active, created_at')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function renameMedication(id, name) {
  const { error } = await supabase
    .from('medications')
    .update({ name: name.trim() })
    .eq('id', id);
  if (error) throw error;
}

// Archiving. The dose rows are never touched.
export async function setMedicationActive(id, active) {
  const { error } = await supabase.from('medications').update({ active }).eq('id', id);
  if (error) throw error;
}

export async function fetchEvents() {
  const since = new Date();
  since.setDate(since.getDate() - (LEDGER_DAYS + 2));
  const { data, error } = await supabase
    .from('dose_events')
    .select('id, medication_id, taken_at')
    .gte('taken_at', since.toISOString())
    .order('taken_at', { ascending: false });
  if (error) throw error;
  return data;
}

// id is generated on the phone so a retry cannot create a second row.
export async function insertDose(medicationId) {
  const row = {
    id: uuid(),
    medication_id: medicationId,
    taken_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('dose_events').insert(row);
  if (error && error.code !== '23505') throw error;
  return row;
}

// Overrides live in their own table. dose_events is never touched.
//
// Returns null when the table does not exist yet (migration-add-override.sql
// not run). The app then behaves exactly as it did before overrides existed
// and hides the Override button. Any other error is thrown like every other
// fetch, so a network blip never makes an overridden dose count again.
//
// An override is always made after its dose, so the same window as
// fetchEvents catches every override of every dose that fetchEvents returns.
export async function fetchOverrides() {
  const since = new Date();
  since.setDate(since.getDate() - (LEDGER_DAYS + 2));
  const { data, error } = await supabase
    .from('dose_overrides')
    .select('id, dose_event_id, overridden_at')
    .gte('overridden_at', since.toISOString());
  if (error) {
    if (error.code === 'PGRST205' || error.code === '42P01') return null;
    throw error;
  }
  return data;
}

// ids are generated on the phone, and each dose can only be overridden once,
// so a retry or a double tap cannot create a second override.
// overridden_at uses the phone clock, same as taken_at, so the two compare
// cleanly when the record works out which dose of the day each one was.
export async function insertOverrides(doseEventIds) {
  const overriddenAt = new Date().toISOString();
  const rows = doseEventIds.map((doseEventId) => ({
    id: uuid(),
    dose_event_id: doseEventId,
    overridden_at: overriddenAt,
  }));
  const { error } = await supabase.from('dose_overrides').insert(rows);
  if (error && error.code !== '23505') throw error;
  return rows;
}

// Permanent. The foreign key cascade takes every dose_events row with it.
export async function deleteMedication(id) {
  const { error } = await supabase.from('medications').delete().eq('id', id);
  if (error) throw error;
}

export async function insertMedication(name, dosesPerDay) {
  const row = {
    id: uuid(),
    name: name.trim(),
    doses_per_day: dosesPerDay,
  };
  const { data, error } = await supabase
    .from('medications')
    .insert(row)
    .select('id, name, doses_per_day, active, created_at')
    .single();
  if (error) throw error;
  return data;
}
