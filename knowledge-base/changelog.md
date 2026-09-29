# Changelog

## 2026-09-29 — Stop the test suite reaching the production database (ISSUE-008)
**What**: Tests now run with the database and Cloudinary variables forced empty.
**Why**: The suite was connecting to the production MongoDB cluster, and one test sends an
authenticated `DELETE` for a real product.
**Impact**: `npm test` can no longer touch real services regardless of what is in `.env`.
**Files Changed**: `vitest.config.js`, `server/server.test.js`, `server/auth-routes.test.js`,
`knowledge-base/testing.md`, `knowledge-base/known-issues.md`
**Tests**: New "test isolation" guard. 84/84 passing on three consecutive runs, with zero
contact with the production cluster.
**Commit**: see `git log`

- Caused by `delete process.env.MONGODB_URI` in the tests plus a real `.env`: dotenv refills
  deleted variables. Setting `''` instead holds, because dotenv never overwrites.
- Never actually fired: the sandbox running the tests blocks DNS. Production was checked and
  is intact.
- Also explains the intermittent "29 skipped" run — it was the DNS lookup timing out.

## 2026-09-29 — AK Sales logo and favicons
**What**: Replaced the site logo with the new AK Sales artwork (background removed) and
generated favicons from it.
**Why**: Requested by the owner.
**Impact**: New header logo on every page. Browser tabs, bookmarks and iOS home-screen icons
change. The old `/images/logo.png` no longer exists.
**Files Changed**:
- `brand/ak-sales-logo-source.jpg`, `scripts/build-logo.mjs`, `scripts/build-logo.test.mjs` — **new**
- `public/images/ak-sales-logo.png`, `public/favicon-32.png`, `public/favicon-192.png`,
  `public/apple-touch-icon.png` — **new**, generated
- `public/images/logo.png` — removed (unused; in git history and `public-original/`)
- `index.html` — three icon links replace one
- `src/components/Header.jsx`, `EquipmentRange.jsx`, `src/pages/Collections.jsx`,
  `AdminDashboard.jsx` — logo path
- `scripts/optimize-assets.mjs` — `KEEP_FORMAT` lists the new brand files
- `server/server.test.js` — asset path updated, favicon regression test added
**Tests**: 8 new tests for background removal and band detection, plus a test that every
favicon link in the built page is absolute and resolves to a real PNG. 84/84 passing.
**Commit**: see `git log`

- New filenames rather than overwriting: `/images/*` is cached for 30 days.
- Background removed by deriving alpha from the red channel and un-mixing edge pixels, so
  edges stay gold rather than carrying a dark halo. Checked visually on the header teal, on
  white, and at 3x zoom on an edge.
- Favicon uses the "AK" mark only; "SALES" is illegible at 32 px. Faint on white tabs
  (ISSUE-009).
- Verified in a browser: the header renders the new logo; all three icon links return
  `200 image/png`.
- The site's name, title and alt text still say "Anna Kitchen Equipments" — only the image
  was changed.

## 2026-09-07 — Make the public forms actually send (ISSUE-006)
**What**: All six public forms now hand off to WhatsApp with the enquiry pre-filled. The
five duplicated "Get Quote" bars became one `QuoteBar` component.
**Why**: Every form on the site was dead markup — no submit handler, so clicking reloaded
the page and discarded the enquiry while appearing to succeed. Every lead submitted through
them was lost.
**Impact**: Enquiries now reach the business. Nothing is stored server-side by design, so a
customer who does not press send in WhatsApp is still not recorded.
**Files Changed**:
- `src/lib/whatsapp.js`, `src/lib/whatsapp.test.js`, `src/components/QuoteBar.jsx` — **new**
- `src/pages/AboutPage.jsx`, `ProjectsPage.jsx`, `ServicesPage.jsx`,
  `ProductDetailPage.jsx` — inline quote bar replaced with `<QuoteBar />`
- `src/pages/ContactPage.jsx` — quote bar replaced; long form made controlled and wired
- `knowledge-base/forms.md` — **new**
**Tests**: 14 new (74 total, all passing). Lint unchanged at 6 pre-existing problems.
**Commit**: see `git log`

