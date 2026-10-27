# Decisions

## Decision: One Express process serves both the API and the built SPA
**Date**: 2026-09-07
**Status**: Accepted
**Context**: On Vercel, `vercel.json` rewrites split traffic — `/api/*` to a serverless
function, everything else to `index.html`. Hostinger has no equivalent; its Node.js apps
are long-lived processes, and a static-only deployment cannot run Express at all.
**Decision**: `server/index.js` mounts the API routes, then `express.static('dist')`, then a
`GET *` SPA fallback. `server.js` at the project root owns `listen()`.
**Alternatives Considered**:
- *Static front-end on Hostinger + API left on Vercel* — rejected: two hosts to manage, and
  it reintroduces CORS and a cross-origin latency hop for no benefit.
- *Front-end and API as two Hostinger apps* — rejected: needs two domains or a subdomain
  plus CORS, for a site this size.
**Consequences**: One deploy, one domain, no CORS. Route order now matters: anything
registered after the `GET *` handler is unreachable, which is why the explicit `/api` JSON
404 sits between the API routes and the fallback.

## Decision: `listen()` lives in `server.js`, not `server/index.js`
**Date**: 2026-09-07
**Status**: Accepted
**Context**: The original module called `listen()` conditionally on
`NODE_ENV !== 'production'`, inverted for Vercel's serverless model. Hostinger needs the
opposite, and Hostinger does not guarantee `NODE_ENV=production`.
**Decision**: `server/index.js` builds and exports the app and never listens. The root
`server.js` — which is what hPanel's "Entry file" points at — calls `listen(process.env.PORT)`.
**Alternatives Considered**:
- *`require.main === module`* — rejected: it is `undefined` when the CommonJS module is
  loaded through an ESM entry, so it would silently never listen.
- *Gate on `NODE_ENV`* — rejected: depends on an env var Hostinger may not set.
**Consequences**: The app is importable by tests without binding a port, which is what makes
`server/server.test.js` possible. Anyone adding a second `listen()` gets `EADDRINUSE`.

## Decision: Convert raster assets to WebP and slugify every filename
**Date**: 2026-09-07
**Status**: Accepted
**Context**: `public/` was 128.4 MB, with single product PNGs up to 3.9 MB. Filenames
contained spaces, `&`, parentheses, and mixed case.
**Decision**: WebP at quality 82 with per-role max widths, and lowercase hyphenated names.
`images/logo.png` stays PNG as an indexed/palette image. *(Logo part superseded 2026-09-29
by "AK Sales logo — new filenames…" below; `logo.png` no longer exists.)*
**Alternatives Considered**:
- *Lossless PNG compression only* — rejected: ~50-60% saving versus 94% for the images.
- *Keep original filenames, rely on URL encoding* — rejected: it works, but mixed case is a
  live hazard when authoring on Windows and serving from Linux.
- *WebP for the logo too* — rejected on measurement: palette PNG was 34.5 KB, WebP 73 KB.
**Consequences**: 81.6% smaller overall; images alone ~111 MB -> ~6.9 MB. All 96 source
references had to be rewritten. Old asset URLs are dead — acceptable because the site was
only ever on Vercel staging, but it would need redirects if it had been indexed.

## Decision: Build optimised assets into a staging directory, then swap
**Date**: 2026-09-07
**Status**: Accepted
**Context**: The first implementation converted in place. It crashed on
`clients/Logo.webp` -> `clients/logo.webp`: on a case-insensitive Windows filesystem that
is the same file, so sharp was asked to write the file it was reading.
**Decision**: Build the whole tree into `public-optimized/`, verify the file count, then
`rename` `public/` to `public-original/` and `public-optimized/` into place.
**Alternatives Considered**:
- *Temp file per image, renamed over the original* — rejected: still leaves `public/`
  half-converted if the run dies partway, and the leftovers are hard to tell from sources.
**Consequences**: The swap is effectively atomic and originals are never touched. `--apply`
refuses to run when `public-original/` exists, so a second run cannot clobber the backup.
The trade-off is transient disk use for two copies.

