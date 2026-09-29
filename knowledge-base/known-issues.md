# Known Issues

## ISSUE-001: Admin area has no real authentication
**Status**: Resolved
**Severity**: Critical
**Discovered**: 2026-09-07
**Resolved**: 2026-09-07
**Symptom**: Anyone could open `/admin/dashboard` directly and manage content, and anyone
with curl could delete the entire catalogue.
**Root Cause**: Three gaps: credentials compared in client-side JavaScript and shipped in
the bundle; no route guard on `/admin/dashboard`; and no authentication at all on the
mutating API routes.
**Workaround**: None was possible — gap 3 was reachable regardless of the front-end.
**Fix**: Server-side sessions. scrypt-hashed password in `ADMIN_PASSWORD_HASH`, an
HMAC-signed httpOnly `SameSite=Strict` session cookie, `requireAuth` on all four mutating
routes, a server-checked route guard, per-IP login rate limiting, and fail-closed behaviour
when unconfigured. See [security.md](security.md).
**Regression Test**: `server/auth.test.js` and `server/auth-routes.test.js` — 39 tests,
including forged-cookie and unconfigured-server cases.

## ISSUE-002: Collection pages fetch `/api/products` three times per render
**Status**: Open
**Severity**: Low
**Discovered**: 2026-09-07
**Symptom**: Network panel shows three concurrent `GET /api/products` on
`/collections/:category`, and a fourth on pages that also list blogs.
**Root Cause**: Several components call `fetchProducts()` independently with no shared
cache or context.
**Workaround**: None needed. Responses are small and the browser coalesces some of it.
**Fix**: Not done. A single provider or a small cache in `src/api/` would remove it.
**Regression Test**: None.

## ISSUE-003: Brochure PDF is 16.7 MB
**Status**: Accepted Risk
**Severity**: Low
**Discovered**: 2026-09-07
**Symptom**: `/anna-kitchen-broucher.pdf` is a 16.7 MB download and is 70% of `public/`.
**Root Cause**: Never compressed. No PDF tooling (Ghostscript/qpdf) on the dev machine.
**Workaround**: It is only fetched on click, so it does not affect page load.
**Fix**: Not done. Compressing it would cut `public/` from 23.6 MB to roughly 8 MB.
**Regression Test**: N/A.

## ISSUE-004: Pre-existing lint errors
**Status**: Open
**Severity**: Low
**Discovered**: 2026-09-07
**Symptom**: `npm run lint` reports 4 errors and 2 warnings.
**Root Cause**: Unused `index` parameters in `src/pages/AdminDashboard.jsx:320` and
`src/pages/Collections.jsx:101`; an unused `e` in `server/routes/blogs.js:57`; a
`set-state-in-effect` error and two `exhaustive-deps` warnings in
`src/components/Header.jsx` and `src/pages/AdminDashboard.jsx`.
**Workaround**: None needed; none block the build.
**Fix**: Not done — untouched by the hosting work and left alone deliberately. Note the
count was 66 before 2026-09-07 because ESLint applied browser globals to server code; the
config now lints Node files correctly, so these 6 are genuine.
**Regression Test**: `npm run lint`.

## ISSUE-005: Hosting plan may not support Node.js apps
**Status**: Resolved
**Severity**: High
**Discovered**: 2026-09-07
**Resolved**: 2026-09-07
**Symptom**: Hostinger documents in-panel Node.js apps for Business and Cloud plans, not
Premium, and the plan was described as "Premium Node.js hosting".
**Root Cause**: Documentation tier names did not match how the plan was described.
**Workaround**: The static fallback (`deploy/htaccess-static-fallback`) was prepared in case
Node.js was unavailable.
**Fix**: Confirmed directly in hPanel — the account reaches
**Deploy Your Web App**, offering "Import your Git repository" (recommended) and file
upload. Node.js app hosting is available; the Node path in deployment.md applies. The
static fallback is retained but is not the deployment route.
**Regression Test**: N/A — verify each deploy with `GET /api/health`.

