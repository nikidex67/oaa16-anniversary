// Bank-transfer collections (Bakery Pay "gamma" method). Two operations:
//   GET  → Bakery Pay's bank account details + current fee (share with member)
//   POST → multipart { amount_pesewas, receipt } — member has wired the money
//          and uploads the transfer receipt; we store it, create a pending
//          ledger row, and (live mode) submit collection+receipt to Bakery Pay.
// Auth: member JWT (Authorization: Bearer). Committee policy: the member's
// dues are credited with the GROSS amount transferred; the 0.5% platform fee
// is absorbed by the foundation.
// Mock mode: fabricates the reference; the reconciler resolves it like MoMo.

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

const MOCK_BANK = {
  bank_name: 'Ghana Commercial Bank',
  account_name: 'Bakery Pay Ltd',
  account_number: '1234567890',
  swift_code: 'GHCBGHAC',
  branch: 'Accra Main',
  currency: 'GHS',
  platform_fee_percentage: 0.005,
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  // --- Auth: member JWT required for everything ---
  const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer /i, '')
  if (!jwt) return json({ error: 'unauthorised' }, 401)
  const authClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!)
  const { data: userData, error: userErr } = await authClient.auth.getUser(jwt)
  if (userErr || !userData?.user?.email) return json({ error: 'unauthorised' }, 401)

  const mock = Deno.env.get('BAKERYPAY_MOCK') === 'true'

  if (req.method === 'GET') {
    if (mock) return json({ bank: MOCK_BANK })
    const res = await fetch(`${Deno.env.get('BAKERYPAY_BASE_URL')}/v1/collections/gamma/bank-details`, {
      headers: {
        'X-Api-Key': Deno.env.get('BAKERY_PAY_API_KEY')!,
        'Accept': 'application/json',
      },
    })
    const bp = await res.json().catch(() => null)
    if (!res.ok || !bp?.success) return json({ error: 'could not fetch bank details' }, 502)
    return json({ bank: bp.data })
  }

  // --- POST: submit transfer + receipt ---
  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return json({ error: 'expected multipart/form-data' }, 400)
  }
  const amount_pesewas = Number(form.get('amount_pesewas'))
  const receipt = form.get('receipt')
  if (!Number.isInteger(amount_pesewas) || amount_pesewas <= 0) {
    return json({ error: 'amount_pesewas must be a positive integer' }, 400)
  }
  if (!(receipt instanceof File)) return json({ error: 'receipt file is required' }, 400)
  if (receipt.size > 5 * 1024 * 1024) return json({ error: 'receipt must be under 5MB' }, 400)
  const okTypes = ['image/jpeg', 'image/png', 'application/pdf']
  if (!okTypes.includes(receipt.type)) return json({ error: 'receipt must be JPEG, PNG or PDF' }, 400)

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: reg } = await db
    .from('registrations')
    .select('id, first_name, last_name, email')
    .ilike('email', userData.user.email)
    .single()
  if (!reg) return json({ error: 'no registration found for your account email' }, 404)

  // Store the receipt privately (audit trail either way)
  const ext = receipt.type === 'application/pdf' ? 'pdf' : receipt.type === 'image/png' ? 'png' : 'jpg'
  const path = `${reg.id}/${crypto.randomUUID()}.${ext}`
  const { error: upErr } = await db.storage.from('receipts').upload(path, receipt, { contentType: receipt.type })
  if (upErr) return json({ error: 'receipt upload failed', detail: upErr.message }, 500)

  let providerRef: string
  let raw: unknown
  if (mock) {
    providerRef = 'BPMOCK-BT-' + crypto.randomUUID().slice(0, 6).toUpperCase()
    raw = { mock: true, receipt_path: path }
  } else {
    const fwd = new FormData()
    fwd.set('payer_email', reg.email)
    fwd.set('payer_name', `${reg.first_name} ${reg.last_name}`)
    fwd.set('amount', String(amount_pesewas / 100))
    fwd.set('receipt', receipt, `receipt.${ext}`)
    const res = await fetch(`${Deno.env.get('BAKERYPAY_BASE_URL')}/v1/collections/gamma/initialize`, {
      method: 'POST',
      headers: {
        'X-Api-Key': Deno.env.get('BAKERY_PAY_API_KEY')!,
        'Accept': 'application/json',
      },
      body: fwd,
    })
    const bp = await res.json().catch(() => null)
    if (!res.ok || !bp?.success) {
      return json({ error: 'provider rejected the submission', provider_message: bp?.message ?? null }, 502)
    }
    providerRef = bp.data.reference
    raw = { ...bp, receipt_path: path }
  }

  const { error: insErr } = await db.from('payments').insert({
    registration_id: reg.id,
    schedule_id: null,
    amount: amount_pesewas,       // gross — foundation absorbs the 0.5% fee
    provider: 'bakerypay',
    provider_ref: providerRef,
    status: 'pending',
    channel: 'bank_transfer',
    raw_payload: raw,
  })
  if (insErr) return json({ error: 'ledger insert failed', detail: insErr.message }, 500)

  return json({
    reference: providerRef,
    status: 'pending',
    message: 'Receipt submitted. An admin will review it — your dues update automatically once confirmed (usually within 1–2 days).',
  })
})

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...CORS } })
}
