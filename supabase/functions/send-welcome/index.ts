import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

const WHATSAPP_LINK = 'https://chat.whatsapp.com/E7NI1vNHNKgEQeGOUjSxWd?mode=gi_t'

function welcomeHtml(first: string, inGroup: string): string {
  const groupBlock = inGroup === 'no'
    ? `<tr><td style="padding:0 36px 28px">
         <a href="${WHATSAPP_LINK}" target="_blank"
            style="display:inline-block;background:#25D366;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;border-radius:999px;padding:14px 28px">
           Join the WhatsApp Group &#8599;</a>
       </td></tr>`
    : `<tr><td style="padding:0 36px 28px;font-size:14px;color:#6B6080;line-height:1.6">
         You're already in the WhatsApp group, so you're all set &#8212; announcements land there first.
       </td></tr>`

  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#F0EDF8">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0EDF8;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:24px;overflow:hidden;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#0E0C09">
        <tr><td style="background:#0E0C09;padding:36px;text-align:center">
          <img src="https://oaa2016.org/assets/2016-crest.webp" alt="OAA 16 crest" width="120" style="display:inline-block;max-width:120px;height:auto">
        </td></tr>
        <tr><td style="padding:36px 36px 8px">
          <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#6B6080;font-weight:600">Class of 2016 &#183; 10 Years On</div>
        </td></tr>
        <tr><td style="padding:12px 36px 8px">
          <h1 style="margin:0;font-size:28px;line-height:1.15;font-weight:800">You're in, ${first}! &#127881;</h1>
        </td></tr>
        <tr><td style="padding:12px 36px 24px;font-size:16px;line-height:1.6;color:#6B6080">
          Thanks for registering for the OAA 16 10th anniversary. It's been a decade &#8212; and we're getting the whole year group back together.
        </td></tr>
        ${groupBlock}
        <tr><td style="padding:0 36px 8px">
          <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#6B6080;font-weight:600">What's coming</div>
        </td></tr>
        <tr><td style="padding:8px 36px 32px;font-size:15px;line-height:1.8;color:#0E0C09">
          &#8226; 10th Anniversary Career &amp; Mentorship Fair &#8212; dates, venue and lineup dropping soon<br>
          &#8226; Reunion updates and announcements, right here in your inbox<br>
          &#8226; A reconnected year group &#8212; tell an Akora who hasn't registered yet: <a href="https://oaa2016.org" style="color:#7C3AED">oaa2016.org</a>
        </td></tr>
        <tr><td style="padding:24px 36px;background:#F0EDF8;font-size:12px;line-height:1.6;color:#6B6080">
          You're receiving this because you registered at oaa2016.org.<br>
          Questions? Just reply &#8212; this inbox is read by the OAA 16 team.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== Deno.env.get('WELCOME_WEBHOOK_SECRET')) {
    return new Response('forbidden', { status: 403 })
  }

  const { record } = await req.json()
  if (!record?.email) return new Response('no record', { status: 400 })

  const first = (record.nickname || record.first_name || 'Akora').trim()

  const client = new SMTPClient({
    connection: {
      hostname: 'mail.privateemail.com',
      port: 465,
      tls: true,
      auth: {
        username: 'info@oaa2016.org',
        password: Deno.env.get('SMTP_PASSWORD')!,
      },
    },
  })

  try {
    await client.send({
      from: 'OAA 16 <info@oaa2016.org>',
      to: record.email,
      subject: `You're in, ${first}! — OAA 16, 10 Years On`,
      html: welcomeHtml(first, record.in_group ?? ''),
    })
  } finally {
    await client.close()
  }

  return new Response('sent')
})
