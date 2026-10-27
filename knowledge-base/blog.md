# Blog: editor, storage and rendering

## What this subsystem does
Lets the single admin write SEO/AEO-ready articles in a visual editor (TipTap), save drafts,
preview, publish and edit them. Public blog pages are server-rendered from structured JSON
with semantic headings, a table of contents, figures with alt text and captions, FAQs,
author details and complete BlogPosting/FAQPage structured data. Added 2026-10-27,
replacing a single textarea that stored a whole post as one heading/text section.

## How it is structured
| Piece | Location | Responsibility |
|---|---|---|
| Model | `server/models/Blog.js` | Post fields incl. `status`, `body` (TipTap JSON), SEO fields, FAQs, `publishedAt`; legacy `content` sections |
| Input allowlist | `server/blog-input.js` | `sanitizePost`/`sanitizeBody` (allowlist of nodes, marks, link protocols, image hosts, size/depth caps), `validateDraft`, `validateForPublish` |
| API | `server/routes/blogs.js` | GET (published; `?drafts=1` admin-only), POST, PUT `/:slug`, POST `/images`, DELETE |
| Shared helpers | `src/lib/blog-content.js` | `bodyOf` (legacy → doc), text/word count, heading ids, SEO title/description fallbacks, Cloudinary srcset |
| SEO checklist | `src/lib/blog-seo-check.js` | `analyzePost` → errors (mirror server publish rules) / warnings / passes; `LIMITS`, `SLUG` |
| Renderer | `src/components/BlogContent.jsx` | JSON → React elements; no `dangerouslySetInnerHTML` |
| Article layout | `src/components/BlogArticle.jsx` | Hero, breadcrumb, dates, "In short", TOC, body, FAQ, author; shared by `BlogPage` and the admin preview |
| Admin | `src/components/admin/BlogEditor.jsx`, `RichTextEditor.jsx`, `SeoPanel.jsx`; blogs tab in `src/pages/AdminDashboard.jsx` | Editing UI, lazy-loaded (`BlogEditor` chunk) so TipTap stays out of the public bundle |
| Client API | `src/api/blogs.js` | `fetchAllBlogsAdmin`, `addBlog`, `updateBlog`, `uploadBlogImage`, `blogFormData` |
| Metadata | `src/lib/seo.js`, `src/components/SEO.jsx` | Title/description, BlogPosting, FAQPage, article OG times, sitemap `lastmod` |

## Conventions and rules
- **Editor extensions and the server allowlist change together.** Allowed: paragraph,
  H2–H4, bullet/ordered lists, blockquote, table (header row), block image (`src`, `alt`,
  `caption`, `width`, `height`), horizontal rule, hard break; marks bold, italic, link
  (`href`, `rel: 'nofollow'|null`). Anything else is dropped or converted on save.
- Links: `http(s)`, `mailto:`, `tel:`, site paths (`/…`, never `//` or `/\`) and `#anchors`.
  Images: `https://res.cloudinary.com/…` or site paths. Alt text is required to publish.
- The title is the page's only H1; the editor offers H2–H4 only.
- **A published post's slug never changes** (no redirect table). Slugs are editable only
  while a post is a draft. Unpublishing returns a post to draft and its URL 404s.
- Drafts are excluded everywhere public: API, SSR snapshot (`server/web.js`), metadata
  (404) and sitemap. Documents without `status` count as published.
- Saving a legacy post through the editor converts its sections to `body` and clears
  `content`. Legacy posts that are never edited keep rendering through `legacyToBody`.
- `focusKeyword` is editor guidance only and is never emitted (no meta keywords).
- Uploads: JPEG/PNG/WebP/AVIF, 5 MB max; `requireAuth` runs before multer. Cloudinary
  `public_id`s come from the alt text for descriptive file names.
- Dates: `publishedAt` is set on first publish (or the writer's chosen day); the display
  `date` string is rewritten from it in Asia/Kolkata. `dateModified`/`lastmod` come from
  Mongoose `updatedAt` — real values only.

## Known gotchas
- TipTap `useEditorState` caches its first snapshot; with `immediatelyRender: false` the
  editor appears after that, so the toolbar reads editor state directly until the first
  transaction. Removing the fallback leaves the body stuck on "Loading editor"
  (found in browser verification 2026-10-27).
- TipTap keeps an empty trailing paragraph; the renderer skips empty paragraphs.
- Google removed FAQ rich results in May 2026; FAQ markup is kept for answer engines
  (see decisions.md). No stars should be expected.
- Production MongoDB had **0 blogs** on 2026-10-27; the public posts are the bundled
  `src/data/blogsData.js`. The admin shows them as "Built-in, read-only" with one
  "Import built-in posts" button (`POST /api/blogs/import-bundled`), which inserts every
  missing bundled post at once (published, alt = title, `publishedAt` from the display
  date). Import all at once: as soon as MongoDB holds any blog, the public site shows only
  database posts. Without a database the admin shows a load error and no import.
- No unsaved-changes prompt: switching tabs or Cancel discards editor work.
- Cloudinary upload and real MongoDB saves are not covered by automated tests.

## How it is tested
`server/blog-input.test.js` (allowlist, URL rules, caps, publish validation),
`server/blogs-routes.test.js` (authenticated route validation with `Blog` and Cloudinary
stubbed), `server/auth-routes.test.js` (401s for the new routes and `?drafts=1`),
`src/lib/blog-content.test.js`, `src/lib/blog-seo-check.test.js`,
`src/components/BlogContent.test.jsx`, `src/components/BlogArticle.test.jsx`,
`src/api/blogs.test.js`, and blog cases in `src/lib/seo.test.js`. The TipTap editor itself
has no automated test (no DOM library); it was verified in the browser.

## Related
[seo.md](seo.md), [rendering.md](rendering.md), [security.md](security.md),
[decisions.md](decisions.md), [testing.md](testing.md).