- Chosen destination was WhatsApp, which matches how the business already operates — the
  site links to `wa.me` in several places already.
- The five quote bars were confirmed byte-identical by checksum before extraction, so the
  refactor changed no rendering.
- Name and contact number are required; other fields are optional and omitted from the
  message when blank.
- An untouched `<select>` still reports its placeholder option, so `-- Select Range --` is
  explicitly treated as empty rather than sent as a real choice.
- Values are percent-encoded, so `&`, `#` and `?` in a customer's text cannot break the URL.
- If a popup blocker stops the new tab, it falls back to the current tab — silently doing
  nothing would recreate the very bug being fixed.
- Removed the decorative "✓ Enter Own Code" label, which did nothing, and relabelled the
  button "Send on WhatsApp" so the behaviour is not a surprise.
- Browser-verified on `/contact` and `/services`: correct message produced, empty submit
  blocked with an inline error, and no page reload.

## 2026-09-07 — Real admin authentication
**What**: Replaced the fake client-side login with server-side sessions and locked down
every mutating API route.
**Why**: ISSUE-001. Credentials (`admin`/`admin123`) were compared in browser JavaScript
and shipped in the bundle, `/admin/dashboard` had no guard, and the mutating API routes had
no authentication at all — anyone could delete the whole catalogue with curl.
**Impact**: The admin area now requires three new environment variables. **Without them the
admin API fails closed (503) and nobody can log in**; the public site is unaffected.
Generate them with `npm run admin:password`.
**Files Changed**:
- `server/auth.js`, `server/routes/auth.js` — **new**
- `server/routes/products.js`, `server/routes/blogs.js` — `requireAuth` on POST and DELETE
- `server/index.js` — cookie-parser, auth routes, CORS narrowed to development only
- `src/api/auth.js`, `src/components/RequireAuth.jsx` — **new**
- `src/pages/AdminLoginPage.jsx` — real login call, inline errors, submitting state
- `src/pages/AdminDashboard.jsx` — sign-out control
- `src/App.jsx` — dashboard wrapped in `RequireAuth`
- `scripts/hash-password.mjs` — **new**
- `.env.example`, `package.json` (`admin:password`, `cookie-parser`)
- `knowledge-base/security.md` — **new**
**Tests**: 39 new (60 total, all passing) across `server/auth.test.js` and
`server/auth-routes.test.js`. Lint unchanged at 6 pre-existing problems.
**Commit**: see `git log`

- Session is an HMAC-signed token in an httpOnly, SameSite=Strict cookie. httpOnly means an
  XSS bug cannot read it; SameSite=Strict blocks CSRF without a separate token.
- Fixed algorithm, never read from the token, so JWT algorithm-confusion does not apply.
- Password stored only as a scrypt hash; plaintext exists nowhere.
- `requireAuth` is registered before multer, so an unauthenticated upload is refused before
  the file is buffered into memory.
- Fails closed: a missing or too-short `SESSION_SECRET` refuses writes rather than allowing
  them. There is an explicit regression test asserting 503 and not 200.
- Login returns an identical message for a wrong username and a wrong password, and runs the
  password check either way, so neither text nor timing leaks which was wrong.
- Verified manually in a browser: direct navigation to `/admin/dashboard` redirects to
  login; the old `admin123` is rejected; a correct login reaches the dashboard with the
  cookie invisible to `document.cookie`; sign-out returns to login and stays there.
- Removed the decorative "Remember me" checkbox and dead "Forgot password?" link — a
  password-reset link that goes nowhere is worse than none.

### Also found, not fixed
Every contact and quote form on the public site is inert (ISSUE-006): six forms with no
submit handler, whose submit buttons trigger a native page reload that discards the
enquiry. Reported rather than fixed because it needs a decision on where submissions
should go.

## 2026-09-07 — Migrate from Vercel to Hostinger + optimise assets
**What**: Restructured the app to run as a single Hostinger Node.js process serving both
the API and the SPA, cut `public/` from 128.4 MB to 23.6 MB, and added a test suite.
**Why**: The project was staged on Vercel, whose `vercel.json` rewrites and serverless
model have no Hostinger equivalent. Hostinger runs a long-lived Node process instead.
**Impact**: Wide.
- Every static asset URL changed (WebP + slugified names). Old URLs are dead.
- `server/index.js` no longer calls `listen()`; `server.js` does. A second `listen()` will
  now cause `EADDRINUSE`.
