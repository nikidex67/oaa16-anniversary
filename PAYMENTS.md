# OAA 16 — Payments integration design

This document is the agreed architecture for dues (and later merch) payments.
Please read it before writing code — the schema and invariants below were
designed deliberately. Questions → Robbie / the info@ inbox.

## Provider

**Bakery Pay** (The Bakery Technologies — pay.thebakery.tech). API guide is
with Robbie (not in this public repo). Key facts from the docs, and how they
change the generic design:

1. **No webhooks.** Confirmation is not pushed to us. MoMo collections
   confirm "in the background" on their side; we must **poll**
   `GET /api/collections/{id}` until status resolves. The webhook skeleton in
   `supabase/functions/paystack-webhook/` is superseded by a **reconciler**:
   a scheduled edge function that polls all `pending` payments and applies
   the same idempotent ledger update. Same invariants, different trigger.
2. **No hosted checkout page.** A MoMo collection pushes an approval prompt
   straight to the payer's phone. So OUR dues UI collects phone + network
   (mtn / vodafone / airteltigo) and our server calls
   `POST /api/collections/alpha/initialize`. No card fields ever; the PIN is
   entered on the payer's phone. This is a fine UX — arguably better.
3. **Their reference, not ours.** Initialize returns a `BP-XXXXXX` reference;
   we cannot supply our own. Keep our internal `DUES-…` ref for display, but
   idempotency is `(provider='bakerypay', provider_ref='BP-…')`.
4. **Amounts are GHS decimals in their API** (e.g. `100`, `"2.50"`). Our
   ledger stays integer pesewas; convert only at the API boundary.
5. **Fees — CONFIRMED terms**: MoMo is **2.5% all-in**, paid by the member on
   top (shown transparently in the pay modal). Bank transfer deducts 0.5%
   from what's sent; the member's dues are credited with the GROSS amount and
   the foundation absorbs that fee.
6. **Auth is email-OTP → bearer token** (no API keys documented). A server
   integration needs a long-lived token stored in Supabase secrets, obtained
   semi-manually. Token lifetime is undocumented — blocking question below.
7. **Funds custody**: collections land in a Bakery Pay wallet; we withdraw
   to the foundation's bank/MoMo via their disbursement API.

**Open questions for the Bakery Pay team (blocking go-live, not build):**
- Access-token lifetime, and whether machine/API-key auth exists for servers.
- Sandbox / test environment? (None documented.)
- Full set of collection status values and the failure/timeout behaviour
  when a payer ignores or declines the MoMo prompt.
- Polling rate limits.
- Disbursement fees, and settlement timing to a bank account.
- Bank of Ghana licensing (theirs or their aggregator's).

## Build status (2 Aug 2026)

- Schema **applied to production** (tables locked by RLS, no anon access).
- `bakerypay-init` + `bakerypay-reconcile` edge functions **deployed**, running
  in **mock mode** (`BAKERYPAY_MOCK=true`) until real credentials exist.
- Reconciler scheduled via pg_cron every 5 minutes.
- End-to-end verified in mock mode: init → pending row → reconcile → success
  → receipt email → balance view math correct; replays are no-ops.
- To go live: set `BAKERYPAY_TOKEN`, flip `BAKERYPAY_MOCK=false`, and resolve
  the open questions above (esp. token lifetime + the `{id}` vs reference
  assumption in the reconciler).

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
2. Member enters phone + network in our dues UI; server (edge function)
   calls Bakery Pay initialize, stores the returned `BP-…` reference on a
   `pending` payment row.
3. Member approves the MoMo prompt on their phone (no redirect).
4. A scheduled reconciler polls `GET /api/collections/{id}` for pending
   rows → on success, mark the row `success` (idempotent); on failure,
   mark `failed`.
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

Robbie (with Claude) runs the whole integration solo. Dues are GH₵240/year
for 2024, 2025 and 2026 (GH₵720 total per member), auto-assigned to every
registration by trigger.
