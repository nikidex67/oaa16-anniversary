// Reconciler: Bakery Pay has no webhooks, so this function polls the status
// of pending 'bakerypay' payments and settles the ledger. Invoked on a
// schedule (pg_cron) and idempotent — a row is only ever moved out of
// 'pending' once. On success it emails a branded receipt including the
// member's remaining dues balance. See PAYMENTS.md.
//
// Mock mode (BAKERYPAY_MOCK=true): every pending mock payment resolves to
// success on the next run.
//
// (open question with Bakery Pay): GET /v1/collections/{reference}
// accepts the collection *reference* as the path id.

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
    .select('id, registration_id, amount, provider_ref, order_id, created_at')
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
        `${Deno.env.get('BAKERYPAY_BASE_URL')}/v1/collections/${encodeURIComponent(p.provider_ref)}`,
        {
          headers: {
            'X-Api-Key': Deno.env.get('BAKERY_PAY_API_KEY')!,
            'Accept': 'application/json',
          },
        },
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

    if (p.order_id) {
      await db.from('orders')
        .update({ status: outcome === 'success' ? 'paid' : 'failed' })
        .eq('id', p.order_id).eq('status', 'pending')
    }

    if (outcome === 'success') {
      succeeded++
      const send = p.order_id ? sendOrderReceipt(db, p) : sendReceipt(db, p)
      await send.catch((e) => console.error('receipt failed', p.provider_ref, e))
    } else failed++
  }

  return json({ checked: (pending ?? []).length, succeeded, failed, still_pending: still })
})