## Decision: Read requests time out client-side; writes do not
**Date**: 2026-09-07
**Status**: Accepted
**Context**: With MongoDB unreachable, `/api/products` took 10.1 s to fail and the page sat
on a spinner the whole time. An unreachable Atlas is the expected state on first deploy
until the Hostinger IP is allow-listed.
**Decision**: `src/api/http.js` wraps reads in an `AbortController` with a 5 s cap, and
`mongoose.set('bufferTimeoutMS', 5000)` plus `serverSelectionTimeoutMS: 5000` make the
server fail fast too. Mutations (`addProduct`, `addBlog`, the deletes) keep plain `fetch`.
**Alternatives Considered**:
- *Timeout everything uniformly* — rejected: those mutations upload images to Cloudinary and
  can legitimately exceed 5 s. Aborting a half-finished upload would be worse than waiting.
**Consequences**: A database outage degrades to the bundled catalogue in ~5 s instead of
10+. The duplicate in-flight requests of ISSUE-002 now show as `ERR_ABORTED` in devtools,
which is the timeout working, not a fault.

## Decision: Vitest as the test runner
**Date**: 2026-09-07
**Status**: Accepted
**Context**: The project had no tests and no runner. Migrating hosting changed route
ordering, cache headers, and every asset filename — all things a build cannot verify.
**Decision**: Vitest, because it reuses the existing Vite toolchain and needs no extra
transform config. `pretest` runs `vite build` so server tests assert against a real `dist/`.
**Alternatives Considered**:
- *Jest* — rejected: a second, redundant transform pipeline alongside Vite.
- *Node's built-in test runner* — rejected: would not share the Vite resolution the
  front-end code relies on.
**Consequences**: 21 tests covering the naming rules, the read-timeout helper, and the
hosting contract. `npm test` costs a ~2 s build. This choice found a real bug immediately
(see the extension-case gotcha in assets.md).

## Decision: Keep the Vercel shim and `vercel.json`
**Date**: 2026-09-07
**Status**: Accepted
**Context**: `api/index.js` and `vercel.json` are dead weight on Hostinger.
**Decision**: Leave them. `api/index.js` is two lines and still works, since
`server/index.js` exports the app and no longer self-listens.
**Alternatives Considered**: *Delete both* — rejected as unnecessary and it removes a
working fallback deploy target while the Hostinger plan question (ISSUE-005) is open.
**Consequences**: A little confusion for a newcomer, mitigated by a note in deployment.md.
If Hostinger's framework autodetect misreads the project, `vercel.json` is the first
suspect.

## Decision: AK Sales logo — new filenames, mark-only favicon, built from a script
**Date**: 2026-09-29
**Status**: Accepted
**Context**: The owner supplied a new "AK SALES" logo (gold on charcoal JPEG) to replace
the old one site-wide and as the favicon, with the background removed.
**Decision**: Generate every brand file from one committed source with
`scripts/build-logo.mjs`, under new filenames. The favicon uses the "AK" mark only; the
apple-touch icon keeps the charcoal background.
**Alternatives Considered**:
- *Overwrite `images/logo.png`* — rejected: `/images/*` is cached for 30 days, so returning
  visitors would keep seeing the old logo for up to a month.
- *Full lockup as favicon* — rejected: "SALES" is illegible at 16-32 px.
- *Hard threshold cutout* — rejected: leaves a dark fringe on anti-aliased edges. Alpha is
  derived from the red channel and edge pixels are un-mixed from the background instead.
- *Transparent apple-touch icon* — rejected: iOS fills transparency with black; using the
  source's own charcoal looks deliberate and matches the original artwork.
**Consequences**: The logo is reproducible from the repo. The favicon is faint on white tabs
(ISSUE-009). A new logo later means re-running one script and changing one path.

