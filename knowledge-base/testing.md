# Testing

## Test Frameworks in Use
- **Vitest 5** — the only test runner. Introduced 2026-09-07; there were no tests before.
- Tests use Node, server rendering and explicit fakes; no DOM testing library is installed.
  Browser interactions are additionally verified with an isolated Playwright session.

## How to Run Tests
| Command             | What it runs                                            |
|---------------------|---------------------------------------------------------|
| `npm test`          | Client + SSR builds (via `pretest`), then the full suite |
| `npm run test:watch`| Vitest in watch mode — **does not build first**         |
| `npx vitest run <file>` | A single file                                       |

`pretest` runs both Vite builds because server tests assert against the real
`dist/` and `dist-server/` output — hashed assets, cache headers, rendered HTML and metadata. Without a
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

Additional coverage as of 2026-10-02:

| File | Covers |
|---|---|
| src/lib/seo.test.js | Metadata, schema, URL safety, dates and sitemap |
| server/seo.test.js | Real SSR responses, all sitemap routes, redirects, errors/noindex, outage handling |
| server/content.test.js | Shared catalogue transformation and cached snapshots |
| src/components/Image.test.jsx | Responsive image markup and explicit overrides |
| scripts/build-seo-assets.test.mjs | Additive generation, dimensions, source preservation and variants |
| src/lib/auto-scroll.test.js | Offscreen/hover/reduced-motion pause and cleanup |
| src/main.test.jsx | Paint before production hydration; immediate development rendering |

Added 2026-10-27 for the blog editor (see blog.md):

| File | Covers |
|---|---|
| server/blog-input.test.js | Body allowlist, link/image URL rules, caps, post fields, draft/publish validation |
| server/blogs-routes.test.js | Authenticated blog routes with `Blog` and Cloudinary stubbed via `createRequire` + `vi.spyOn` (same CJS instance the routes use) |
| src/lib/blog-content.test.js | Legacy conversion, text/word counts, heading ids, SEO fallbacks, Cloudinary srcset |
| src/lib/blog-seo-check.test.js | Every `analyzePost` rule |
| src/components/BlogContent.test.jsx, BlogArticle.test.jsx | Rendered article markup via `renderToString` |
| src/api/blogs.test.js | FormData shape, endpoints, error surfacing |

Components rendered in tests need `import React from 'react'` (classic JSX transform in
Vitest). The TipTap editor has no automated test; it is verified in the browser.

341/341 tests pass across 22 files in the final full run (2026-10-27). Both production bundles build.
The 160/160 figure below this line refers to the 2026-10-02 release.

160/160 tests pass across 15 files in the final full run. Both production bundles build.

Discovery globs are in `vitest.config.js`. Note `server/**/*.test.js` is ESM while the rest
of `server/` is CommonJS — `eslint.config.js` has a matching exception.

## What Must Be Tested
- Anything affecting **URLs or filenames** of static assets. A silent rename is a
  site-wide 404 and the build will not catch it.
- The **hosting contract** in `server/index.js`: route ordering, SSR status handling, and the
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
- No database in tests. `server/server.test.js` blanks `MONGODB_URI` before importing the
  app, so Mongoose never connects and `/api/health` reports `db: "disconnected"`.
- The app is imported and started on port `0` (ephemeral). Nothing binds a fixed port, so
  the suite cannot collide with a running dev server.
- `src/api/http.test.js` stubs `globalThis.fetch` with `vi.stubGlobal` and drives the real
  `AbortController`. No network access.

## Known Flaky Tests
- **Server test setup, rarely (ISSUE-013).** Server files occasionally fail at setup
  with their tests skipped; re-run is green. On 2026-10-02 the error was captured as
  `Hook timed out in 10000ms`; the underlying slowdown remains unconfirmed. Capture
  `npx vitest run server/ --reporter=verbose` output before re-running.

Observed once on 2026-09-07: a run during heavy filesystem contention (a `git checkout`
plus `git pull` rewriting ~200 files while Vite rebuilt `dist/`) reported one failed file
and **8 silently skipped** tests. The static-hosting block used
`describe.skipIf(!existsSync(DIST))`, so a missing `dist/` hid the entire hosting contract
behind a mostly-green summary. It now fails with an actionable message instead of skipping.
Three consecutive clean runs passed 21/21 afterwards.

The lesson generalises: never gate a test block on a condition that can silently disable it.

## Not Covered
Cloudinary uploads, real MongoDB writes and the live Hostinger environment are not automated.
Auth already has allowed/denied cases. SSR tests cover page HTML and metadata; they do not
replace browser interaction checks. Local mobile Lighthouse and Playwright results are
recorded in output/seo. These do not prove field Core Web Vitals or the new deployment.
Full lint now reports only the pre-existing AdminDashboard effect dependency warning
(ISSUE-004); the blogs.js unused catch variable was removed in the 2026-10-27 rewrite.
Cloudinary uploads and real MongoDB blog saves are not automated.
