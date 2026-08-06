-- Merch orders — APPLIED to production 6 Aug 2026.
-- One row per order; items priced SERVER-SIDE in bakerypay-init (never trust
-- the client). Payment rows link back via payments.order_id so merch money
-- never counts toward dues (dues math skips payments with order_id).

create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id),
  items           jsonb not null,   -- [{sku, title, size, qty, unit_price}] pesewas
  total           integer not null check (total > 0),   -- pesewas
  status          text not null default 'pending'
                    check (status in ('pending', 'paid', 'failed', 'cancelled')),
  created_at      timestamptz not null default now()
);

alter table public.payments add column order_id uuid references public.orders(id);

alter table public.orders enable row level security;

create policy "member reads own orders" on public.orders
  for select to authenticated
  using (registration_id in (
    select r.id from public.registrations r
    where lower(r.email) = lower(auth.jwt() ->> 'email')
  ));

create policy "committee reads all orders" on public.orders
  for select to authenticated
  using (public.is_committee());

-- Public count-only stats (added same day): the homepage "N Akoras registered"
-- counter. View runs with owner rights, so anon sees the count and nothing else.
create or replace view public.public_stats as
  select count(*)::int as registrations from public.registrations;
grant select on public.public_stats to anon, authenticated;
