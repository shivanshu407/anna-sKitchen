# Deployment — Hostinger

## What this subsystem does
The site runs as a **single Node.js process** on Hostinger. That one process serves both
the JSON API under `/api/*` and the compiled React SPA from `dist/`. One app, one domain,
no CORS, no separate front-end host.

## How it is structured
```
Browser
   |
   v
Hostinger (TLS + auto-generated .htaccess proxy)
   |
   v
node server.js            <- Entry file; owns listen(process.env.PORT)
   |
   +-- server/index.js     <- Builds the Express app, exports it
         |
         +-- /api/products, /api/blogs   -> Mongoose -> MongoDB Atlas
         +-- /api/health                 -> liveness + db state
         +-- /api/*  (unmatched)         -> JSON 404
         +-- express.static('dist')      -> hashed assets, immutable cache
         +-- robots.txt / sitemap.xml     -> crawler endpoints
         +-- GET *                       -> route-aware SSR HTML, real 404s
```

`server/index.js` never calls `listen()`. That belongs to `server.js` alone, so the module
can be imported by tests (and by the legacy Vercel shim) without binding a port.

## Plan requirement
Confirmed 2026-09-07: the account reaches hPanel → Websites → Add Website → **Deploy Web
App**, so Node.js apps are available (ISSUE-005, resolved). Hostinger's docs list this for
Business and Cloud plans.

## Deploying (Node.js app)
1. **Build locally** — `npm run build`. Confirm both `dist/` and `dist-server/entry-server.js` exist.
2. **Get the code to Hostinger** by one of:
   - GitHub repo (rebuilds on push) — recommended,
   - a `.zip` upload,
   - the Hostinger VS Code connector.
   Do not ship `node_modules/`, `dist/`, or `public-original/`.
3. **Configure the app** in hPanel:
   | Setting          | Value            |
   |------------------|------------------|
   | Node version     | **22**           |
   | Build command    | `npm run build`  |
   | Entry file       | `server.js`      |
   | Output directory | `dist`           |
   If the framework preset is detected as a static React/Vite app, change it — this is a
   **server** app, otherwise `/api/*` will not exist. Never Node 18: Vite needs 20.19+, and
   the first deploy failed on 18 with a misleading `@tailwindcss/oxide` "native binding"
   error. `engines`, `.nvmrc` and `.node-version` all say so.
4. **Set environment variables** (hPanel -> app -> Environment variables). See `.env.example`:
   `MONGODB_URI`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`,
   and the admin three — `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET` — from
   `npm run admin:password`. Without the admin three the dashboard refuses every login.
   Do **not** set `PORT` — Hostinger injects it.
5. **Allow-list the server IP in MongoDB Atlas** (Network Access). This is the most common
   first-deploy failure. Symptom below.
6. **Verify**: `https://<domain>/api/health` should return
   `{"status":"ok", ..., "db":"connected"}`. `db:"disconnected"` means step 5 is incomplete.

## Conventions and rules
- Never add a second `listen()`.
- Never hardcode a port.
- `/api/*` routes are registered before the SPA fallback, and an explicit JSON 404 sits
  between them. Adding a route after the `GET *` handler makes it unreachable.
- Cache policy is set in `server/index.js`:
  `dist/assets/*` (Vite-fingerprinted) -> `max-age=31536000, immutable`;
  everything copied from `public/` -> `max-age=2592000`;
  `index.html` -> `no-cache`, so a deploy is picked up immediately.
- `compression()` runs in-process; do not also enable compression in `.htaccess`.

## Known gotchas
- **`db:"disconnected"` on a fresh deploy** — Atlas has not allow-listed the Hostinger IP.
  The site still works: the front-end falls back to its bundled catalogue in
  `src/data/`, so pages render but the admin dashboard cannot save anything.
- **A DB outage costs ~5 s, not 10 s.** `mongoose.set('bufferTimeoutMS', 5000)` and a
  client-side `AbortController` both cap the wait. This was 10+ s before 2026-09-07 and
  showed a spinner the whole time.
- **`GET *` swallows typos.** Without the explicit `/api` 404, `/api/porducts` would return
  `index.html` with a 200 and the front-end would fail to parse it. There is a regression
  test for this.
- **Case sensitivity.** Hostinger is Linux. Anything referencing `Logo.webp` rather than
  `logo.webp` works on Windows and 404s in production. All assets are lowercase by design.
- The legacy `vercel.json` and `api/` shim are still present and harmless. If Hostinger's
  autodetect misreads the project, `vercel.json` is the first thing to remove.

