# Changelog

## 2026-10-27 — Catalogue editing with SEO fields, slug URLs and built-in blog import
**What**: Products and categories can now be edited in the admin with SEO fields; every product moved to a clean slug URL with automatic 301s; the four built-in blog posts can be imported into MongoDB so they become editable.
**Why**: The owner asked for custom slugs and SEO fields when adding products, an edit option for existing products, and editing of previously uploaded blogs. Production had 0 blogs in MongoDB (public posts are bundled code) and every product page shared one templated paragraph.
**Impact**: All product URLs change from encoded names to slugs (owner's decision); old name URLs, old slugs and moved products 301 once to the new URL (old-domain links take two hops). Product delete is now by slug instead of index. `/api/products` and the SSR snapshot carry richer product/category data. New admin-only routes: PUT/DELETE `/api/products/:category/:slug`, PUT `/api/products/categories/:category`, POST `/api/products/images`, POST `/api/blogs/import-bundled`. No prices or offers anywhere.
**Files Changed**: server/models/Product.js, server/catalogue-input.js (new), server/uploads.js (new), server/routes/products.js, server/routes/blogs.js, server/blog-input.js (exports), server/web.js, server/content.js; src/lib/catalogue.js (new), product-seo-check.js (new), seo.js; src/pages/CollectionPage.jsx, ProductDetailPage.jsx, AdminDashboard.jsx; src/components/admin/ProductEditor.jsx, CategoryEditor.jsx, FormParts.jsx, form-helpers.js (new), SeoPanel.jsx, BlogEditor.jsx; src/api/products.js, blogs.js; tests below; knowledge-base catalogue.md (new), README, decisions, seo, security, blog, testing, known-issues, active-context.
**Tests**: New server/catalogue-input.test.js, server/products-routes.test.js, src/lib/product-seo-check.test.js, src/api/products.test.js, src/pages/ProductDetailPage.test.jsx, src/pages/CollectionPage.test.jsx, src/components/admin/admin-editors.test.jsx; updated server/content.test.js, server/auth-routes.test.js, src/lib/seo.test.js, server/seo.test.js (name-URL expectations deliberately changed to slug canonicals + 301s), src/api/blogs.test.js. Final `npm test`: both builds pass, 455/455 across 29 files; one run had a server/seo.test.js setup failure (ISSUE-013), two immediate re-runs green. Lint 0 errors, 1 pre-existing warning. Browser check (local, no database): legacy URLs 301 in one hop with query kept, slug canonical and Product schema, collection links use slugs, sitemap has no name URLs, product page at 375px has no overflow, product/category editors open prefilled, slug change shows the redirect note, save failure is shown inline. Not verified: Cloudinary uploads, Atlas writes and the blog import against the real database.
**Commit**: On main, pushed to github.com/shivanshu407/anna-sKitchen (see git log); not deployed.

- Built by three parallel agents (server, public pages/SEO, admin) against a pinned contract (`src/lib/catalogue.js`); integrator switched category saves from JSON to multipart to avoid the 100 KB `express.json()` limit.
- Unedited products keep the old templated paragraph so no page loses text; the dead "Read more" button was removed.

## 2026-10-27 — SEO/AEO-ready blog editor, drafts and editing
**What**: Replaced the single-textarea blog form with a TipTap visual editor, SEO fields, a live SEO checklist, drafts, full preview and editing of published posts; public blog pages and metadata now render structured content.
**Why**: Posts could not have subheadings, lists, links, tables, inline images, alt text, meta title/description, summaries, FAQs or update dates, so they were weak for search engines and AI answer engines.
**Impact**: New blog fields in MongoDB (additive; documents without `status` stay published). New routes PUT /api/blogs/:slug, POST /api/blogs/images, GET /api/blogs?drafts=1 (admin). Drafts are hidden from the API, SSR, metadata and sitemap. Published slugs are immutable. Editing a legacy post converts its sections to the new body. Five exact-pinned @tiptap packages (3.32.0) load only in the admin chunk.
**Files Changed**: server/models/Blog.js, server/blog-input.js (new), server/routes/blogs.js, server/web.js; src/lib/blog-content.js, blog-seo-check.js (new), seo.js; src/components/BlogContent.jsx, BlogArticle.jsx (new), SEO.jsx, BlogSection.jsx; src/components/admin/BlogEditor.jsx, RichTextEditor.jsx, SeoPanel.jsx (new); src/pages/BlogPage.jsx, BlogsListPage.jsx, AdminDashboard.jsx; src/api/blogs.js; package.json/package-lock.json; tests listed below; knowledge-base blog.md (new), README, decisions, seo, security, testing, known-issues, active-context.
**Tests**: New server/blog-input.test.js, server/blogs-routes.test.js, src/lib/blog-content.test.js, src/lib/blog-seo-check.test.js, src/components/BlogContent.test.jsx, src/components/BlogArticle.test.jsx, src/api/blogs.test.js; extended src/lib/seo.test.js and server/auth-routes.test.js. Final `npm test`: both builds pass, 341/341 tests across 22 files (one run hit the ISSUE-013 setup flake; immediate re-run green). Lint: 0 errors, 1 pre-existing warning. Browser check on a local no-database server: editor toolbar (H2, link dialog, table), live checklist, publish blocking, preview, inline save error, legacy post SSR (one H1, heading ids, TOC, schema) and 375px layout with no overflow. Not verified: Cloudinary uploads and real Atlas saves.
**Commit**: On branch `blog-seo-editor` (together with the previously uncommitted 2026-10-02 SEO release work); not merged to main or pushed.

- Research basis: Google Article structured data (recommended author.url, dateModified, ISO dates), Google image SEO (alt, captions, filenames, srcset), Google's May 2026 FAQ rich-result removal, and AEO practice (answer-first summary, self-contained sections, question headings, tables/lists).
- Built in parallel by three agents with disjoint file ownership, then integrated. Browser verification found the editor stuck on "Loading editor" (TipTap useEditorState snapshot taken before the editor exists); fixed by reading editor state directly until the first transaction. No automated regression test: the project has no DOM test library.
- npm audit reports 26 vulnerabilities, all in pre-existing packages; none in @tiptap/* or prosemirror.

## 2026-10-02 — Activate old-domain redirects after owner deployment
**What**: Connected a redirect-only Hostinger website for annakitchenequipment.com and installed path/query-preserving permanent redirects to https://aksales.in.
**Why**: Owner deployed the new site; changing the old app's domain left the old domain parked and unable to redirect existing links.
**Impact**: Old apex/www HTTP/HTTPS URLs now return one-hop 301s to the same path/query on the new HTTPS apex. Old TLS remains active. The new app is unchanged; the old empty site exists solely for redirects on the existing plan.
**Files Changed**: Remote old-domain public_html/.htaccess; local deploy/htaccess-old-domain-redirect; knowledge-base/README.md, deployment.md, active-context.md, known-issues.md, decisions.md and changelog.md. Live evidence saved under output/seo (gitignored).
**Tests**: Live 20/20 exact 301/Location checks pass, including encoded products and edge characters; four destination pages return 200. New site health connected, XML sitemap, text robots, missing-page 404 and www normalization verified. No automated unit test added because only remote hosting configuration changed; real HTTP checks verify the actual LiteSpeed behavior. Full app suite not rerun because no application logic changed; previous 160/160 result remains the last app suite result.
**Commit**: Not committed or pushed.

- New deployment confirmed in hPanel as aksales-hostinger-2026-10-02-final.zip Completed/Current; owner performed that deployment.
- Hostinger connected the old domain using its existing nameservers. The old SSL certificate remains active; its redundant Force HTTPS hop was removed so the redirect goes directly to the new HTTPS site.
- Replaced the conflicting hPanel basic redirect with .htaccess; the basic rule discarded HTTP page paths. Raw THE_REQUEST capture preserves encoded paths where REQUEST_URI/NE produced spaces on this host.
- Configuration persistence verified by reloading the file editor. Screenshot and full live response matrix saved; no credentials recorded.

## 2026-10-02 — AK Sales domain migration technical SEO release
**What**: Implemented server-rendered public pages, shared metadata/crawler endpoints and responsive assets for https://aksales.in; prepared the Hostinger upload package.
**Why**: The new domain was parked, live metadata named the old brand/city, crawler endpoints returned SPA HTML, and client-only pages had incomplete initial crawl content.
**Impact**: Hosting must run Node with both dist and dist-server. Missing routes return 404; admin/empty collections are noindex; URL normalization uses 301. Public content shares a cached database snapshot. Old-domain redirects remain in hPanel and are not yet active.
**Files Changed**: src/lib/seo.js and tests; SEO, SiteDataProvider, Image, Header, Hero, public data pages and image consumers; src/entry-server.jsx, main.jsx and tests, App.jsx, blogsData.js, index.css, branding.test.js; server/content.js, web.js, index.js, routes/products.js and tests; scripts/build-seo-assets.mjs and tests; image manifest, responsive assets and licensed fonts; index.html, package.json, vite.config.js, eslint.config.js, .gitignore; task-relevant knowledge-base files including rendering.md.
**Tests**: Final npm test 160/160 pass (15 files), both Vite builds pass. New focused hydration/carousel tests 7/7 pass. Fresh upload extraction npm ci/build pass. Full lint: 1 pre-existing error and 1 warning (ISSUE-004). Browser hydration/navigation, loaded fonts and 390px overflow checks pass. Final local mobile Lighthouse: SEO 100, best practices 100, accessibility 93, performance 77, FCP 2.0s, LCP 5.1s, TBT 200ms, CLS 0; prior optimized run performance 79. Full suite was required because rendering and catalogue sharing affect all public routes. No live deployment/Atlas writes or field Core Web Vitals verified.
**Commit**: Not committed or pushed.

- Canonicals, social metadata, factual business/product/article/breadcrumb schema and dynamic sitemap use the new HTTPS apex. Legacy URL paths are retained; prices/reviews/dates are not invented.
- Source fixes address duplicate descriptions, repeated initial catalogue fetching, false route 200s, crawler HTML responses and encoded product-name decoding. Database outage semantics preserve known content and use retryable 503s where appropriate.
- Additive responsive pipeline generated 331 variants for 98 manifest images; all 201 original files retained hashes. Fonts are self-hosted with licenses; below-fold images lazy-load and logo animation pauses offscreen/for reduced motion. Hero controls remain manual to avoid replacing LCP during loading.
- Intermittent setup failures captured as 10-second hook timeouts (ISSUE-013); final full run green without weakened assertions/timeouts.
- Release package: output/aksales-hostinger-2026-10-02-final.zip. hPanel access and app-specific DNS target remain the deployment blocker. Source fixes are not claims that the live site has changed.
- Fresh package runtime smoke passed: homepage/product/robots 200, real missing page 404,
  valid XML sitemap with 79 fallback routes and single title per tested page. ZIP SHA256:
  27e7d98aa8d78a7bb96b85ae02778a1ecbaa7b57046fa07e36a3afcbcb2de6f4.

## 2026-10-01 — Knowledge base audit
**What**: Brought the knowledge base back in line with the code, the remote and production.
**Why**: Owner request. Production, the database and two owner commits had moved on without
documentation.
**Impact**: Documentation only.
**Files Changed**: all of `knowledge-base/`; `seo.md` is **new**.
**Tests**: None — documentation only. Facts were re-checked instead: 88/88 tests, lint 4
problems, live API, live titles, both domains, and two SEO behaviours in a browser.
**Commit**: see this commit

- Production is at `6ade621` (AK logo + Analytics live); the rebrand `a55833b` is not deployed.
- aksales.in is a Hostinger parking page; the domain move has not started.
- ISSUE-007 marked resolved (it was fixed on 2026-09-07 but never closed). ISSUE-012 still open.
- New: ISSUE-014 (duplicate description tags), ISSUE-015 (unused `helmet` dependency).
- Added missing entries below for the owner's two commits, the Node version fix, the
  database image migration and the 2026-09-07 follow-ups.

## 2026-09-29 — Rebrand to AK Sales (Surat) ahead of the move to aksales.in
**What**: Every visible mention of "Anna Kitchen" in the site now says "AK Sales"; the search
title and description name Surat; the brochure is renamed.
**Why**: The business was renamed to match the new logo and is moving to aksales.in.
**Impact**: Visible copy changes on every page, plus browser-tab titles and search snippets.
WhatsApp enquiries now open with "Hi AK Sales". The brochure URL changed to
`/ak-sales-brochure.pdf`.
**Files Changed**: `index.html`; 20 files under `src/` (46 replacements); `src/pages/Home.jsx`
(SEO title/description); `public/ak-sales-brochure.pdf` (renamed);
`scripts/rebrand-db.mongosh.js` and `src/branding.test.js` (**new**); knowledge base.
**Tests**: `src/branding.test.js` — 4 tests: no old name anywhere in shipped code (bar the two
kept contact handles), title names AK Sales and Surat, no Lucknow in `<head>`, homepage SEO
title is descriptive. Its detector was checked against all eight old spellings and against the
kept handles. 88/88 passing, repeated runs.
**Commit**: `a55833b`

- Replacement was ordered longest-phrasing-first and case-sensitive, then every changed line
  reviewed; the diff is exactly 52 lines with no line-ending noise.
- Fixed a grammar error in passing: "Anna's Kitchen Equipment's is a premier provider" became
  "AK Sales is a premier provider".
- Browser-verified 11 pages (home, about, services, projects, contact, collections, a category,
  a product, blog list, a blog post, admin login): zero old-brand mentions, no Lucknow, correct
  tab titles.
- The live Bakery Products description is in MongoDB and still says the old name until
  `scripts/rebrand-db.mongosh.js` is run (ISSUE-012).
- Also recorded ISSUE-013 and corrected an earlier changelog/known-issues claim that the
  intermittent server-test failure was a DNS timeout — that was not established.

## 2026-09-29 — Stop the test suite reaching the production database (ISSUE-008)
**What**: Tests now run with the database and Cloudinary variables forced empty.
**Why**: The suite was connecting to the production MongoDB cluster, and one test sends an
authenticated `DELETE` for a real product.
**Impact**: `npm test` can no longer touch real services regardless of what is in `.env`.
**Files Changed**: `vitest.config.js`, `server/server.test.js`, `server/auth-routes.test.js`,
`knowledge-base/testing.md`, `knowledge-base/known-issues.md`
**Tests**: New "test isolation" guard. 84/84 passing on three consecutive runs, with zero
contact with the production cluster.
**Commit**: `6ade621` (rebased from `02648a5`)

- Caused by `delete process.env.MONGODB_URI` in the tests plus a real `.env`: dotenv refills
  deleted variables. Setting `''` instead holds, because dotenv never overwrites.
- Never actually fired: the sandbox running the tests blocks DNS. Production was checked and
  is intact.
- ~~Also explains the intermittent "29 skipped" run — it was the DNS lookup timing out.~~
  **Corrected later the same day:** not established; it recurred with the database isolated
  (ISSUE-013).

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
**Commit**: `6ade621` (rebased from `02648a5`)

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

## 2026-09-10 — Google Analytics (by MBKANERIYA)
**What**: Added the Google Analytics 4 gtag.js snippet to `index.html`.
**Why**: Traffic reporting.
**Impact**: Every page loads `googletagmanager.com/gtag/js?id=G-EZE8DTQTEB`. Was not deployed
until the production redeploy after 2026-09-29, so Analytics recorded nothing before that.
**Files Changed**: `index.html`
**Tests**: None added. Verified 2026-09-29 that the tag survives alongside the favicon links.
**Commit**: `123241e`

- Logged retrospectively on 2026-10-01; the commit came in without a knowledge-base entry.

## 2026-09-08 — SEO metadata and Google site verification (by MBKANERIYA)
**What**: Added `src/components/SEO.jsx` (`react-helmet-async`), per-page titles and
descriptions, and a `google-site-verification` meta tag.
**Why**: Search visibility and Search Console ownership.
**Impact**: Page titles now change per route. Added dependencies `react-helmet-async` and
`helmet` (the latter unused — ISSUE-015). Removed two unused `index` parameters, taking lint
from 6 to 4 problems. Wrapped the app in `HelmetProvider` (`src/main.jsx`).
**Files Changed**: `index.html`, `package.json`, `package-lock.json`, `src/components/SEO.jsx`,
`src/main.jsx`, `src/pages/AdminDashboard.jsx`, `BlogPage.jsx`, `BlogsListPage.jsx`,
`CollectionPage.jsx`, `Collections.jsx`, `Home.jsx`
**Tests**: None added.
**Commit**: `fe39aa1`

- Logged retrospectively on 2026-10-01. See seo.md for how it behaves (ISSUE-014).

## 2026-09-07 — Database image path migration (ISSUE-007)
**What**: Scripts to rewrite stored image paths in MongoDB after the asset rename.
**Why**: Every product image was broken on the live site; the database still held the
pre-rename paths.
**Impact**: Data only, no deploy needed.
**Files Changed**: `scripts/migrate-image-paths.mjs`, `scripts/fix-image-paths.mongosh.js`
(**new**), `package.json` (`db:fix-image-paths`), `.gitignore` (`backups/`)
**Tests**: No automated test (needs the live database). The mongosh rule was checked against
all 61 live paths: 0 disagreements with `asset-map.json`, idempotent.
**Commit**: `f704c1b`, `859a89c`

- Run by the coworker with Atlas access the same day; 61/61 images verified loading.

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
**Commit**: `cfcea8b`

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
**Commit**: `af2c3fe`

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

## 2026-09-07 — Require Node 20.19+ for deployment
**What**: `engines.node` set to `>=20.19.0`; `.nvmrc` and `.node-version` pin 22.
**Why**: The first Hostinger deploy ran Node 18 and the build died: Vite needs 20.19+. The
error surfaced as a misleading `@tailwindcss/oxide` "Cannot find native binding".
**Impact**: Deploy platforms now pick a supported runtime.
**Files Changed**: `package.json`, `package-lock.json`, `.nvmrc`, `.node-version`
**Tests**: Full suite green; build verified.
**Commit**: `5fcee88`

- The earlier `engines.node: ">=18"` was simply wrong and is what let Hostinger choose 18.
- The lockfile was checked and ruled out: it already carried the Linux native binaries.

## 2026-09-07 — Deployment follow-ups
**What**: Hosting tests fail loudly instead of skipping; zip bundles ignored by git; zip
upload documented.
**Why**: A run under filesystem contention skipped eight hosting tests silently. The upload
zip once shipped without `src/api/` because an exclude matched at every depth.
**Impact**: `npm test` without a build now fails with an explicit message.
**Files Changed**: `server/server.test.js`, `.gitignore`, `knowledge-base/deployment.md`,
`knowledge-base/testing.md`
**Tests**: 21/21 at the time.
**Commit**: `b9038b0`, `f790844`, `523ec93`

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