## Decision: Rebrand to "AK Sales", Surat, domain aksales.in
**Date**: 2026-09-29
**Status**: Accepted
**Context**: After adopting the AK Sales logo the owner renamed the business and bought
aksales.in. The site said "Anna Kitchen" in eight different spellings across ~20 files, and
its search title named the wrong city.
**Decision** (owner's choices, from a structured question):
- Written as **"AK Sales"** in text; the logo keeps its all-caps styling.
- City is **Surat** everywhere. The old title and meta description said Lucknow, contradicting
  the address, map and 35 other mentions.
- **Email and Instagram kept for now** (ISSUE-011) so customer messages keep arriving.
- **Redirect handled in Hostinger**, not in the app.
**Also decided, with reasons:**
- *Ordered, case-sensitive replacement, then line-by-line review* rather than a blind
  find-and-replace — eight spellings would otherwise produce things like "AK Sales's".
  Case-sensitivity is also what keeps the lowercase email and Instagram handle untouched.
- *Home page `<SEO>` title changed from "Home"* to name the product and city. `<SEO>` replaces
  the `index.html` title once React loads, so "Home | AK Sales" is what search engines that
  run JavaScript would index; the Surat title in `index.html` alone would not have reached them.
- *Testimonials updated to the new name.* Same company, renamed; flagged to the owner in case
  the quotes are verbatim and should be left word-for-word.
- *Brochure renamed* to `ak-sales-brochure.pdf` so the downloaded file carries the new name.
  Its contents still show the old brand (ISSUE-010).
- *URLs not changed*, including the `...-lucknow` blog slug (the post itself is about Surat).
  Changing URLs during a domain move only multiplies broken links.
- *Internal identifiers left alone*: package names, the `annakitchen` database, the
  `annas-kitchen/` Cloudinary folder. None are visible to visitors; renaming them risks breakage
  for no user-facing gain.
**Alternatives Considered**: An in-app 301 redirect as a backup to Hostinger's — offered,
declined by the owner.
**Consequences**: A new guard test (`src/branding.test.js`) fails the build if the old name or
Lucknow reappears. One database field and the brochure contents remain on the old brand until
handled outside the codebase.

## Decision: Shared route metadata and native React server rendering
**Date**: 2026-10-02
**Status**: Accepted
**Context**: The domain migration needs real crawler files, route-specific initial HTML,
correct 404s, stable canonical URLs and consistent live catalogue content. The old SPA
returned its shell for crawler endpoints and depended on client-side fetching.
**Decision**: Keep Express, React Router and all existing public URL contracts. Build a
Vite SSR entry alongside the client bundle, use one metadata resolver fixed to aksales.in,
and render from a shared cached catalogue snapshot. React 19 document rendering collects
native hoisted metadata. Successful admin writes invalidate the 60-second snapshot.
**Alternatives Considered**: Metadata-only changes would leave empty initial content and
false 200s. Static prerendering would stale after admin updates. A framework migration
would unnecessarily change the deployment and URL contracts.
**Consequences**: Both dist and dist-server must exist on Hostinger. Public content no
longer needs duplicate initial fetches. Failed configured DB reads preserve known content;
unknown dynamic routes and the sitemap use retryable 503s rather than false deletion data.
Tests use the existing Vitest runner and real built HTTP responses with isolated services.

## Decision: Preserve factual schema and existing migration URLs
**Date**: 2026-10-02
**Status**: Accepted
**Context**: Product pricing/reviews are unavailable and old links must survive the move.
**Decision**: Emit factual LocalBusiness, WebSite, breadcrumbs, Product and BlogPosting
markup without invented offers/ratings/dates. Keep category, product and legacy blog
paths. Canonicalize HTTPS apex, trailing slashes and product-name casing. Exclude admin,
API, PDFs and empty categories from indexing; generate a current sitemap from the snapshot.
**Alternatives Considered**: Renaming legacy slugs during the domain move adds migration
risk. Placeholder prices/reviews create misleading markup. Static sitemap dates would be
fabricated. Old-domain redirects in-app conflict with the owner's settled hPanel choice.
**Consequences**: Rich-result eligibility is not promised. Search Console ownership and
path/query-preserving old-domain redirects remain deployment requirements.

## Decision: Additive responsive assets, local fonts and bounded animation
**Date**: 2026-10-02
**Status**: Accepted
**Context**: Mobile lab loading was slow; the hero rotated during load, fonts were external,
large images served every viewport and logo tracks ran animation frames offscreen.
**Decision**: Generate additional WebP variants and an intrinsic-dimension manifest while
preserving all originals and stable URLs. Self-host licensed Inter/Outfit Latin WOFF2 fonts.
Use explicit image sizes, lazy below-fold images, manual hero controls, and one tested
visible-only carousel helper honoring reduced motion. Let SSR paint before hydration.
**Alternatives Considered**: Re-encoding existing originals in place violates preservation;
blind image preloads duplicate responsive transfers. Removing the hero/brand design would
be a redesign. Leaving perpetual offscreen loops wastes main-thread work.
**Consequences**: The release contains more assets; browsers choose smaller variants.
Future images need manifest regeneration. Local lab scores improve but do not establish
field Core Web Vitals; LCP and existing theme contrast still need deployed measurement.

## Decision: Redirect-only old-domain entry with raw-path LiteSpeed rewrite
**Date**: 2026-10-02
**Status**: Accepted
**Context**: Owner deployed the new site by changing the Node app's domain. The old domain
became parked. hPanel's basic redirect discarded HTTP deep paths, and using REQUEST_URI
with NE produced unescaped product-name spaces on this host.
**Decision**: Use an empty PHP/HTML entry on the existing plan, keep old SSL active, and
install a host-limited .htaccess 301 rule capturing the raw path from THE_REQUEST. Remove
the conflicting basic rule and redundant old-domain HTTPS hop; redirect both protocols
straight to the new HTTPS apex with query strings intact.
**Alternatives Considered**: DNS aliases alone cannot issue HTTP redirects; duplicating
the Node app is unnecessary; basic forwarding lost deep links; client-side redirects do
not establish a permanent HTTP migration signal. The in-app alternative remains declined.
**Consequences**: Maintain old domain/TLS/redirect entry. The rule is managed through the
old site's File Manager, so the hPanel Redirects list is empty. Live 20-case verification
covers protocols, hosts, encoded paths and queries; new app code is unaffected.

## Decision: Blog bodies are TipTap JSON rendered by our own React code
**Date**: 2026-10-27
**Status**: Accepted
**Context**: The admin blog form was one textarea saved as a single heading/text section, so
posts had no subheadings, lists, links, tables, inline images, alt text or SEO fields. The
owner is non-technical and needs Word-like formatting; pages must stay server-rendered and
safe from stored XSS.
**Decision**: A TipTap 3 visual editor (admin-only, lazy-loaded) produces ProseMirror JSON.
`server/blog-input.js` sanitizes it against an allowlist of nodes, marks, link protocols and
image hosts; `src/components/BlogContent.jsx` maps the JSON to React elements. No HTML
strings are stored or injected. Legacy `[{heading,text}]` posts are converted on read by
`legacyToBody` and retired when edited.
**Alternatives Considered**: Markdown with a toolbar (writer sees syntax, easy to break
heading order); stored HTML (needs an HTML sanitizer on every render path and invites
`dangerouslySetInnerHTML`); a home-made block editor (no new dependencies but poor writing
experience and no inline links/bold without reinventing an editor).
**Consequences**: Five exact-pinned `@tiptap/*` packages. The editor's extensions and the
server allowlist must change together. Rendering is fully under our control (heading ids,
link rel, figures, table headers). Content cannot be edited as raw HTML.

## Decision: Drafts via a `status` field; published URLs are immutable
**Date**: 2026-10-27
**Status**: Accepted
**Context**: Editing and drafts were requested. Existing documents have no status, and
there is no redirect table for blog slugs.
**Decision**: `status` is `draft` or `published`; documents without it count as published.
Every public read (API, SSR snapshot, metadata, sitemap) excludes drafts. A post's slug is
editable only while it is a draft; once published, PUT refuses a slug change.
**Alternatives Considered**: A separate drafts collection (duplicated schema); allowing
slug changes with stored redirects (more surface than the owner needs now).
**Consequences**: Unpublishing a post returns it to draft and its URL 404s until
republished. Renaming a published URL needs a code-level redirect.

## Decision: Keep FAQPage markup despite Google's FAQ rich-result removal
**Date**: 2026-10-27
**Status**: Accepted
**Context**: Google stopped showing FAQ rich results in May 2026. Answer engines (AI
Overviews, ChatGPT, Perplexity, Bing) still favour clearly marked question/answer pairs.
**Decision**: Posts may carry FAQs, rendered visibly (H2 + H3 questions) and as FAQPage
JSON-LD whose text matches the page.
**Alternatives Considered**: Dropping FAQ schema (loses a harmless machine-readable signal);
FAQ schema without visible content (violates structured-data guidelines).
**Consequences**: No Google stars should be expected; the value is extractable answers.