function ghs(pesewas: number): string {
  return 'GH₵' + (pesewas / 100).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function sendReceipt(
  db: ReturnType<typeof createClient>,
  p: { registration_id: string; amount: number; provider_ref: string },
) {
  const { data: reg } = await db
    .from('registrations')
    .select('first_name, nickname, email')
    .eq('id', p.registration_id)
    .single()
  if (!reg) return

  // Dues position across all assigned schedules (after this payment settled).
  const { data: dues } = await db
    .from('member_dues_status')
    .select('amount_due, amount_paid, balance')
    .eq('registration_id', p.registration_id)
  const totalDue = (dues ?? []).reduce((s, d) => s + d.amount_due, 0)
  const totalPaid = (dues ?? []).reduce((s, d) => s + d.amount_paid, 0)
  const balance = (dues ?? []).reduce((s, d) => s + d.balance, 0)
  const hasDues = totalDue > 0
  const pct = hasDues ? Math.max(0, Math.min(100, Math.round((totalPaid / totalDue) * 100))) : 0

  const first = (reg.nickname || reg.first_name || 'Akora').trim()

  const balanceRow = !hasDues ? '' : balance > 0
    ? `<tr><td style="padding:10px 0;font-size:14px;color:#6B6080;border-top:1.5px solid #0E0C09">Balance remaining</td>
       <td align="right" style="padding:10px 0;font-size:16px;font-weight:700;color:#7C3AED;border-top:1.5px solid #0E0C09">${ghs(balance)}</td></tr>`
    : `<tr><td style="padding:10px 0;font-size:14px;color:#6B6080;border-top:1.5px solid #0E0C09">Balance</td>
       <td align="right" style="padding:10px 0;font-size:15px;font-weight:700;color:#1E7A55;border-top:1.5px solid #0E0C09">Fully paid ✓</td></tr>`

  const progress = !hasDues ? '' : `
    <tr><td colspan="2" style="padding:16px 0 4px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="background:#F0EDF8;border-radius:999px;height:12px;font-size:0;line-height:0">
          <table role="presentation" cellpadding="0" cellspacing="0" width="${pct}%" style="height:12px"><tr>
            <td style="background:#7C3AED;border-radius:999px;height:12px;font-size:0;line-height:0">&nbsp;</td>
          </tr></table>
        </td>
      </tr></table>
      <div style="font-size:12px;color:#6B6080;margin-top:8px">${pct}% of your dues paid</div>
    </td></tr>`

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#F0EDF8">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDF8;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:24px;overflow:hidden;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#0E0C09">
  <tr><td><img src="https://oaa2016.org/assets/email/receipt-header.png" alt="OAA 16" width="600" style="display:block;width:100%;height:auto"></td></tr>
  <tr><td style="padding:32px 36px 8px">
    <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#6B6080;font-weight:600">Payment receipt</div>
  </td></tr>
  <tr><td style="padding:10px 36px 4px">
    <h1 style="margin:0;font-size:26px;font-weight:800;line-height:1.2">Thanks, ${esc(first)}! 🎉</h1>
  </td></tr>
  <tr><td style="padding:10px 36px 20px;font-size:15px;line-height:1.6;color:#6B6080">
    We've received your payment toward the OAA 16 anniversary dues.
  </td></tr>
  <tr><td style="padding:0 36px 8px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:10px 0;font-size:14px;color:#6B6080;border-top:1px solid #F0EDF8">This payment</td>
          <td align="right" style="padding:10px 0;font-size:20px;font-weight:800">${ghs(p.amount)}</td></tr>
      <tr><td style="padding:10px 0;font-size:14px;color:#6B6080;border-top:1px solid #F0EDF8">Reference</td>
          <td align="right" style="padding:10px 0;font-family:'Courier New',monospace;font-size:13px;color:#6B6080">${esc(p.provider_ref)}</td></tr>
      ${hasDues ? `
      <tr><td style="padding:10px 0;font-size:14px;color:#6B6080;border-top:1px solid #F0EDF8">Total paid so far</td>
          <td align="right" style="padding:10px 0;font-size:15px;font-weight:700">${ghs(totalPaid)}</td></tr>
      <tr><td style="padding:10px 0;font-size:14px;color:#6B6080;border-top:1px solid #F0EDF8">Total dues</td>
          <td align="right" style="padding:10px 0;font-size:15px;font-weight:700">${ghs(totalDue)}</td></tr>` : ''}
      ${balanceRow}
      ${progress}
    </table>
  </td></tr>
  <tr><td style="padding:20px 36px 32px;font-size:12.5px;line-height:1.6;color:#6B6080">
    Your dues balance updates automatically on <a href="https://oaa2016.org" style="color:#7C3AED">oaa2016.org</a>.
    This email is your receipt — questions? Just reply.
  </td></tr>
  <tr><td align="center" style="padding:20px 36px;background:#F0EDF8;font-size:11.5px;line-height:1.6;color:#6B6080;text-align:center">
    OAA 16 · Achimota School Class of 2016 · 10 Years On
  </td></tr>
</table>
</td></tr></table>
</body></html>`

  const textBalance = !hasDues
    ? ''
    : balance > 0
      ? `\nTotal paid so far: ${ghs(totalPaid)}\nTotal dues: ${ghs(totalDue)}\nBalance remaining: ${ghs(balance)} (${pct}% paid)\n`
      : `\nTotal paid: ${ghs(totalPaid)} — fully paid, thank you!\n`

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
      subject: `Payment received — ${ghs(p.amount)}`,
      content: `Thanks ${first}!\n\nWe received ${ghs(p.amount)} toward your OAA 16 dues.\nReference: ${p.provider_ref}\n${textBalance}\nYour dues balance updates automatically on oaa2016.org.\n\n— OAA 16\nThis is your receipt. Questions? Just reply.`,
      // Collapse template whitespace: blank/indented lines become '=20'
      // artifacts under quoted-printable encoding in some clients.
      html: html.replace(/\n\s*/g, ' ').trim(),
    })
  } finally {
    await client.close()
  }
}

async function sendOrderReceipt(
  db: ReturnType<typeof createClient>,
  p: { registration_id: string; amount: number; provider_ref: string; order_id: string },
) {
  const { data: reg } = await db
    .from('registrations')
    .select('first_name, nickname, email')
    .eq('id', p.registration_id)
    .single()
  if (!reg) return

  const { data: ord } = await db
    .from('orders')
    .select('items, total')
    .eq('id', p.order_id)
    .single()
  if (!ord) return

  const first = (reg.nickname || reg.first_name || 'Akora').trim()
  const items = (ord.items ?? []) as { title: string; size: string; qty: number; unit_price: number }[]

  const itemRows = items.map((it) =>
    `<tr><td style="padding:10px 0;font-size:14px;border-top:1px solid #F0EDF8">${esc(it.title)} · ${esc(it.size)}${it.qty > 1 ? ' × ' + it.qty : ''}</td>
     <td align="right" style="padding:10px 0;font-size:15px;font-weight:700;border-top:1px solid #F0EDF8">${ghs(it.unit_price * it.qty)}</td></tr>`
  ).join('')

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#F0EDF8">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDF8;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:24px;overflow:hidden;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#0E0C09">
  <tr><td><img src="https://oaa2016.org/assets/email/receipt-header.png" alt="OAA 16" width="600" style="display:block;width:100%;height:auto"></td></tr>
  <tr><td style="padding:32px 36px 8px">
    <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#6B6080;font-weight:600">Order receipt</div>
  </td></tr>
  <tr><td style="padding:10px 36px 4px">
    <h1 style="margin:0;font-size:26px;font-weight:800;line-height:1.2">Order confirmed, ${esc(first)}! 🎉</h1>
  </td></tr>
  <tr><td style="padding:10px 36px 20px;font-size:15px;line-height:1.6;color:#6B6080">
    Your OAA 16 merch order is in. We'll message the group when pickup and delivery details are ready.
  </td></tr>
  <tr><td style="padding:0 36px 8px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${itemRows}
      <tr><td style="padding:10px 0;font-size:14px;color:#6B6080;border-top:1.5px solid #0E0C09">Total paid</td>
          <td align="right" style="padding:10px 0;font-size:20px;font-weight:800;border-top:1.5px solid #0E0C09">${ghs(p.amount)}</td></tr>
      <tr><td style="padding:10px 0;font-size:14px;color:#6B6080;border-top:1px solid #F0EDF8">Reference</td>
          <td align="right" style="padding:10px 0;font-family:'Courier New',monospace;font-size:13px;color:#6B6080">${esc(p.provider_ref)}</td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:20px 36px 32px;font-size:12.5px;line-height:1.6;color:#6B6080">
    Track your orders any time on <a href="https://oaa2016.org/dashboard.html" style="color:#7C3AED">your member dashboard</a>.
    This email is your receipt — questions? Just reply.
  </td></tr>
  <tr><td align="center" style="padding:20px 36px;background:#F0EDF8;font-size:11.5px;line-height:1.6;color:#6B6080;text-align:center">
    OAA 16 · Achimota School Class of 2016 · 10 Years On
  </td></tr>
</table>
</td></tr></table>
</body></html>`

  const itemsText = items.map((it) => `${it.title} · ${it.size}${it.qty > 1 ? ' × ' + it.qty : ''} — ${ghs(it.unit_price * it.qty)}`).join('\n')

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
      subject: `Order confirmed — ${ghs(p.amount)}`,
      content: `Thanks ${first}!\n\nYour OAA 16 merch order is confirmed.\n\n${itemsText}\nTotal paid: ${ghs(p.amount)}\nReference: ${p.provider_ref}\n\nTrack your orders on oaa2016.org/dashboard.html.\n\n— OAA 16\nThis is your receipt. Questions? Just reply.`,
      html: html.replace(/\n\s*/g, ' ').trim(),
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
