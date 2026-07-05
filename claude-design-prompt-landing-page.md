# Claude Design Prompt — OAA 16 Landing Page

Copy everything below the line into Claude Design.

---

Create a single-page website landing page for "OAA 16" — a school year group celebrating its 10th anniversary. Desktop-first, split-screen layout inspired by the Untitled UI login page pattern: form on the left half (white), visual panel on the right half (full-bleed). Fully responsive — on mobile, the right panel stacks below the form.

## Layout

**Left half (50%, white background):**
- Top-left: OAA 16 logo (black version) with wordmark
- Centered content column (max-width ~440px):
  - Heading: "Welcome back, OAA 16" (display font, extrabold)
  - Subtext: "It's been 10 years. Help us reconnect the year group — fill in your details below."
  - The data collection form (fields listed below)
  - Submit button: full-width, accent style, label "Count me in"
  - Footer microcopy: "Your details are only shared within the OAA 16 year group."

**Right half (50%, full-bleed):**
- Background: deep violet (#5B21B6) panel or a group photo placeholder with a dark violet overlay
- Overlaid content, bottom-aligned like a testimonial card:
  - Small pill badge: "News & Upcoming Events"
  - Large placeholder headline in white display font, e.g. "10th Anniversary Reunion — dates, venue and lineup dropping soon."
  - Sub-line: "Check back here for announcements, throwbacks and things to know."
  - Prev/next arrow buttons (circular, outlined, bottom-right) as a placeholder carousel control — this panel will later rotate through event announcements

## Form fields (in order)

1. **First name(s)** — text, required
2. **Last name** — text, required
3. **Phone number** — tel input with country code; below it two checkboxes: "Reach me by call" and "This is my WhatsApp number"
4. **WhatsApp group check (conditional):** when "This is my WhatsApp number" is ticked, reveal a radio question: "Are you already in the OAA 16 WhatsApp group?" — Yes / No. If **No**, show an inline success-styled card with a "Join the WhatsApp group" button (link placeholder: https://chat.whatsapp.com/PLACEHOLDER) plus note "You'll get the invite link after submitting too."
5. **House** — select dropdown (placeholder options: House 1–6, editable later)
6. **Class** — select dropdown (placeholder options: editable later)
7. **Current profession** — text
8. **Company** — text
9. **Industry** — select dropdown (Technology, Finance, Healthcare, Law, Education, Energy, Media & Creative, Government, Entrepreneurship, Other)
10. **Brief description of what you do** — textarea, 3 rows, max ~300 chars with counter

Include client-side validation (required fields, phone format), a clear focused state on inputs, and a submitted state: replace the form with a confirmation card — "You're in! 🎉 We'll be in touch with anniversary updates." plus the WhatsApp join button if they answered No above.

## Design system (must follow exactly)

Colors:
- Foreground/text: #0E0C09
- Background: #FFFFFF
- Accent: #7C3AED (violet), deep accent #5B21B6
- Secondary surface: #EDE8F5, muted surface: #F0EDF8, muted text: #6B6080
- Success: #1E7A55 on #E4F0E9; Danger (validation errors): #B3362C on #F8E7E4

Typography:
- Display/headings & buttons: 'Cabinet Grotesk', system-ui, sans-serif (bold/extrabold)
- Body & inputs: 'Lora', Georgia, serif
- Labels/meta/counters: 'JetBrains Mono', monospace, small caps feel

Shape & depth:
- Radii: inputs 10px, cards 16–24px, buttons pill (999px)
- Shadows: subtle — 0 4px 12px rgba(14,12,9,.06); accent button hover glow 0 6px 20px rgba(124,58,237,.35)

Buttons:
- Primary accent: violet #7C3AED background, white text, pill shape, Cabinet Grotesk Bold 15px; hover lifts 1px with accent glow; active scales to .98; disabled at 40% opacity

Inputs:
- Minimal, generous padding, 1px border in muted tone, violet focus ring, labels above fields in small mono caps

Overall feel: warm, editorial, celebratory but grown-up — a decade-later reunion, not a corporate SaaS page. Single HTML file, no external dependencies beyond Google Fonts (Lora, JetBrains Mono; Cabinet Grotesk via fallback to system-ui if unavailable).