## Deploying by zip upload
Git import is the recommended path, but hPanel's **Upload your files** accepts a `.zip`.
`hostinger-upload.zip` in the project root is that bundle (~160 files, ~23 MB), with
`package.json` at the **zip root** (not nested inside a folder) — Hostinger then runs
`npm install` and the build command itself.

It contains `index.html`, `package.json`, `package-lock.json`, `vite.config.js`,
`server.js`, `.env.example`, and the `server/`, `src/` and `public/` trees. It deliberately
omits `node_modules/`, `dist/`, `public-original/`, `knowledge-base/`, `scripts/`,
`deploy/`, the Vercel shim, and all test files.

The zip is gitignored and regenerated on demand — it is build output, not source.

> ⚠️ When regenerating, exclude top-level directories **by top-level path, not by name**.
> Excluding the name `api` at any depth also removes `src/api/`, which holds the front-end
> fetch layer. That produced a zip that installed fine and then failed the build with
> `Could not resolve "../api/products"`. The manifest now asserts that every required
> module is present before writing.

Always verify a regenerated bundle by extracting it to a short path (Windows `MAX_PATH`
bites — one blog filename is 83 characters) and running `npm install && npm run build &&
node server.js` against it. A bundle that merely zips without error is not a bundle that
deploys.

## Static-only fallback (no Node.js on the plan)
This is a legacy fallback only. It does not satisfy this release's server-rendered SEO
contract, real crawler endpoints or HTTP status handling. Use the Node app for aksales.in.

Upload the **contents of `dist/`** to `public_html`, then rename
`deploy/htaccess-static-fallback` to `.htaccess` beside it. That file supplies SPA routing,
compression, and cache headers.

In this mode there is no `/api`, so the site serves its bundled catalogue and **the admin
dashboard cannot save**. Do not add this `.htaccess` when running as a Node.js app — it
fights the one Hostinger generates.

## How it is tested
`server/server.test.js` boots the real Express app on an ephemeral port and asserts the
hosting contract: health check without a DB, JSON 404 for unknown `/api` routes, SPA shell
at `/` and at a deep route, and the three cache-header classes. `npm test` runs
`vite build` first (via `pretest`) so those assertions run against a real `dist/`.

Not covered: the live Hostinger environment itself, MongoDB connectivity, and Cloudinary
uploads. Verify those with `/api/health` after deploying.

## Related
- [architecture.md](architecture.md) — how the pieces fit together
- [assets.md](assets.md) — why the asset filenames changed
- [known-issues.md](known-issues.md) — read before making the site public

## Moving to aksales.in (2026-09-29)
> Status 2026-10-01: not started. aksales.in shows a Hostinger parking page; production is
> still annakitchenequipment.com, running `6ade621`.

