## Current Status
**Last Updated**: 2026-09-29
**Last Agent Session**: Replaced the logo with the AK Sales artwork and generated favicons;
found and fixed the test suite connecting to the production database (ISSUE-008).
**Test Suite Status**: 84/84 passing (three consecutive runs). Lint: 6 pre-existing problems.

## In Progress
Nothing in flight.

## Blocked On
Nothing.

## Decisions Needed
- Whether the business name on the site should change to match the AK Sales logo. Title,
  meta description and alt text still say "Anna Kitchen Equipments".
- Whether a faint favicon on white tabs is acceptable (ISSUE-009).
- Whether to compress the 16.7 MB brochure PDF (ISSUE-003) — 70% of `public/`.
- Whether to drop `vercel.json` and `api/` now that Hostinger is the deployment target.

## Deploying this change — REQUIRED
The admin API **fails closed**. After deploying, the dashboard will refuse every login
until these exist in hPanel → your app → Environment variables:

1. Run `npm run admin:password` locally.
2. Copy `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` and `SESSION_SECRET` into hPanel.
3. Restart the app.
4. Check `/api/auth/me` returns 401 (not 503). 503 means the variables are missing.

The public site is unaffected either way — only the admin area depends on them.

## Next Steps (for the next agent session)
1. Set the three admin variables in hPanel (above) — otherwise the dashboard is unusable.
2. Consider ISSUE-002 (three duplicate `/api/products` fetches per page).

## Do Not Touch
- `public/` — generated output. Edit originals in `public-original/` and re-run the
  pipeline (assets.md).
- `public-original/` — the only copy of the pre-optimisation originals (~129 MB), gitignored
  and therefore **not on GitHub**. It exists on this machine only; back it up.
- The `listen()` in `server.js` — do not add another one in `server/index.js`.
- Route order in `server/index.js` — anything registered after the `GET *` SPA fallback is
  unreachable, and `requireAuth` must stay ahead of multer on upload routes.
- `src/data/productsData.js` / `blogsData.js` — load-bearing fallback data, not dead code.
