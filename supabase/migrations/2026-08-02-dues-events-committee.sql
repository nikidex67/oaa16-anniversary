-- 1. Demo data out
delete from public.payments where provider_ref like 'BPMOCK-%';
delete from public.member_dues where schedule_id in (select id from public.dues_schedules where name ilike '%demo%' or name ilike '%TEST%');
delete from public.dues_schedules where name ilike '%demo%' or name ilike '%TEST%';

-- 2. Real dues: GH₵240/year, 2024–2026
insert into public.dues_schedules (name, note, amount, active) values
  ('2024 dues', 'Annual year-group dues', 24000, true),
  ('2025 dues', 'Annual year-group dues', 24000, true),
  ('2026 dues', 'Annual year-group dues · anniversary year', 24000, true);

-- Assign to every existing member
insert into public.member_dues (registration_id, schedule_id)
select r.id, s.id from public.registrations r cross join public.dues_schedules s
where s.active
on conflict (registration_id, schedule_id) do nothing;

-- Auto-assign to future registrations
create or replace function public.assign_dues_on_registration()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.member_dues (registration_id, schedule_id)
  select new.id, s.id from public.dues_schedules s where s.active
  on conflict do nothing;
  return new;
end; $$;
drop trigger if exists registrations_assign_dues on public.registrations;
create trigger registrations_assign_dues
  after insert on public.registrations
  for each row execute function public.assign_dues_on_registration();

-- 3. Events + RSVPs
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  venue text,
  starts_on date not null,
  time_label text,
  tag text,
  active boolean not null default true
);
create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id),
  registration_id uuid not null references public.registrations(id),
  status text not null check (status in ('going', 'not_going')),
  updated_at timestamptz not null default now(),
  unique (event_id, registration_id)
);
insert into public.events (slug, title, description, venue, starts_on, time_label, tag) values
  ('career-fair', 'Career & Mentorship Fair', 'Panels and mentorship circles with the year group''s doctors, engineers, founders, lawyers and creatives. Bring your questions — and your business cards.', 'Achimota School', '2026-08-14', 'Details soon', 'Career Fair'),
  ('bbq-tennis', 'OAA 2016 BBQ & Tennis Tournament', 'An afternoon of food, music and a tennis tournament nobody has trained for. Bring your appetite and your A-game.', 'Venue TBC', '2026-08-15', 'Details soon', 'BBQ & Tennis'),
  ('thanksgiving', '10 Year Anniversary Thanksgiving Service', 'A service of thanksgiving for ten years — followed by a group photo on the very steps from 2016. Families welcome.', 'Achimota School', '2026-08-16', 'Details soon', 'Thanksgiving')
on conflict (slug) do nothing;

alter table public.events enable row level security;
alter table public.rsvps enable row level security;
create policy "anyone reads events" on public.events for select using (true);
create policy "members read own rsvps" on public.rsvps for select to authenticated
  using (registration_id in (select id from public.registrations where lower(email) = lower(auth.jwt()->>'email')));
create policy "members insert own rsvps" on public.rsvps for insert to authenticated
  with check (registration_id in (select id from public.registrations where lower(email) = lower(auth.jwt()->>'email')));
create policy "members update own rsvps" on public.rsvps for update to authenticated
  using (registration_id in (select id from public.registrations where lower(email) = lower(auth.jwt()->>'email')));

-- Public aggregate counts only (view owner bypasses RLS; exposes no names)
create or replace view public.event_rsvp_counts as
select e.id as event_id, e.slug, count(r.id) filter (where r.status = 'going') as going
from public.events e left join public.rsvps r on r.event_id = e.id
group by e.id, e.slug;
grant select on public.event_rsvp_counts to anon, authenticated;

-- 4. Committee role
create table if not exists public.committee_members (
  email text primary key,
  added_at timestamptz not null default now()
);
alter table public.committee_members enable row level security;
create policy "committee sees committee" on public.committee_members for select to authenticated
  using (lower(email) = lower(auth.jwt()->>'email'));
insert into public.committee_members (email) values ('nikidex67@gmail.com') on conflict do nothing;

create or replace function public.is_committee()
returns boolean language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.committee_members where lower(email) = lower(auth.jwt()->>'email')) $$;

create policy "committee reads all registrations" on public.registrations for select to authenticated using (public.is_committee());
create policy "committee reads all dues" on public.member_dues for select to authenticated using (public.is_committee());
create policy "committee reads all payments" on public.payments for select to authenticated using (public.is_committee());
create policy "committee reads all rsvps" on public.rsvps for select to authenticated using (public.is_committee());
create policy "committee records manual payments" on public.payments for insert to authenticated
  with check (public.is_committee() and provider = 'manual');

select 'migration ok' as status,
  (select count(*) from public.dues_schedules where active) as schedules,
  (select count(*) from public.member_dues) as assignments,
  (select count(*) from public.events) as events;
