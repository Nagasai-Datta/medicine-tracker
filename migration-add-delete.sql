-- Run this once in the Supabase SQL editor if you already created your
-- tables with the earlier version of schema.sql.
--
-- It adds the one policy the delete button needs. Nothing else changes.
-- Archiving needed no schema change; it was always just an update.

create policy meds_delete on medications for delete using (auth.uid() = user_id);
