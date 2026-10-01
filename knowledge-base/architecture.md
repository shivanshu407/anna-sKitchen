# Architecture

## System Overview
A React single-page application backed by a small Express API, both served by one Node
process. The catalogue and blog content live in MongoDB Atlas, with an identical-shaped
copy bundled into the front-end as a fallback, so the site renders fully even when the
database is unreachable. Admin image uploads go to Cloudinary rather than local disk. Writes
are protected by server-side sessions; public enquiries are handed to WhatsApp rather than
stored. The business trades as **AK Sales** (Surat).

## Architecture Diagram
```
                          Browser
                             |
                    HTTPS (Hostinger TLS)
                             |
                             v
           +--------------------------------------+
           |     node server.js  (one process)    |
           |                                      |
           |  compression -> json -> cookieParser |
           |  (cors in development only)          |
           |            |                         |
           |  /api/auth/*  login, logout, me      |
           |  requireAuth on every POST/DELETE    |
           |  /api/products  ---+                 |
           |  /api/blogs     ---+--> Mongoose ----+---> MongoDB Atlas
           |  /api/health       |                 |
           |  /api/* -> JSON 404|                 |
           |                    +--> Cloudinary --+---> Cloudinary CDN
           |                          (uploads)   |
           |  express.static('dist')              |
           |  GET *  -> dist/index.html           |
           +--------------------------------------+

   Fallback path: if /api/products fails or exceeds 5 s, the SPA renders
   src/data/productsData.js instead. Same shape, no network.

   Enquiries never reach this server: the contact and quote forms open
   wa.me/919106780688 with the details pre-filled (see forms.md).
```

## Layers & Responsibilities
| Layer       | Technology              | Responsibility                                  |
|-------------|-------------------------|-------------------------------------------------|
| Front-end   | React 19, Vite 7, Tailwind 4 | Rendering, routing, bundled fallback data  |
| Routing     | React Router 7 (`BrowserRouter`) | Client-side navigation                 |
| API client  | `src/api/*.js`          | fetch wrappers, read timeouts, fallback logic   |
| Backend     | Express 4               | JSON API, static serving, SPA fallback          |
| Data access | Mongoose 8              | Schemas and queries                             |
| Database    | MongoDB Atlas           | Categories/products, blog posts                 |
| Media       | Cloudinary + Multer     | Admin image uploads (memory storage, no disk)   |
| Auth        | HMAC-signed httpOnly cookie, scrypt | Admin sessions; `requireAuth` on writes (security.md) |
| Enquiries   | `src/lib/whatsapp.js`   | Hands forms to WhatsApp; nothing stored (forms.md) |
| SEO         | `react-helmet-async` + `index.html` | Titles, descriptions, Analytics (seo.md) |
| Hosting     | Hostinger Node.js app   | Process supervision, TLS, restarts              |
| Testing     | Vitest 5                | Hosting contract, auth, forms, assets, branding |

## Data Flow
**Catalogue page load.** The SPA requests `GET /api/products`. The route loads all
`Category` documents and reshapes them into `{ slug: { title, slug, description, products } }`
— deliberately the same shape as `src/data/productsData.js`, which is what makes the
fallback a drop-in. If the request fails or exceeds 5 s, `fetchProducts()` catches, warns,
and returns the bundled data. The page cannot tell the difference.

**Deep link / hard refresh.** `GET /collections/heating-range` reaches Express, matches no
API route and no file in `dist/`, and falls through to `GET *`, which returns
`dist/index.html`. React Router then resolves the route in the browser.

**Admin upload.** The dashboard posts `multipart/form-data`. Multer buffers the file in
memory, the route base64-encodes it and uploads to Cloudinary, and only the returned
`secure_url` is stored in MongoDB. No image is ever written to the server's disk — which is
what keeps the app stateless enough for a restart to be free.

## Key Design Patterns
- **SPA + JSON API in one process.** Chosen over split hosting; see decisions.md.
- **Graceful degradation over error states.** The bundled catalogue means a database outage
  is invisible to visitors. This predates the migration and is why the site is safe to
  deploy before Atlas is reachable.
- **Generated static assets.** `public/` is build output from `public-original/`, not
  hand-maintained. See assets.md.
- **Module/entry split.** `server/index.js` exports; `server.js` listens. This is what makes
  the app testable.
- **Mixed module systems.** The root is ESM (`"type": "module"`); `server/` is CommonJS
  because `server/package.json` omits `"type"`. `server.js` bridges them with a plain
  `import`, relying on Node's interop.

## External Dependencies
| Service        | Purpose               | If it goes down                                  |
|----------------|-----------------------|--------------------------------------------------|
| MongoDB Atlas  | Content storage       | Site serves bundled catalogue; admin cannot save |
| Cloudinary     | Image hosting for uploads | New uploads fail; existing images keep serving |
| Google Fonts   | Inter + Outfit        | Falls back to system fonts                       |
| Unsplash       | Some hero/services imagery | Those images break — hotlinked, not local   |
| WhatsApp       | Receives every enquiry | Forms open WhatsApp but nothing arrives; no record kept |
| Google Analytics | Traffic reporting   | Nothing visible to visitors; reports have a gap  |

## Scalability & Limits
Traffic is expected to be small (a regional manufacturer's brochure site) and the whole
thing is a single Node process, so the practical ceiling is one Hostinger container. The
real constraints are disk and bandwidth: `public/` is 23.6 MB, of which the brochure PDF is
16.7 MB. Product images are served by the Node process rather than a CDN — fine at this
scale, and the immutable cache headers keep repeat visits cheap.

## What NOT to Do
- Do not add a second `listen()` anywhere.
- Do not register routes after the `GET *` SPA fallback; they will never match.
- Do not write uploaded files to local disk — it breaks the stateless restart assumption.
- Do not remove the bundled fallback data in `src/data/`. It is load-bearing, not leftover.
- Do not hand-edit `public/`; it is regenerated from `public-original/`.
- Do not add a mutating route without `requireAuth`, and keep it ahead of multer.
- Do not write "Anna Kitchen" or "Lucknow" anywhere — `src/branding.test.js` will fail.

## Related
- [deployment.md](deployment.md) · [assets.md](assets.md) · [decisions.md](decisions.md)
- [security.md](security.md) · [forms.md](forms.md) · [seo.md](seo.md)
