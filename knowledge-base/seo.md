# SEO, Analytics & Search Console

## What this subsystem does
Defines crawlable AK Sales pages for the canonical origin https://aksales.in. Metadata and public content are present in the initial HTML and remain consistent during browser navigation. The owner deployed the final release on 2026-10-02; live crawler endpoints, route statuses and old-domain redirects were verified. Search Console migration remains pending.

## How it is structured
| Piece | Location | Responsibility |
|---|---|---|
| Shared route resolver | src/lib/seo.js | Titles, descriptions, canonical paths, indexability, schema and sitemap |
| Single metadata owner | src/components/SEO.jsx, mounted in App | Helmet metadata, Open Graph, Twitter and safely serialized JSON-LD |
| Initial HTML | src/entry-server.jsx, server/web.js | Server-rendered head/body and matching catalogue bootstrap |
| Crawler endpoints | server/web.js | Real text/plain robots.txt and application/xml sitemap.xml |
| Host normalization | server/index.js | HTTP/www aksales.in to HTTPS apex, index.html and legacy brochure aliases |
| Analytics | index.html | Existing GA4 ID G-EZE8DTQTEB and existing verification tag retained |

## Conventions and rules
- Business name AK Sales, Surat; canonical origin is fixed, independent of the incoming Host header. Queries do not enter canonical URLs.
- All seven static public routes and valid product/blog routes have specific titles/descriptions. Schema uses the business contact/address already present on the site, breadcrumbs, products and articles.
- Do not invent prices, availability, reviews, ratings, coordinates, opening hours or publication dates. Product markup without offers/reviews is not a promise of Google product rich results.
- Keep existing category, encoded product-name and blog URLs during the domain migration, including the legacy Lucknow blog slug. Normalize trailing slashes and product-name casing with 301s while preserving query strings.
- Missing pages and files return 404. Admin pages, APIs, PDFs and empty collections are noindex; admin/API and empty categories stay out of the sitemap. The sitemap includes only existing indexable routes and has no invented lastmod dates.
- No database configured uses bundled content. A configured database outage returns a retryable 503 for the sitemap and unknown dynamic records, avoiding false permanent deletion signals.
- Blog posts (2026-10-27, see blog.md): title is the post's SEO title or "<title> | AK Sales Surat"; description is meta description → summary → first paragraph. BlogPosting carries datePublished (`publishedAt` ISO, else the legacy display date), dateModified (`updatedAt`), author name/url, articleSection, keywords (tags), wordCount and articleBody. FAQPage is added only when the post has visible FAQs. Drafts are 404 and never in the sitemap; blog sitemap entries carry `lastmod` from `updatedAt` when it exists (bundled posts have none). Blog `og:image:alt` is the image alt (or title, without the brand suffix); article pages add `article:published_time`/`modified_time`.
- SSR removes the template fallback metadata before inserting route metadata. Development fallback tags carry data-rh ownership. Keep one SEO component rather than adding page-specific copies.
- Old-domain redirects remain a Hostinger responsibility. Activate them only after the new site works over HTTPS, preserving paths and queries.

## Known gotchas
React 19 hoists metadata natively; the older Helmet server context is empty. The server renders a complete document and extracts its head. JSON-LD inside the rendered body is valid. See rendering.md for the snapshot/cache contract.

Search Console ownership and Change of Address require the owner's session. Verify both domain properties by DNS using their actual TXT tokens; the existing HTML verification tag does not prove the new property. Submit https://aksales.in/sitemap.xml after deployment. Keep the old domain and redirects for at least a year.

Earlier on 2026-10-02 the old deployment served the old brand/city and HTML crawler files.
The final release is now live on aksales.in, with XML/text crawler files and real 404s.
Old-domain HTTP/HTTPS apex/www URLs return one-hop 301s with raw encoded paths and queries
preserved (20/20 live checks). These checks do not establish indexing, rankings, field
Core Web Vitals, Analytics delivery or rich-result eligibility. The retained email/Instagram
and old brochure contents need owner-supplied replacements.

## How it is tested
src/lib/seo.test.js covers route metadata, URLs, schema, date validation, escaping, noindex and sitemap construction. server/seo.test.js exercises real built HTML, every fallback sitemap URL, statuses, metadata uniqueness, redirects and outage semantics. src/branding.test.js guards the brand/city. Run npm test to build both bundles and run all tests.

Browser verification covers hydration, metadata after navigation, mobile overflow and font loading. Local mobile Lighthouse reports are saved under output/seo; these are lab measurements, not deployed or field results. Search Console ownership, live redirects, live database content and Analytics collection remain external checks.

## Related
[rendering.md](rendering.md), [deployment.md](deployment.md), [assets.md](assets.md), [testing.md](testing.md), [known-issues.md](known-issues.md).
