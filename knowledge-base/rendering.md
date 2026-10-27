# Server rendering and catalogue snapshots

## What this subsystem does
Express serves complete public React pages before JavaScript runs, with the same catalogue and blog data used for metadata, the sitemap and hydration. Browser navigation keeps the existing React Router URLs and interactive enquiry flows. This avoids an empty SPA shell and false 200 responses for missing pages.

## How it is structured
- `npm run build` produces the browser bundle in `dist/` and `src/entry-server.jsx` in `dist-server/entry-server.js`.
- `server/web.js` loads the renderer, resolves HTTP status, and inserts the rendered body/head and safe JSON data into the Vite template.
- `server/content.js` transforms categories into the existing public API shape and caches successful content snapshots for 60 seconds. Concurrent refreshes share one read. Successful admin mutations invalidate the snapshot.
- `SiteDataProvider` and `useSiteData` supply catalogue/blog content to public routes, menus and Home sections. The initial server snapshot avoids repeated loading spinners and initial API calls. Vite development without a server snapshot reads the APIs once for the shared provider.
- `src/main.jsx` hydrates server HTML using the JSON bootstrap, or renders normally in Vite development.
- Production hydration starts after two animation frames so the server HTML can paint first;
  the development render remains immediate. Navigation remounts Header by pathname to reset menus.

## Conventions and rules
Use the shared metadata resolver for server and browser routes. Keep both build outputs available at runtime. Public catalogue transformation is shared with `/api/products`; never merge deleted products back into a successful empty database result. Blogs retain the existing API convention of bundled posts when the database list is empty. The snapshot reads only non-draft posts (`status != 'draft'`); see blog.md. Do not serialize credentials into bootstrap data.

## Known gotchas
React 19 and Helmet 3 use native metadata hoisting rather than the older Helmet server context. The server entry renders a complete document to collect the head and body. JSON-LD remains inside the rendered application and is valid there. The template's fallback title/description are stripped in production to prevent duplicates.

No database connection means bundled content is immediately available. Failed reads retain the last known successful snapshot. When a configured database is unavailable, unknown dynamic records return retryable 503s, and the sitemap returns 503 rather than publishing a potentially stale catalogue. A valid bundled/last-known page remains readable. A successful request may use a cached snapshot for up to 60 seconds.

Unknown pages/records return 404, missing assets return plain 404, and admin/empty collection pages return 200 with noindex. The local preview deliberately has no real database or admin credentials; it does not prove Atlas connectivity or production admin writes.

Logo carousels share startAutoScroll: only visible tracks animate, hover and reduced-motion
pause them, ResizeObserver updates track width, and unmount cancels frames/listeners. The
hero retains manual slide controls and a stable first image rather than a timed LCP replacement.

## How it is tested
`server/content.test.js` tests transformation, cache expiry, coalescing, invalidation, intentional empty results and outage retention. `server/seo.test.js` tests initial HTML, all sitemap URLs, 404/noindex, route normalization, safe hostile content and database outage status. Existing hosting and authentication tests remain applicable. Run `npm test` to build both outputs and run the full suite.

## Related
[seo.md](seo.md), [deployment.md](deployment.md), [architecture.md](architecture.md), [testing.md](testing.md).
