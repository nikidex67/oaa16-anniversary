// Reconciler: Bakery Pay has no webhooks, so this function polls the status
// of pending 'bakerypay' payments and settles the ledger. Invoked on a
// schedule (pg_cron) and idempotent — a row is only ever moved out of
// 'pending' once. See PAYMENTS.md.
//
// Mock mode (BAKERYPAY_MOCK=true): every pending mock payment resolves to
// success on the next run.
//
// ASSUMPTION (open question with Bakery Pay): GET /api/collections/{id}
// accepts the collection *reference* as the path id. Verify before go-live.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

Deno.serve(async (req) => {
  if (req.headers.get('x-api-secret') !== Deno.env.get('PAY_API_SECRET')) {
    return json({ error: 'forbidden' }, 403)
  }

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const mock = Deno.env.get('BAKERYPAY_MOCK') === 'true'

  const { data: pending, error } = await db
    .from('payments')
    .select('id, registration_id, amount, provider_ref, created_at')
    .eq('provider', 'bakerypay')
    .eq('status', 'pending')
    .order('created_at')
    .limit(20)
  if (error) return json({ error: error.message }, 500)

  let succeeded = 0, failed = 0, still = 0
  for (const p of pending ?? []) {
    let outcome: 'success' | 'failed' | 'pending' = 'pending'
    let raw: unknown = null

    if (mock) {
      outcome = 'success'
      raw = { mock: true, reconciled_at: new Date().toISOString() }
    } else {
      const res = await fetch(
        `${Deno.env.get('BAKERYPAY_BASE_URL')}/api/collections/${encodeURIComponent(p.provider_ref)}`,
        { headers: { Authorization: `Bearer ${Deno.env.get('BAKERYPAY_TOKEN')}` } },
      )
      const bp = await res.json().catch(() => null)
      if (!res.ok || !bp?.success) { still++; continue }  // transient — retry next run
      raw = bp
      const s = String(bp.data?.status ?? '').toLowerCase()
      if (s === 'success' || s === 'successful' || s === 'completed') outcome = 'success'
      else if (s === 'failed' || s === 'declined' || s === 'cancelled') outcome = 'failed'
    }

    if (outcome === 'pending') { still++; continue }

    // Idempotent settle: only rows still 'pending' move.
    const { data: updated } = await db
      .from('payments')
      .update({ status: outcome, paid_at: outcome === 'success' ? new Date().toISOString() : null, raw_payload: raw })
      .eq('id', p.id)
      .eq('status', 'pending')
      .select('id')
    if (!updated?.length) continue

    if (outcome === 'success') {
      succeeded++
      await sendReceipt(db, p).catch((e) => console.error('receipt failed', p.provider_ref, e))
    } else failed++
  }

  return json({ checked: (pending ?? []).length, succeeded, failed, still_pending: still })
})

async function sendReceipt(db: ReturnType<typeof createClient>, p: { registration_id: string; amount: number; provider_ref: string }) {
  const { data: reg } = await db
    .from('registrations')
    .select('first_name, nickname, email')
    .eq('id', p.registration_id)
    .single()
  if (!reg) return

  const first = (reg.nickname || reg.first_name || 'Akora').trim()
  const ghs = (p.amount / 100).toFixed(2)
  const client = new SMTPClient({
    connection: {
      hostname: 'mail.privateemail.com',
      port: 465,
      tls: true,
      auth: { username: 'info@oaa2016.org', password: Deno.env.get('SMTP_PASSWORD')! },
    },
  })
  try {
    await client.send({
      from: 'OAA 16 <info@oaa2016.org>',
      to: reg.email,
      subject: `Payment received — GH₵${ghs}`,
      content: `Thanks ${first}!\n\nWe received GH₵${ghs} toward your OAA 16 dues.\nReference: ${p.provider_ref}\n\nYour dues balance updates automatically on the website.\n\n— OAA 16\nThis is your receipt. Questions? Just reply.`,
      html: `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
<h2 style="margin:0 0 12px">Thanks ${esc(first)}! 🎉</h2>
<p style="font-size:15px;line-height:1.6;color:#444">We received <b>GH₵${ghs}</b> toward your OAA 16 dues.</p>
<p style="font-family:monospace;font-size:13px;background:#F0EDF8;border-radius:10px;padding:10px 14px;display:inline-block">Ref · ${esc(p.provider_ref)}</p>
<p style="font-size:13px;color:#888">Your dues balance updates automatically on the website. This email is your receipt — questions? Just reply.</p>
</div>`,
    })
  } finally {
    await client.close()
  }
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } })
}
