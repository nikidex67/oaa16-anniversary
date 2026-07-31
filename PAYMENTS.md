# OAA 16 — Payments integration design

This document is the agreed architecture for dues (and later merch) payments.
Please read it before writing code — the schema and invariants below were
designed deliberately. Questions → Robbie / the info@ inbox.

## Provider

**To be confirmed — NOT Paystack.** The provider decision is being finalised
(PayUp is under discussion). Do not build against any provider until it's
settled and its API docs are shared. Everything below is provider-agnostic
and stands regardless; the provider supplies only two touchpoints:

1. **Checkout hand-off** — always the provider's own hosted page/popup. We
   never render card/MoMo fields ourselves.
2. **Server-side confirmation** — a signed webhook and/or a verify API. The
   `paystack-webhook` function in `supabase/functions/` is a *reference
   skeleton* showing the shape (signature check → idempotent ledger update);
   adapt the signature scheme to the chosen provider.

If the chosen provider lacks webhooks or a sandbox, raise it before building
— that changes the reconciliation design (see Flow, step 4).

## Invariants (non-negotiable)

1. **Money is integers in pesewas.** Never floats, never strings with `₵`.
2. **The payments table is append-only.** No UPDATE/DELETE of financial rows;
   corrections are new rows (e.g. a refund row). Status transitions
   (`pending → success/failed`) are the one exception.
3. **Idempotency by `(provider, provider_ref)`** — unique constraint. Webhooks
   retry; a replay must be a no-op, enforced by the database, not by code.
4. **Amount owed is always computed** (view), never stored on the member.
5. **Never trust the client.** The amount recorded comes from the provider's
   webhook/verify API, not from anything the browser sends.
6. **Secrets live in Supabase Edge Function secrets** (like the existing
   `SMTP_PASSWORD`). Nothing secret ever enters this public repo. A provider's
   *public/publishable* key may ship in frontend code; secret keys may not.

## Schema

See `supabase/migrations/2026-07-21-payments-schema.draft.sql` (DRAFT — not
yet applied to production; coordinate with Robbie before applying).

- `dues_schedules` — one row per obligation (registration levy, anniversary
  levy, dinner…). Amounts in pesewas.
- `member_dues` — assigns a schedule to a registration, optional per-member
  override (waivers/tiers).
- `payments` — the ledger. `provider` is `'<provider>' | 'manual'`;
  `manual` rows record cash/direct-MoMo taken by the treasurer.
- `member_dues_status` — view computing paid/owed per member.

`registrations` is the member table this all hangs off (see existing schema).

## Reference format

`DUES-<short-member-id>-<seq>` (e.g. `DUES-K7M2-003`), generated server-side
when creating a pending payment, passed to the provider as the transaction
reference. Human-readable on bank statements → reconciliation stays sane.

## Flow

1. Member (authenticated — auth is being built; until then, test harness)
   requests to pay N pesewas toward a schedule.
2. Server (edge function) creates a `pending` payment row + reference, calls the
   provider's initialize/create-charge API, returns the checkout URL.
3. Member completes checkout on the provider's UI.
4. The provider calls our webhook → verify signature → verify amount and
   status via the API → mark the payment row `success` (idempotent upsert).
5. Receipt email via the existing SMTP pattern (see
   `supabase/functions/send-welcome/` for the working example).
6. Dashboard reads the balance view; progress bar updates.

## What NOT to do

- No service-role keys or secret keys in frontend code or the repo.
- No recording success from the browser's callback alone — webhook or
  server-side verify only.
- No schema changes to `registrations` without coordinating (it has live
  triggers: Mailchimp sync + welcome email on INSERT).
- The production database currently has **425+ real members** — build against
  a dev/test project or coordinate before touching prod.

## Division of labour

- Schema + RLS + this design: Robbie (with Claude) — ask before diverging.
- Provider checkout wiring + webhook implementation: you.
- The visual design for the payment UI is in `prototype/dashboard.html`
  (the payment modal is a mock styled after a generic processor — replace
  with the real provider's checkout, keep the surrounding dues UI).
