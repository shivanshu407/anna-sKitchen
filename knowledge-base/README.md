# AK Sales
> Catalogue site for a commercial kitchen equipment manufacturer in Surat. Formerly "Anna Kitchen Equipments" — renamed 2026-09-29.

## Tech Stack
| Layer        | Technology                                  |
|--------------|---------------------------------------------|
| Language     | JavaScript (ESM front-end, CommonJS server) |
| Framework    | React 19 + Vite 7, React Router 7           |
| Styling      | Tailwind CSS 4 (via `@tailwindcss/vite`)    |
| Server       | Express 4                                   |
| Database     | MongoDB Atlas (Mongoose 8)                  |
| Media        | Cloudinary (admin uploads only)             |
| Hosting      | Hostinger — Node.js app (see deployment.md) |
| SEO          | `react-helmet-async` per-page tags — see seo.md |
| Analytics    | Google Analytics 4 (`G-EZE8DTQTEB`)         |
| Auth         | Server-side sessions — see security.md      |
| Test Runner  | Vitest 5                                    |

## Directory Structure
```
server.js              Production entry point. Hostinger's "Entry file".
index.html             Vite HTML template.
vite.config.js         Build config incl. vendor chunk splitting.
vitest.config.js       Test config.
src/                   React front-end
  api/                 fetch wrappers (http.js adds read timeouts; auth.js)
  lib/                 whatsapp.js — builds the enquiry hand-off
  components/          Shared UI
  pages/               Route-level components
  data/                Bundled fallback catalogue + blogs
server/                Express API (CommonJS)
  index.js             Builds and exports the app; no listen()
  routes/              /api/products, /api/blogs
  models/              Mongoose schemas
api/                   Vercel serverless shim (legacy, unused on Hostinger)
public/                Optimised, slug-named static assets — this ships
public-original/       Pre-optimisation originals. Local backup, gitignored
brand/                 Logo source artwork (committed, not served)
scripts/               Asset pipeline, logo build, admin-password generator,
                       and the mongosh scripts for database migrations
deploy/                Static-hosting .htaccess fallback
knowledge-base/        This documentation
```

## Critical Rules
- **The business is "AK Sales", in Surat.** Never "Anna Kitchen" and never Lucknow.
  `src/branding.test.js` fails the build if either returns. The only permitted traces are
  the email `annaskitchenequipment@gmail.com` and Instagram `annas_kitchen_equipments`,
  kept until replacements exist.
- **`server.js` is the entry point, not `server/index.js`.** `server/index.js` deliberately
  does not call `listen()`; only `server.js` does. Adding a second `listen()` will cause
  `EADDRINUSE` on Hostinger.
- **Never bind a hardcoded port.** Hostinger injects `PORT`.
- **Build before serving.** `server/index.js` only mounts the SPA if `dist/` exists.
- **Do not hand-edit files in `public/`.** They are generated. Edit the source in
  `public-original/` and re-run the pipeline — see assets.md.
- **Asset filenames must stay lowercase and hyphenated.** Hostinger serves from Linux
  (case-sensitive); Windows is not. `Logo.webp` works locally and 404s in production.
- `public-original/` is ~129 MB and is gitignored. It exists only on the dev machine —
  back it up separately before reinstalling the OS.
- Env vars come from hPanel in production, not from a `.env` file. The admin login needs
  `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` and `SESSION_SECRET`; without them it fails closed.
- **`npm test` must never touch real services.** A local `.env` holds the production
  database URI; `vitest.config.js` blanks it. Never `delete process.env.X` in a test —
  set it to `''` (ISSUE-008).

## Quick Facts
| Key          | Value                                            |
|--------------|--------------------------------------------------|
| Repo         | github.com/MBKANERIYA/anna-sKitchen (default `main`) |
| Prod URL     | https://annakitchenequipment.com (until the move) |
| New domain   | https://aksales.in — Hostinger parking page as of 2026-10-01 |
| Deployed     | `6ade621` as of 2026-10-01 — AK logo + Analytics live, rebrand (`a55833b`) not yet |
| Deploy       | Hostinger -> Deploy Web App -> import Git repo    |
| Previous     | Vercel (dev staging)                             |
| DB           | MongoDB Atlas                                    |
| Test Command | `npm test` (builds first, then runs Vitest)      |
| Build        | `npm run build` -> `dist/`                       |
| Start        | `npm start` -> `node server.js`                  |

## Reading Order
| File               | When to Read                                  |
|--------------------|-----------------------------------------------|
| README.md          | Always first                                  |
| deployment.md      | Before deploying or changing hosting          |
| security.md        | Before touching the admin area or API auth    |
| seo.md             | Before changing titles, meta tags or Analytics |
| forms.md           | Before changing any public form or enquiry flow |
| architecture.md    | Before touching how the app is wired          |
| decisions.md       | Before undoing something that looks odd       |
| known-issues.md    | Before debugging, and before going public     |
| assets.md          | Before adding or changing images              |
| testing.md         | Before writing or changing tests              |
| active-context.md  | Every session                                 |
| changelog.md       | When tracing a regression                     |