## ISSUE-006: Every contact and quote form on the public site is inert
**Status**: Resolved
**Severity**: High
**Discovered**: 2026-09-07
**Resolved**: 2026-09-07
**Symptom**: A visitor filled in a contact or "Get Quote" form, clicked submit, and the
page reloaded with the fields cleared. Nothing was sent, nothing stored, nobody notified —
but to the visitor it looked like the enquiry had gone through. Every enquiry made this way
was silently lost.
**Root Cause**: Six `<form>` elements had no `onSubmit`, no `action`, no `method` and no
React state on their inputs, but their buttons were `type="submit"`. The browser therefore
performed a native GET submission to the current URL, reloading the SPA and discarding the
input.
**Workaround**: The phone, WhatsApp and `mailto:` links elsewhere on the page did work.
**Fix**: All six now hand off to WhatsApp with the details pre-filled. The five identical
"Get Quote" bars were extracted into one `QuoteBar` component. See [forms.md](forms.md).
**Regression Test**: `src/lib/whatsapp.test.js` — 14 tests over message building, encoding
and the popup-blocker fallback. Browser-verified on `/contact` and `/services`.

## ISSUE-007: Database image paths were not migrated with the asset rename
**Status**: Open — fix written, awaiting a run against production
**Severity**: High
**Discovered**: 2026-09-07
**Symptom**: On the live site every product image is broken (alt text only). Locally
everything looked fine.
**Root Cause**: The 2026-09-07 asset optimisation renamed every file in `public/` to
slugified WebP and rewrote the source, including the bundled fallback in
`src/data/productsData.js`. **MongoDB stores its own copy of those paths**, and those were
never migrated. The live API therefore returns
`/images/Bakery Product/Bengali Sweet Counter.png` for files that now only exist as
`/images/bakery-product/bengali-sweet-counter.webp`.

It looked fine locally because no `MONGODB_URI` was configured, so the front-end fell back
to the bundled catalogue — which *had* been updated. The fallback masked the bug: the only
environment where it appears is one with a working database.
**Workaround**: None. Every database-backed image 404s.
**Fix**: `scripts/migrate-image-paths.mjs` rewrites the stored paths using
`scripts/asset-map.json`. Dry run by default; `--apply` writes a JSON snapshot of both
collections to `backups/` first. Cloudinary URLs are left untouched.
Run: put `MONGODB_URI` in a local `.env`, then `npm run db:fix-image-paths`, check the
output, then re-run with `-- --apply`.
**Validated**: against the live API — all 61 stored paths map cleanly, 0 unmapped, and the
target files already return `200 image/webp` from the deployed server.
**Regression Test**: None automated (needs a live database). The dry run is the check.

## ISSUE-008: The test suite connected to the production database
**Status**: Resolved
**Severity**: Critical
**Discovered**: 2026-09-29
**Resolved**: 2026-09-29
**Symptom**: Test runs logged `MongoDB connection error: querySrv ... cluster0.vuc4kjf` —
the production cluster — and occasionally failed with 29 tests skipped.
**Root Cause**: A local `.env` holding the real `MONGODB_URI` was added on 2026-09-07. The
server calls dotenv at import. Both server test files ran `delete process.env.MONGODB_URI`
before importing the app, which left the variable unset — and dotenv fills unset variables
from `.env`. So the tests connected to production.

This was dangerous, not merely flaky: `server/auth-routes.test.js` logs in and sends
`DELETE /api/products/heating-range/0` to prove the route is unlocked. On any machine with
network access, `npm test` would have deleted a real product. It did not happen only because
the sandbox that ran the tests blocks DNS. Production was checked afterwards and is intact
(61 products, Heating Range unchanged).
**Workaround**: None needed now.
**Fix**: `vitest.config.js` sets the database and Cloudinary variables to empty strings for
every test, and the two `delete` lines became `= ''`. dotenv never overwrites an existing
variable, even an empty one.
**Regression Test**: `server/server.test.js` -> "test isolation" asserts `MONGODB_URI` is
empty after the app loads. Verified: three consecutive full runs, 84/84, with zero contact
with the production cluster.

