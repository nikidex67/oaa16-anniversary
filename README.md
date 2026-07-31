# OAA 16 — 10th Anniversary Site

Landing page for the Achimota School Class of 2016 (OAA 16) 10th anniversary.
Registration form + announcements, implemented from the Claude Design comp
(`OAA 16 Landing.dc.html`).

## Structure

- `site/` — the static site (plain HTML/CSS/JS, no build step)
- `supabase/schema.sql` — database schema + security policy; paste into the
  Supabase SQL Editor once
- `.github/workflows/deploy-pages.yml` — deploys `site/` to GitHub Pages on
  every push to `main`

## Connecting the database

1. Create a project at supabase.com, run `supabase/schema.sql` in the SQL Editor.
2. In `site/app.js`, fill in `SUPABASE_URL` and `SUPABASE_ANON_KEY` from
   Project Settings → API. (The anon key is safe to commit — row level
   security limits it to inserts.)
3. Until those are set, the form runs frontend-only: validation and the
   success screen work, but nothing is saved.

## Deploying

Push to `main` on GitHub, then in the repo settings enable
**Settings → Pages → Source: GitHub Actions**. The site publishes to
`https://<user>.github.io/<repo>/`.

## Working on the redesign

The new site design lives on the **`redesign`** branch — never edit `main`
directly (it is the live site at oaa2016.org and deploys on every push).

```
git clone https://github.com/nikidex67/oaa16-anniversary.git
cd oaa16-anniversary
git checkout redesign
```

Edit the pages in `prototype/`, then commit and push. To preview your work,
just open `prototype/index.html` in a browser — no build step, no server.

When the redesign is complete, it goes live via a pull request from
`redesign` into `main`.
