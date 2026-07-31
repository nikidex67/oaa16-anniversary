// Paystack webhook — SKELETON. See PAYMENTS.md before implementing.
//
// Deploy with verify_jwt=false (Paystack can't sign our JWTs); security comes
// from the x-paystack-signature HMAC check below. Secrets required (set via
// Supabase secrets, never in the repo):
//   PAYSTACK_SECRET_KEY  — sk_test_… while building
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — provided by the platform

async function validSignature(rawBody: string, signature: string | null): Promise<boolean> {
  if (!signature) return false
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(Deno.env.get('PAYSTACK_SECRET_KEY')!),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
  const hex = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, '0')).join('')
  return hex === signature
}

Deno.serve(async (req) => {
  const rawBody = await req.text()

  if (!(await validSignature(rawBody, req.headers.get('x-paystack-signature')))) {
    return new Response('invalid signature', { status: 401 })
  }

  const event = JSON.parse(rawBody)

  if (event.event === 'charge.success') {
    const data = event.data
    // TODO:
    // 1. Look up the pending payment row by provider_ref = data.reference.
    //    Unknown reference -> log + 200 (don't error-loop Paystack retries).
    // 2. Verify data.amount (pesewas) and data.currency match the row.
    // 3. UPDATE the row: status='success', channel=data.channel,
    //    paid_at=data.paid_at, raw_payload=event. The unique
    //    (provider, provider_ref) constraint + status check make replays no-ops.
    // 4. Send the receipt email — copy the SMTPClient pattern from
    //    supabase/functions/send-welcome/index.ts (from 'info@oaa2016.org').
  }

  // Always 200 for verified events we don't handle — Paystack retries non-2xx.
  return new Response('ok')
})