> **Correction (2026-09-29, later the same day):** this entry originally also claimed the
> intermittent "2 files failed, 29 skipped" run was the DNS lookup timing out. That was not
> established — it recurred once with the database fully isolated. See ISSUE-013.

## ISSUE-009: Favicon is faint on white browser tabs
**Status**: Accepted Risk
**Severity**: Low
**Discovered**: 2026-09-29
**Symptom**: In light-mode browsers the pale-yellow half of the "AK" favicon is hard to see.
**Root Cause**: The favicon is gold on a transparent background, as requested. Pale yellow on
white has very little contrast.
**Workaround**: Dark and coloured tabs render it well.
**Fix**: If it matters, build the favicon on the brand charcoal like `apple-touch-icon.png`
— a one-line change to the `clear` background in `scripts/build-logo.mjs`.
**Regression Test**: N/A.

## ISSUE-010: The brochure PDF still carries the old branding
**Status**: Open
**Severity**: Medium
**Discovered**: 2026-09-29
**Symptom**: `/ak-sales-brochure.pdf` downloads under the new name, but its pages still say
"Anna Kitchen Equipments".
**Root Cause**: The file was renamed during the rebrand; its contents are a designed PDF that
cannot be edited here.
**Workaround**: None.
**Fix**: Get a rebranded brochure from whoever designed it. **Publish it under a new filename**
(e.g. `ak-sales-brochure-2026.pdf`) and update the six links — overwriting in place would
serve the old PDF to returning visitors for up to 30 days (`public/` cache TTL).
**Regression Test**: N/A.

## ISSUE-011: Email address and Instagram handle still use the old name
**Status**: Accepted Risk
**Severity**: Low
**Discovered**: 2026-09-29
**Symptom**: `annaskitchenequipment@gmail.com` (6 places) and Instagram
`annas_kitchen_equipments` (3 places) still show "anna".
**Root Cause**: Owner's decision — no AK Sales email or Instagram exists yet, and customer
messages must keep arriving.
**Workaround**: None needed.
**Fix**: When new handles exist, replace them and remove `KEPT_CONTACT_HANDLES` from
`src/branding.test.js` so the guard covers them too.
**Regression Test**: `src/branding.test.js` (allows exactly these two, nothing else).

## ISSUE-012: One database field still says "Anna's Kitchen Equipments"
**Status**: Open — fix written, awaiting a run against production
**Severity**: Low
**Discovered**: 2026-09-29
**Symptom**: The live Bakery Products page description reads "At Anna's Kitchen Equipments,
We Provide…". Everything else on the site says AK Sales.
**Root Cause**: Category text lives in MongoDB, which the code rebrand cannot reach. The
bundled fallback in `src/data/productsData.js` *is* updated, which is why local builds look
right.
**Workaround**: None.
**Fix**: `scripts/rebrand-db.mongosh.js` — dry run by default, `APPLY = true` to save. Checked
against the live API: exactly one change, idempotent, leaves the kept email alone.
**Regression Test**: None automated (needs the live database).

## ISSUE-013: Server test files occasionally fail during setup
**Status**: Open — cause unconfirmed
**Severity**: Low
**Discovered**: 2026-09-29
**Symptom**: Rarely, `npm test` reports `server/server.test.js` and
`server/auth-routes.test.js` failed at file level with all ~30 of their tests skipped.
Everything else passes, and an immediate re-run is green.
**Root Cause**: Unknown. Seen twice in ~15 runs, both times on the first run after a pause.
It is **not** the database (it recurred with `MONGODB_URI` forced empty). The best remaining
guess is a cold start — antivirus scanning freshly built files — pushing the shared
`beforeAll` (import the server, listen) past Vitest's 10 s hook limit, but a warm import
takes ~0.7 s, so that needs a ~13x slowdown and is unproven.
**Workaround**: Re-run.
**Fix**: Not attempted — raising the timeout without evidence would hide the real cause.
**Next time it happens:** run `npx vitest run server/ --reporter=verbose` immediately and keep
the full output; the hook's error text is what has been missing.
**Regression Test**: N/A.
