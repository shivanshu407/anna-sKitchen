# Catalogue: products, categories and their admin editors

## What this subsystem does
The site is a catalogue: equipment is shown with images, descriptions and specifications,
and visitors enquire. **There are no prices, offers or online sales**, so no price,
availability or review data is ever stored or emitted. Since 2026-10-27 the admin can add
and edit products and categories with SEO fields, and every product has a clean,
editable slug URL.

## How it is structured
| Piece | Location | Responsibility |
|---|---|---|
| Model | `server/models/Product.js` (model `Category`) | Categories with embedded `products[]` (`_id: false`) |
| Input rules | `server/catalogue-input.js` | Sanitize/validate products and categories; CJS twin of `productSlug`; `oldSlugs` bookkeeping |
| Uploads | `server/uploads.js` | Shared multer limits (JPEG/PNG/WebP/AVIF, 5 MB) and Cloudinary upload with descriptive ids; used by products and blogs |
| API | `server/routes/products.js` | GET; POST product; PUT/DELETE `/:categorySlug/:productSlug`; PUT `/categories/:categorySlug`; POST `/images` |
| Public shape | `server/content.js` `toCatalogue` | Same object for `/api/products` and SSR; omits undefined fields and `_id` |
| URL helpers | `src/lib/catalogue.js` | `productSlug`, `productPath(categorySlug, product)`, `findProduct` |
| Metadata | `src/lib/seo.js` | Product/category titles, Product + FAQPage schema, sitemap with `lastmod` |
| Pages | `src/pages/CollectionPage.jsx`, `src/pages/ProductDetailPage.jsx` | Category grid + buying guide + FAQs; product summary, gallery, specs table, description, FAQs |
| Admin | `src/components/admin/ProductEditor.jsx`, `CategoryEditor.jsx`, `SeoPanel.jsx`, `FormParts.jsx`, `form-helpers.js`; `src/pages/AdminDashboard.jsx` | Editing UI; editors are lazy-loaded |
| Checklist | `src/lib/product-seo-check.js` | `analyzeProduct` errors (mirror server validation) / warnings |
| Client API | `src/api/products.js` | `addProduct`, `updateProduct`, `deleteProduct` (by slug), `updateCategory` (multipart), `uploadProductImage` |

Product fields: `name`, `slug`, `oldSlugs`, `image`, `imageAlt`, `imageWidth/Height`,
`gallery[{src,alt,width,height}]` (≤8), `summary`, `body` (TipTap JSON, same allowlist
as blogs), `specs[{label,value}]` (≤30), `faqs`, `seoTitle`, `metaDescription`,
`focusKeyword` (never rendered), `modelNumber` (→ schema `sku`), `updatedAt`.
Category fields: `slug` (immutable), `title`, `description`, `seoTitle`,
`metaDescription`, `body` (buying guide), `faqs`.

## Conventions and rules
- **Canonical product URL** is `/collections/<category>/<slug>`; products without a stored
  slug use `slugify(name)`. `findProduct` also resolves legacy name URLs, `oldSlugs` and
  products moved to another category; `server/web.js` 301s every non-canonical match.
- Slugs are unique across the whole catalogue. Changing a slug pushes the old one into
  `oldSlugs` (max 20); taking a slug removes it from other products' `oldSlugs`.
- `server/catalogue-input.js` mirrors `src/lib/catalogue.js` `productSlug`; a test asserts
  both agree. Change them together.
- Saving requires name, valid unique slug, main image, main alt, and alt on every gallery
  and description image. Legacy products get their name pre-filled as alt.
- Products with neither `summary` nor `body` keep the old templated paragraph, so
  unedited products do not lose text. The dead "Read more" button was removed.
- Product schema: name, url, image array, description, category, manufacturer, brand,
  `sku`, `additionalProperty` from specs. **No `offers`**, so Google Product rich results
  are not expected.
- Category slugs `categories` and `images` are reserved (API path clashes).

## Known gotchas
- Old-domain links now take two hops (old domain → aksales.in name URL → slug URL).
  Google follows both; updating the old-domain rule is not required.
- A client-side link to an old name URL renders via the legacy lookup with a slug
  canonical; only a full load or crawler gets the 301. Internal links all use
  `productPath`.
- Category updates are sent as multipart; JSON is capped by `express.json()` at 100 KB.
- The SSR bootstrap embeds the whole catalogue (now including descriptions) in every
  page; see ISSUE-019.
- Rollup names the shared TipTap chunk after `form-helpers`; it is loaded only by the
  lazy editors.

## How it is tested
`server/catalogue-input.test.js`, `server/products-routes.test.js` (routes with
`Category`/Cloudinary stubbed), `server/content.test.js`, `server/auth-routes.test.js`
(401s), `src/lib/seo.test.js` (canonicals, legacy/old-slug/moved resolution, schema,
sitemap), `server/seo.test.js` (real 301s and sitemap URLs return 200 without redirect),
`src/pages/ProductDetailPage.test.jsx`, `src/pages/CollectionPage.test.jsx`,
`src/lib/product-seo-check.test.js`, `src/api/products.test.js`,
`src/components/admin/admin-editors.test.jsx`. Real Cloudinary uploads and Atlas writes
are not automated; the editors were checked in the browser against a no-database server.

## Related
[blog.md](blog.md), [seo.md](seo.md), [security.md](security.md), [decisions.md](decisions.md).
