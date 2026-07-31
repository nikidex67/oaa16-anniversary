-- OAA 16 payments schema — DRAFT, not yet applied to production.
-- See PAYMENTS.md for the design rationale. Amounts are integers in pesewas.

create table public.dues_schedules (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,                 -- 'Registration levy'
  note        text,                          -- 'One-time · 2026 membership'
  amount      integer not null check (amount > 0),   -- pesewas
  currency    text not null default 'GHS',
  due_date    date,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.member_dues (
  id              uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id),
  schedule_id     uuid not null references public.dues_schedules(id),
  amount_override integer check (amount_override >= 0),  -- waivers/tiers; null = schedule amount
  created_at      timestamptz not null default now(),
  unique (registration_id, schedule_id)
);

create table public.payments (
  id              uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id),
  schedule_id     uuid references public.dues_schedules(id),  -- null = unallocated/general
  amount          integer not null check (amount > 0),        -- pesewas
  currency        text not null default 'GHS',
  provider        text not null check (provider in ('paystack', 'manual')),
  provider_ref    text not null,          -- our DUES-XXXX-NNN reference
  status          text not null default 'pending'
                    check (status in ('pending', 'success', 'failed', 'refunded')),
  channel         text,                   -- 'mobile_money' | 'card' | 'cash' …
  raw_payload     jsonb,                  -- full webhook body, audit trail
  recorded_by     text,                   -- for manual rows: who took the cash
  paid_at         timestamptz,
  created_at      timestamptz not null default now(),
  unique (provider, provider_ref)         -- idempotency: webhook replays are no-ops
);

create view public.member_dues_status as
select
  md.registration_id,
  md.schedule_id,
  coalesce(md.amount_override, ds.amount)                    as amount_due,
  coalesce(p.paid, 0)                                        as amount_paid,
  greatest(coalesce(md.amount_override, ds.amount)
           - coalesce(p.paid, 0), 0)                         as balance
from public.member_dues md
join public.dues_schedules ds on ds.id = md.schedule_id
left join lateral (
  select sum(amount) as paid
  from public.payments p
  where p.registration_id = md.registration_id
    and p.schedule_id = md.schedule_id
    and p.status = 'success'
) p on true;

-- RLS: locked down until member auth ships. Service role (edge functions)
-- bypasses RLS; there are deliberately NO anon policies on these tables.
alter table public.dues_schedules enable row level security;
alter table public.member_dues    enable row level security;
alter table public.payments       enable row level security;

-- When auth lands, members read their own rows via a policy matching
-- auth.jwt() email -> registrations.email. Committee role sees all.
