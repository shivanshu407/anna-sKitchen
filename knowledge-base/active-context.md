## Current Status
**Last Updated**: 2026-10-01
**Last Agent Session**: Knowledge base audit against code, remote and production. Before that
(2026-09-29): AK Sales logo, test isolation fix, full rebrand to AK Sales (Surat).
**Test Suite Status**: 88/88 passing. One unexplained, rare setup failure (ISSUE-013).
Lint: 4 pre-existing problems (ISSUE-004).

## Production, as of 2026-10-01
- **annakitchenequipment.com** runs `6ade621`: AK Sales logo and favicons, Google Analytics,
  owner's SEO. **The rebrand (`a55833b`) is not deployed** — the live title still says
  "Anna Kitchen Equipments … Lucknow".
- **aksales.in** (and www) shows a Hostinger parking page.
- **Database**: 61 products, all image paths correct. The Bakery Products description still
  says the old name (ISSUE-012).

## In Progress
- [ ] Deploy `a55833b` (the rebrand) — redeploy in hPanel or upload the current zip.
- [ ] Move to aksales.in — `deployment.md` → "Moving to aksales.in". New app and its env vars
      first, redirect last.
- [ ] Run `scripts/rebrand-db.mongosh.js` (needs the coworker with Atlas access).

## Blocked On
- Hostinger and Atlas access — both are with the owner/coworker, not this machine. This
  machine's sandbox cannot reach MongoDB at all.

## Decisions Needed
- New AK Sales email and Instagram, when they exist (ISSUE-011).
- A rebranded brochure PDF (ISSUE-010).
- Whether to keep or remove the unused `helmet` dependency (ISSUE-015).
- Whether a faint favicon on white tabs is acceptable (ISSUE-009).
- Rotate the MongoDB password — it was shared in plain text in chat on 2026-09-29 and is weak.
  Never write credential values into this knowledge base: the GitHub repo is public.

## Next Steps (for the next agent session)
1. Check production first: `/api/health`, the homepage `<title>`, and whether aksales.in is live.
2. After the redirect is set up, verify a deep link keeps its path
   (`annakitchenequipment.com/collections/refrigeration` → `aksales.in/collections/refrigeration`).
3. If ISSUE-013 recurs, capture `npx vitest run server/ --reporter=verbose` before re-running.

## Do Not Touch
- `public/` — generated output. Edit originals in `public-original/` and re-run the
  pipeline (assets.md). Brand files come from `scripts/build-logo.mjs`.
- `public-original/` — the only copy of the pre-optimisation originals (~129 MB), gitignored
  and therefore **not on GitHub**. It exists on this machine only; back it up.
- `.env` — holds the real production `MONGODB_URI`; gitignored. Never commit it, and never
  `delete` its variables in tests (ISSUE-008).
- The `listen()` in `server.js` — do not add another one in `server/index.js`.
- Route order in `server/index.js` — anything registered after the `GET *` SPA fallback is
  unreachable, and `requireAuth` must stay ahead of multer on upload routes.
- `src/data/productsData.js` / `blogsData.js` — load-bearing fallback data, not dead code.