The site is being moved from annakitchenequipment.com to **aksales.in**. The redirect is done
in Hostinger, not in the app (owner's choice). **Order matters** — the app currently runs *on*
the old domain, so the new one must work before anyone is sent to it.

1. **Deploy the app on aksales.in** — hPanel → Websites → Add Website → Deploy Web App →
   import `shivanshu407/anna-sKitchen`. Same settings as before: Node 22, build
   `npm run build`, entry `server.js`, output `dist`.
2. **Set the environment variables again.** They belong to the app, not the account, so a new
   app starts with none: `MONGODB_URI`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
   `CLOUDINARY_API_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`.
   Without the admin three, the dashboard refuses every login (fails closed, 503).
3. **Check it works** — `https://aksales.in/api/health` must say `"db":"connected"`. If it says
   `disconnected`, the new server's IP is probably not allowed in MongoDB Atlas → Network Access.
4. **Only then redirect the old domain** — hPanel → Domains → Redirects, source
   annakitchenequipment.com, destination https://aksales.in, type **301 (permanent)**. Never
   302: a temporary redirect tells Google to keep ranking the old domain.
5. **Test that paths survive.** `annakitchenequipment.com/collections/refrigeration` must land on
   `aksales.in/collections/refrigeration`, not the homepage. If hPanel's form only redirects to
   the homepage, the path-preserving `.htaccess` rule in Hostinger's docs is the fallback:
   `RewriteRule ^(.*)$ https://aksales.in/$1 [R=301,L]`.
6. **Google Search Console** — verify aksales.in, then use *Change of Address* on the old
   property. **Verify both domains by DNS**, not the HTML meta tag in `index.html`: once the old
   domain only serves redirects, a meta-tag verification of it quietly lapses, and Change of
   Address needs both properties verified.
7. **Keep the old domain and the redirect for at least a year.** Google Analytics needs no
   change; the same measurement ID works on either domain.

The canonical domain is now fixed to `https://aksales.in` in `src/lib/seo.js`. The metadata, schema and sitemap all use it. Deploy this release to the new domain; use hPanel for the old-domain redirect after verification.

## 2026-10-02 release and DNS handoff
The requested repository is `shivanshu407/anna-sKitchen`; its main HEAD matched local `f767a08` before edits. Local origin still points to the previous owner's repository and was deliberately not changed. No source has been pushed and no deployment has been performed in this session.

The release upload package is `output/aksales-hostinger-2026-10-02-final.zip`, with package.json at its root (507 entries, 38,942,148 bytes). It includes all public responsive assets, local fonts, `src/entry-server.jsx`, the image manifest, server modules and the existing configuration. It excludes credentials, node_modules, compiled directories and original-image backups. This source package installs and builds both bundles in a fresh extraction. The older hostinger-upload.zip and initial October 2 package predate the final checks and must not be used.

Node 22, build `npm run build`, entry `server.js`, and the Node/Express preset remain required. hPanel must preserve both generated directories in the running deployment; do not serve only dist. Copy existing environment variables privately in hPanel; never put their values into Git or documentation. Do not set PORT.

Observed DNS on 2026-10-02:

| Domain | Current public configuration |
|---|---|
| aksales.in | A @ = 2.57.91.91 (Hostinger parking); NS nova.dns-parking.com and cosmos.dns-parking.com |
| www.aksales.in | CNAME www = aksales.in |
| Old domain | Hostinger CDN addresses; NS apollo.dns-parking.com and athena.dns-parking.com |

These are observations, not a hosting destination. Since aksales.in already uses Hostinger DNS, create/connect the new Node app in hPanel first and use the exact records displayed for that app. The app origin IP cannot be determined from the old domain's CDN addresses. No nameserver change is needed merely to keep Hostinger DNS. Keep existing email records. If hPanel requires an A record, replace only the parking A with its verified value; retain CNAME www=aksales.in unless the panel supplies a different target.

After the new app is verified with valid HTTPS on apex and www, configure one-hop path-and-query-preserving 301 redirects for both old-domain variants to the new apex. The application itself normalizes HTTP/www on aksales.in and trailing slashes/product casing; old-domain redirects stay in hPanel as previously agreed. Retain the old domain and TLS for at least a year. Verify both Search Console domain properties using their own DNS TXT records, submit https://aksales.in/sitemap.xml, then run Change of Address from the old property. Verification values require the owner's Search Console session; do not reuse a guessed token.

References: [Hostinger Node domain connection](https://www.hostinger.com/support/how-to-connect-a-custom-domain-to-a-node-js-application/), [Google site move guidance](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes).

## Live deployment and old-domain redirect (2026-10-02, subsequent session)
The owner deployed the final ZIP; hPanel confirms Completed/Current. Live aksales.in home,
collection, product and blog pages return 200; /api/health reports connected; sitemap is
XML, robots is text, and missing pages return 404. www.aksales.in redirects to the apex.

Changing the old Node app's domain left annakitchenequipment.com parked without a website
entry. A new empty PHP/HTML entry was created on the existing Business hosting plan solely
for redirects. Hostinger verified the already-correct apollo/athena nameservers, connected
the domain to this entry (panel origin 82.112.229.152, www alias to the apex), and the old
Lifetime SSL remains active. These are current observations, not values to reuse for a
future move; CDN/resolver answers may differ.

The live rule is in the OLD website's public_html/.htaccess; its source copy is
deploy/htaccess-old-domain-redirect. Do not install it in the new app. It checks only the
old apex/www host and captures the raw encoded path from THE_REQUEST, then sends 301 to
https://aksales.in/<same path>. The query string is carried through automatically.
Using REQUEST_URI with NE on this LiteSpeed host produced unescaped spaces for encoded
product names; THE_REQUEST avoids that problem and was verified with encoded %, &, +
and spaces. A hPanel basic redirect dropped HTTP deep-link paths, so it was removed in
favor of this rule. The old domain's intermediate Force HTTPS routing was unforced;
the certificate remains active and both protocols redirect directly to HTTPS aksales.in.
The Redirects list is intentionally empty because the actual rule is in .htaccess.

Live verification: 20/20 exact first-response 301/Location checks across HTTP/HTTPS,
apex/www, homepage, collection, encoded product, blog and encoded edge paths. Four real
destination pages return 200. Evidence: output/seo/old-domain-redirect-verification.json
and old-domain-redirect-rule.jpg. No application logic changed in this redirect session;
the full app suite was not rerun because it cannot exercise the remote LiteSpeed rule.
No automated unit test added because this is hosting configuration only; the live HTTP
checks exercise the actual behavior. Keep the old domain/SSL/entry active for at least a
year and complete Search Console Change of Address separately.
