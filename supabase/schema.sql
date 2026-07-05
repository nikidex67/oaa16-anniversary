-- OAA 16 registrations — run this once in the Supabase SQL Editor.

create table public.registrations (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  first_name    text not null,
  last_name     text not null,
  email         text not null,
  gender        text not null check (gender in ('Male', 'Female')),
  country_code  text not null,
  phone         text not null,
  is_whatsapp   boolean not null default false,
  wa_country_code text,
  wa_phone      text,
  in_group      text not null check (in_group in ('yes', 'no')),
  house         text not null,
  class_group   text not null,
  profession    text,
  company       text,
  industry      text,
  description   text check (char_length(description) <= 300)
);

-- One registration per email; a duplicate submit is treated as success in the app.
create unique index registrations_email_key on public.registrations (lower(email));

-- Anonymous visitors may insert only — never read, update, or delete.
alter table public.registrations enable row level security;

create policy "public can register"
  on public.registrations for insert
  to anon
  with check (true);
