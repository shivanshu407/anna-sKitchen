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
`images/logo.png` stays PNG as an indexed/palette image.
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
