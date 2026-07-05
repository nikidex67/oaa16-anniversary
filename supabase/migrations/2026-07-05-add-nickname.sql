-- Adds the optional school-nickname column. Applied to production
-- 2026-07-05 via the Management API; kept for the record.

alter table public.registrations add column nickname text;
