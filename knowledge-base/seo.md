# SEO, Analytics & Search Console

## What this subsystem does
Controls what search engines and browser tabs show for each page, and reports traffic to
Google Analytics. Added by the repo owner (MBKANERIYA) on 2026-09-08 and 2026-09-10;
adjusted during the AK Sales rebrand on 2026-09-29.

## How it is structured
| Piece | Where | Role |
|-------|-------|------|
| Site-wide `<title>` and `<meta name="description">` | `index.html` | What crawlers see before JavaScript runs, and the default on pages without `<SEO>` |
| `<SEO>` component | `src/components/SEO.jsx` | Per-page title (`"<title> \| AK Sales"`), description, keywords, via `react-helmet-async` |
| `HelmetProvider` | `src/main.jsx` | Required wrapper for `<SEO>` |
| Google Analytics (gtag.js) | `index.html` | Measurement ID `G-EZE8DTQTEB`, loaded on every page |
| Google site verification | `index.html` `<meta name="google-site-verification">` | Proves ownership of the domain the page is served from |

Pages that set `<SEO>`: Home, Collections, a single collection, Blogs, a single blog post,
Admin Dashboard. All others (About, Services, Projects, Contact, product detail, admin login)
show the `index.html` title and description.

## Conventions and rules
- **Name and city:** "AK Sales", Surat. `src/branding.test.js` fails the build if "Anna
  Kitchen" or "Lucknow" appears in `<head>` or anywhere in shipped code.
- **The Home page `<SEO>` title must be descriptive, not "Home".** `<SEO>` replaces the
  `index.html` title once React loads, so the Home `<SEO>` title is what JavaScript-running
  crawlers index. A test enforces that it is not "Home" and names Surat.
- **Keep the `index.html` title and description meaningful.** They are what non-JavaScript
  crawlers and social previews read, and the fallback for every page without `<SEO>`.
- One Analytics ID covers any domain — nothing changes in code for the move to aksales.in.

## Known gotchas
- **Duplicate description tags (ISSUE-014).** On pages with `<SEO>`, Helmet *adds* a second
  `<meta name="description">` rather than replacing the one in `index.html` (verified in a
  browser on `/collections`: two tags). Google may show either.
- **Titles switch late on data-driven pages.** Collections renders `<SEO>` only after its
  product fetch finishes, so the tab briefly shows the site-wide title. Harmless for search
  engines, which wait for rendering.
- **Client-side navigation resets correctly.** Moving from a page with `<SEO>` to one without
  restores the `index.html` title and removes the extra description (verified).
- **Site verification is tied to the domain serving the page.** Once annakitchenequipment.com
  only redirects, its meta-tag verification lapses. Verify both domains in Search Console by
  **DNS** before using Change of Address — see `deployment.md`.
- The server dependency `helmet` (Express security headers) is unrelated to
  `react-helmet-async` and is currently not used at all (ISSUE-015).

## How it is tested
`src/branding.test.js`: no old name in shipped code, `index.html` title names AK Sales and
Surat, no Lucknow in `<head>`, Home `<SEO>` title is descriptive.
Not automated: the rendered `<head>` per page, Analytics firing, and Search Console state —
these need a browser or Google's tools. The behaviour above was checked manually on
2026-10-01.

## Related
- [deployment.md](deployment.md) — domain move and Search Console steps
- [decisions.md](decisions.md) — the rebrand decision
- [known-issues.md](known-issues.md) — ISSUE-014, ISSUE-015
