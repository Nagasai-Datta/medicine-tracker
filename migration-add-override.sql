-- Run this once in the Supabase SQL editor to turn on the Override button.
--
-- It adds one new table and nothing else. dose_events is not touched: it
-- keeps its select and insert policies only, so it stays append only.
--
-- An override is a note that says "do not count this dose on the card".
-- The dose itself stays in dose_events and in the record, marked overridden.
-- Overrides are append only too: no update or delete policy, so an override
-- cannot be rewritten or removed from the app either.
--
-- Until this has been run the app works exactly as before and simply does
-- not show the Override button.

create table dose_overrides (
  id             uuid primary key,
  user_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- unique: a dose can only be overridden once, so a double tap is harmless.
  -- on delete cascade: deleting a whole medicine still works, and takes its
  -- overrides with it exactly like it takes its doses.
  dose_event_id  uuid not null unique references dose_events(id) on delete cascade,
  overridden_at  timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

alter table dose_overrides enable row level security;

create policy overrides_select on dose_overrides for select using (auth.uid() = user_id);

-- You can only override your own doses.
create policy overrides_insert on dose_overrides for insert with check (
  auth.uid() = user_id
  and exists (
    select 1 from dose_events d where d.id = dose_event_id and d.user_id = auth.uid()
  )
);
