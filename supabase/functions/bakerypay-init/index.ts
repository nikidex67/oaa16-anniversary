// Create a dues payment: pending ledger row + Bakery Pay MoMo collection.
// See PAYMENTS.md. Two auth paths:
//   1. Member: Authorization: Bearer <supabase user JWT>. The registration is
//      resolved from the verified email — the client cannot pay as someone else.
//   2. Server: x-api-secret header (PAY_API_SECRET), registration_id in body.
//
// Mock mode (BAKERYPAY_MOCK=true): skips the real API, fabricates a
// reference. Lets the whole flow run before Bakery Pay credentials exist.
//
// Request JSON: { registration_id?, schedule_id?, amount_pesewas, phone, operator }
// operator: mtn | vodafone | airteltigo. phone: 0XXXXXXXXX.

import { createClient } from 'npm:@supabase/supabase-js@2'

const OPERATORS = ['mtn', 'vodafone', 'airteltigo']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const isServer = req.headers.get('x-api-secret') === Deno.env.get('PAY_API_SECRET')
  let memberEmail: string | null = null
  if (!isServer) {
    const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer /i, '')
    if (!jwt) return json({ error: 'unauthorised' }, 401)
    const authClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!)
    const { data: userData, error: userErr } = await authClient.auth.getUser(jwt)
    if (userErr || !userData?.user?.email) return json({ error: 'unauthorised' }, 401)
    memberEmail = userData.user.email
  }

  let body
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid JSON' }, 400)
  }
  const { registration_id, schedule_id = null, amount_pesewas, phone, operator } = body

  if (!Number.isInteger(amount_pesewas) || amount_pesewas <= 0) {
    return json({ error: 'amount_pesewas must be a positive integer' }, 400)
  }
  if (!/^0\d{9}$/.test(phone ?? '')) return json({ error: 'phone must be 0XXXXXXXXX' }, 400)
  if (!OPERATORS.includes(operator)) return json({ error: 'operator must be one of ' + OPERATORS.join('/') }, 400)

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  let regQuery = db.from('registrations').select('id, first_name, last_name, email')
  regQuery = memberEmail ? regQuery.ilike('email', memberEmail) : regQuery.eq('id', registration_id)
  const { data: reg, error: regErr } = await regQuery.single()
  if (regErr || !reg) {
    return json({ error: memberEmail ? 'no registration found for your account email' : 'registration not found' }, 404)
  }

  const amountGhs = amount_pesewas / 100
  let providerRef: string
  let raw: unknown = null

  let fees: { platform_fee: number; total: number } | null = null
  if (Deno.env.get('BAKERYPAY_MOCK') === 'true') {
    providerRef = 'BPMOCK-' + crypto.randomUUID().slice(0, 8).toUpperCase()
    // Confirmed commercial terms: 2.5% all-in on MoMo, paid by the member.
    const fee = Math.round(amount_pesewas * 0.025)
    fees = { platform_fee: fee, total: amount_pesewas + fee }
    raw = { mock: true, fees }
  } else {
    const res = await fetch(`${Deno.env.get('BAKERYPAY_BASE_URL')}/api/collections/alpha/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('BAKERYPAY_TOKEN')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        payer_email: reg.email,
        payer_name: `${reg.first_name} ${reg.last_name}`,
        amount: amountGhs,
        phone,
        operator,
      }),
    })
    const bp = await res.json().catch(() => null)
    if (!res.ok || !bp?.success) {
      return json({ error: 'provider rejected the collection', provider_message: bp?.message ?? null }, 502)
    }
    providerRef = bp.data.reference
    raw = bp
    const feeGhs = Number(bp.data.platform_fee ?? 0) + Number(bp.data.gateway_fee ?? 0)
    fees = { platform_fee: Math.round(feeGhs * 100), total: Math.round(Number(bp.data.total_amount ?? amountGhs) * 100) }
  }

  const { error: insErr } = await db.from('payments').insert({
    registration_id: reg.id,
    schedule_id,
    amount: amount_pesewas,
    provider: 'bakerypay',
    provider_ref: providerRef,
    status: 'pending',
    channel: 'mobile_money',
    raw_payload: raw,
  })
  if (insErr) return json({ error: 'ledger insert failed', detail: insErr.message }, 500)

  return json({
    reference: providerRef,
    status: 'pending',
    fees,
    message: 'Approve the payment prompt on your phone. Your dues will update automatically.',
  })
})

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...CORS } })
}
