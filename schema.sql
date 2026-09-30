-- Paste this whole file into the Supabase SQL editor and press Run.

create table medications (
  id             uuid primary key,
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name           text not null,
  doses_per_day  smallint not null default 1 check (doses_per_day between 1 and 6),
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

create table dose_events (
  id             uuid primary key,
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  medication_id  uuid not null references medications(id) on delete cascade,
  taken_at       timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

create index dose_events_lookup on dose_events (medication_id, taken_at desc);

alter table medications enable row level security;
alter table dose_events enable row level security;

-- Medications can be read, added and edited by their owner.
create policy meds_select on medications for select using (auth.uid() = user_id);
create policy meds_insert on medications for insert with check (auth.uid() = user_id);
create policy meds_update on medications for update using (auth.uid() = user_id);

-- Deleting a medication cascades to its dose_events rows. Postgres runs
-- referential integrity as the system, so the cascade is not blocked by
-- dose_events having no delete policy. This is the only way anything can
-- ever remove a dose, and it always removes the whole medicine with it.
create policy meds_delete on medications for delete using (auth.uid() = user_id);

-- Dose events are append only. There is deliberately no update or delete
-- policy, so the record cannot be rewritten even by the account that owns it.
create policy events_select on dose_events for select using (auth.uid() = user_id);
create policy events_insert on dose_events for insert with check (auth.uid() = user_id);

-- Overrides. One row says "do not count this dose on the card". The dose
-- itself stays in dose_events and in the record, marked overridden. Append
-- only like dose_events: no update or delete policy. The cascade from
-- dose_events means deleting a whole medicine still takes everything with it.
create table dose_overrides (
  id             uuid primary key,
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  dose_event_id  uuid not null unique references dose_events(id) on delete cascade,
  overridden_at  timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

alter table dose_overrides enable row level security;

create policy overrides_select on dose_overrides for select using (auth.uid() = user_id);
create policy overrides_insert on dose_overrides for insert with check (
  auth.uid() = user_id
  and exists (
    select 1 from dose_events d where d.id = dose_event_id and d.user_id = auth.uid()
  )
);
