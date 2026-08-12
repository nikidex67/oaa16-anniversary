-- Chango payments whose payers have not registered yet. Committee sees them
-- on the admin page; a trigger auto-credits and removes a row when a matching
-- registration arrives (exact normalized-name match only; ambiguity stays put).

create table public.chango_unmatched (
  id          serial primary key,
  payer_name  text not null,
  description text,
  amount      integer not null check (amount > 0),   -- pesewas
  paid_at     timestamptz not null
);

alter table public.chango_unmatched enable row level security;
create policy "committee reads chango unmatched" on public.chango_unmatched
  for select to authenticated using (public.is_committee());

insert into public.chango_unmatched (payer_name, description, amount, paid_at) values
  ('Dzifa Hodey', 'Full contribution for 2024', 24000, '2025-01-01 19:52+00'),
  ('Kelvin Ampene', 'Contribution to group', 48000, '2025-12-27 13:04+00'),
  ('Alexis Hormeku', 'OAA 2016', 72000, '2026-07-12 09:08+00'),
  ('Abraham Brown -quaye', 'Contribution to group', 10000, '2026-08-04 19:33+00'),
  ('Rosemond Ocansey', 'yearly dues', 50000, '2026-08-08 13:11+00'),
  ('Samuel Adjetey', 'OAA 2016', 96000, '2026-08-10 01:38+00'),
  ('Davis Attah', 'Dues', 72000, '2026-08-10 21:09+00');

create or replace function public.norm_name_tokens(t text) returns text[]
language sql immutable as $$
  select array(select unnest(string_to_array(trim(regexp_replace(lower(coalesce(t,'')), '[^a-z ]', ' ', 'g')), ' '))
               except select '' order by 1)
$$;

create or replace function public.claim_chango_on_registration() returns trigger
language plpgsql security definer as $$
declare
  hit record;
  n int;
begin
  select count(*) into n
  from public.chango_unmatched c
  where public.norm_name_tokens(c.payer_name) = public.norm_name_tokens(new.first_name || ' ' || new.last_name);

  if n = 1 then
    select * into hit from public.chango_unmatched c
    where public.norm_name_tokens(c.payer_name) = public.norm_name_tokens(new.first_name || ' ' || new.last_name);
    insert into public.payments (registration_id, amount, provider, provider_ref, status, channel, recorded_by, paid_at, created_at)
    values (new.id, hit.amount, 'manual', 'CHANGO-AUTO-' || hit.id, 'success', 'chango',
            'Chango import · auto-claimed on registration · payer: ' || hit.payer_name || ' · ' || coalesce(hit.description, ''),
            hit.paid_at, hit.paid_at);
    delete from public.chango_unmatched where id = hit.id;
  end if;
  return new;
end $$;

create trigger claim_chango after insert on public.registrations
  for each row execute function public.claim_chango_on_registration();
