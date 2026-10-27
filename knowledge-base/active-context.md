## Current Status
**Last Updated**: 2026-10-27
**Last Agent Session**: Built the SEO/AEO-ready blog editor (TipTap), drafts, preview, editing, structured blog rendering and metadata (see blog.md and changelog). Committed on branch `blog-seo-editor` together with the earlier uncommitted SEO release work; not merged to main, pushed or deployed.
**Test Suite Status**: `npm test` 341/341 across 22 files, both builds pass (one run hit ISSUE-013, re-run green). Lint 0 errors, 1 pre-existing warning. Browser-verified locally without a database; Cloudinary uploads and Atlas saves not verified.

## In Progress (blog editor, 2026-10-27)
- [ ] Merge `blog-seo-editor` into main and deploy the release; the owner then publishes a test draft on production to confirm Cloudinary upload and Atlas save.
- [ ] After deploy: run Google's Rich Results Test / Schema validator on a live post and check sitemap `lastmod`.
- [ ] Optional: unsaved-changes prompt in the editor (ISSUE-018).

## Completed
- [x] Owner deployed aksales-hostinger-2026-10-02-final.zip; hPanel confirms Completed/Current.
- [x] aksales.in and www HTTPS routing and public catalogue/crawler endpoints verified.
- [x] Created old-domain redirect-only PHP/HTML entry on existing Business plan and connected already-correct nameservers.
- [x] Installed old public_html/.htaccess 301 redirect; tested 20 exact URL mappings and four real destinations.

## In Progress
- [ ] Verify both Search Console domain properties, submit the new sitemap and run Change of Address.
- [ ] Run the existing database rebrand script through the person with Atlas access (ISSUE-012).
- [ ] Rebranded brochure content and replacement email/Instagram when ready (ISSUE-010/011).
- [ ] Measure deployed/field performance; prior local mobile LCP 5.1s remains a lab limitation.

## Blocked On
- Search Console TXT values/property actions require the owner's session.
- Database branding correction requires Atlas access; no database writes made here.

## Next Steps
1. Complete Search Console migration separately; preserve old domain registration, TLS and redirect hosting for at least a year.
2. Monitor old/new URL indexing and measure deployed performance. The redirect task itself is complete.
3. For redirect changes, read deployment.md and deploy/htaccess-old-domain-redirect. Evidence is output/seo/old-domain-redirect-verification.json and old-domain-redirect-rule.jpg.

## Do Not Touch
- .env/private panel values: never log, serialize or commit secrets.
- public-original/: local-only originals; preserve them. Responsive generation is additive.
- User-owned older upload ZIPs: retained, but obsolete for the final release.
- Authentication-before-upload ordering and test environment blanking.
- server.js owns listen(); server/index.js only exports the app.
- The old domain's live .htaccess rule is installed ONLY in its redirect site. The hPanel Redirects list is intentionally empty; do not add a competing basic redirect or reintroduce the old-domain HTTPS hop.
- Keep old SSL active even though it serves only 301 responses.

## Live observations
aksales.in serves the final release, and /api/health reports database connected. The old
redirect entry's panel origin is 82.112.229.152; public CDN/resolver answers may differ.
The existing apollo/athena nameservers were already correct; no registrar nameserver
change was required. No purchase or duplicate Node deployment was needed. Local origin
still points to the previous owner's repository; no Git remote changes or pushes performed.
