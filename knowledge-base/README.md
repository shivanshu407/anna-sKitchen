# Anna Kitchen Equipments
> Marketing and catalogue site for a commercial kitchen equipment manufacturer, with a small admin area for managing products and blog posts.

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
| Auth         | Server-side sessions — see security.md      |
| Test Runner  | Vitest 5                                    |

## Directory Structure
```
server.js              Production entry point. Hostinger's "Entry file".
index.html             Vite HTML template.
vite.config.js         Build config incl. vendor chunk splitting.
vitest.config.js       Test config.
src/                   React front-end
  api/                 fetch wrappers (http.js adds read timeouts)
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
scripts/               Asset optimisation pipeline
deploy/                Static-hosting .htaccess fallback
knowledge-base/        This documentation
```

## Critical Rules
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
- Env vars come from hPanel in production, not from a `.env` file.

## Quick Facts
| Key          | Value                                            |
|--------------|--------------------------------------------------|
| Repo         | github.com/MBKANERIYA/anna-sKitchen (default `main`) |
| Prod URL     | Not yet deployed                                 |
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
| forms.md           | Before changing any public form or enquiry flow |
| architecture.md    | Before touching how the app is wired          |
| decisions.md       | Before undoing something that looks odd       |
| known-issues.md    | Before debugging, and before going public     |
| assets.md          | Before adding or changing images              |
| testing.md         | Before writing or changing tests              |
| active-context.md  | Every session                                 |
| changelog.md       | When tracing a regression                     |
