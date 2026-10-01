# Testing

## Test Frameworks in Use
- **Vitest 5** — the only test runner. Introduced 2026-09-07; there were no tests before.
- No browser/DOM testing library yet. Everything currently under test is Node-side, so
  `environment: 'node'` is enough (see `vitest.config.js`). Adding component tests will
  mean adding `jsdom` and `@testing-library/react`.

## How to Run Tests
| Command             | What it runs                                            |
|---------------------|---------------------------------------------------------|
| `npm test`          | `vite build` (via `pretest`), then the full suite       |
| `npm run test:watch`| Vitest in watch mode — **does not build first**         |
| `npx vitest run <file>` | A single file                                       |

`pretest` runs `vite build` because `server/server.test.js` asserts against the real
`dist/` output — hashed asset names, cache headers, the SPA shell, favicon links. Without a
build those tests fail with "dist/ is missing" (they used to skip silently; see changelog).

In watch mode, run `npm run build` once yourself first.

## Test File Conventions
Tests sit next to the code they cover:
| File                            | Covers                                              |
|---------------------------------|-----------------------------------------------------|
| `scripts/slugify.test.mjs`      | Asset filename rules                                |
| `scripts/build-logo.test.mjs`   | Logo background removal and band detection          |
| `src/api/http.test.js`          | `fetchWithTimeout` read-timeout helper              |
| `src/lib/whatsapp.test.js`      | Enquiry message building, encoding, popup fallback  |
| `src/branding.test.js`          | No old name or Lucknow; descriptive titles          |
| `server/server.test.js`         | Hosting contract, favicons, test isolation          |
| `server/auth.test.js`           | Hashing, session tokens, cookie flags, fail-closed  |
| `server/auth-routes.test.js`    | 401s on writes, login flow, forged cookies, 503     |

88 tests as of 2026-10-01.

Discovery globs are in `vitest.config.js`. Note `server/**/*.test.js` is ESM while the rest
of `server/` is CommonJS — `eslint.config.js` has a matching exception.

## What Must Be Tested
- Anything affecting **URLs or filenames** of static assets. A silent rename is a
  site-wide 404 and the build will not catch it.
- The **hosting contract** in `server/index.js`: route ordering, the SPA fallback, and the
  three cache-header classes. These are what break on a new host.
- **Degraded-mode behaviour.** The site must render without a database.
- **Every mutating API route needs an allowed case and a denied case** —
  `server/auth-routes.test.js` holds them; add new routes to its `MUTATIONS` list.
- **Branding:** keep `src/branding.test.js` green; extend `KEPT_CONTACT_HANDLES` only for
  handles the owner has explicitly chosen to keep.

## Mocks, Fakes, and Fixtures
- **Tests must never reach real services.** `vitest.config.js` sets `MONGODB_URI` and the
  Cloudinary variables to empty strings. The server calls dotenv at import, and dotenv fills
  any variable that is *missing* from a local `.env` — but never overwrites one that exists,
  even an empty one.
- **Never `delete process.env.X` for a variable dotenv reads.** Deleting it hands dotenv an
  empty slot to refill from `.env`. Set it to `''` instead. Doing the opposite pointed the
  suite at production and is guarded by the "test isolation" test (ISSUE-008).
- No database in tests. `server/server.test.js` deletes `MONGODB_URI` before importing the
  app, so Mongoose never connects and `/api/health` reports `db: "disconnected"`.
- The app is imported and started on port `0` (ephemeral). Nothing binds a fixed port, so
  the suite cannot collide with a running dev server.
- `src/api/http.test.js` stubs `globalThis.fetch` with `vi.stubGlobal` and drives the real
  `AbortController`. No network access.

## Known Flaky Tests
- **Server test setup, rarely (ISSUE-013).** Both `server/*.test.js` files fail at file level
  with every test skipped; re-run is green. Cause unconfirmed. If it happens, capture
  `npx vitest run server/ --reporter=verbose` output before re-running.

Observed once on 2026-09-07: a run during heavy filesystem contention (a `git checkout`
plus `git pull` rewriting ~200 files while Vite rebuilt `dist/`) reported one failed file
and **8 silently skipped** tests. The static-hosting block used
`describe.skipIf(!existsSync(DIST))`, so a missing `dist/` hid the entire hosting contract
behind a mostly-green summary. It now fails with an actionable message instead of skipping.
Three consecutive clean runs passed 21/21 afterwards.

The lesson generalises: never gate a test block on a condition that can silently disable it.

## Not Covered
Deliberately, as of 2026-09-07: React components and pages, the Cloudinary upload path, the
Mongoose models and routes against a real database, and the live Hostinger environment.
The most valuable next tests are the auth cases from ISSUE-001.
