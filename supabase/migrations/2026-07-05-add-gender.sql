-- Adds the gender column to an existing registrations table.
-- Run once in the Supabase SQL Editor (only needed if the table was
-- created before gender was part of schema.sql).

alter table public.registrations
  add column gender text check (gender in ('Male', 'Female'));