- API route order is load-bearing: anything added after the `GET *` fallback is unreachable.
- `npm test` now runs a build first, so it takes ~9 s.
**Files Changed**:
- `server/index.js` — serves `dist/` with tiered cache headers, SPA fallback, JSON 404 for
  unknown `/api/*`, compression, `trust proxy`, fail-fast Mongoose; `listen()` removed;
  dotenv also reads the legacy `server/.env`
- `server.js` — **new**, production entry point with graceful shutdown
- `vite.config.js` — vendor chunk splitting, no sourcemaps, es2020 target
- `vitest.config.js`, `.env.example`, `deploy/htaccess-static-fallback` — **new**
- `eslint.config.js` — Node globals for `server/`, `api/`, root tooling and tests
- `package.json` — `start`/`test`/`pretest`/`optimize:images` scripts, `engines`,
  `compression` dependency, `sharp` + `vitest` devDependencies
- `index.html` — favicon path made absolute and `type` corrected
- `src/api/http.js` — **new**, 5 s read timeout helper
- `src/api/products.js`, `src/api/blogs.js` — reads use the timeout; writes unchanged
- `scripts/` — `slugify.mjs`, `optimize-assets.mjs`, `rewrite-asset-refs.mjs`,
  `audit-assets.mjs`, `asset-map.json` (**all new**)
- 12 source files — 96 asset references rewritten
- `public/` — 99 assets regenerated; originals moved to `public-original/`
- `.gitignore` — `.env`, `public-original`, `public-optimized`
- `knowledge-base/` — **new**, this documentation
**Tests**: Vitest introduced (21 tests, all passing) across `scripts/slugify.test.mjs`,
`src/api/http.test.js`, `server/server.test.js`. `npm run lint` goes from 66 problems to 6,
all pre-existing (ISSUE-004). Production build succeeds.
**Commit**: `79ec518` on branch `hostinger-migration`; PR #1 into `main`

- Images alone went from ~111 MB to ~6.9 MB (-94%); largest single file 3.9 MB -> 183 KB.
- Bundle split from one 403 KB chunk into react 192 KB / app 153 KB / router 36 KB /
  icons 22 KB, so a content edit no longer invalidates React for returning visitors.
- Filenames normalised to lowercase-hyphenated ASCII. This was a latent production bug:
  `clients/Logo.webp` resolves on Windows and 404s on Hostinger's Linux filesystem.
- Fixed the favicon: it used a relative `href`, so on `/collections/x` the browser
  requested `/collections/images/logo.png` and 404'd. Also declared `image/svg+xml` for
  a PNG.
- Fixed a bug where an unknown `/api/*` path returned `index.html` with a 200 instead of a
  JSON 404, which would surface as an opaque JSON parse error in the client.
- Cut degraded-mode latency from 10.1 s to 5.0 s when MongoDB is unreachable — the expected
  state on first deploy until Atlas allow-lists the Hostinger IP.
- Verified manually in-browser: home, collections list, collection detail, product detail
  and blogs all render with zero 404s across 96 asset requests, with the API deliberately
  failing so the fallback path was the one exercised.

### Fixed during the session
- **Case-insensitive filesystem collision.** The first optimiser converted in place and
  crashed writing `clients/logo.webp` while reading `clients/Logo.webp`. Recovered with no
  data loss (all 13 processed originals had been backed up first), then reworked to build
  into `public-optimized/` and swap. See decisions.md.
- **`mongoose.set('bufferTimeoutMS')` placed inside an `else`**, so it only applied when
  `MONGODB_URI` was set — exactly the case where it was not needed. Caught by measuring the
  timing rather than assuming; moved to run unconditionally.
- **`slugPath` mangled uppercase extensions** (`Photo.JPEG` -> `photo-jpeg.jpeg`) because
  `basename(file, ext)` matches case-sensitively. Found by the new unit test. No shipped
  asset was affected — every original extension was already lowercase.
