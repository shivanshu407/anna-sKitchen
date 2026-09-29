# Static Assets

## What this subsystem does
Everything the browser loads that is not code: product photography, client and partner
logos, blog images, and the brochure PDF. All of it lives in `public/` and is copied
verbatim into `dist/` by Vite.

On 2026-09-07 this directory was reduced from **128.4 MB to 23.6 MB (-81.6%)**, and every
filename was normalised. The images alone went from ~111 MB to ~6.9 MB; the remaining bulk
is the 16.7 MB brochure PDF.

## How it is structured
| Path                  | Contents                                    |
|-----------------------|---------------------------------------------|
| `public/`             | Optimised, slug-named assets. **Generated.** |
| `public-original/`    | Untouched originals. Local backup, gitignored |
| `scripts/slugify.mjs` | Filename rules (shared, unit-tested)         |
| `scripts/optimize-assets.mjs`   | The conversion pipeline            |
| `scripts/rewrite-asset-refs.mjs`| Rewrites source references         |
| `scripts/asset-map.json`        | old path -> new path, from the last run |
| `scripts/audit-assets.mjs`      | Finds broken and unused references |

## Conventions and rules
- **Filenames are lowercase, hyphenated, ASCII.** No spaces, `&`, or parentheses.
  `&` becomes `and` rather than vanishing, so `Chaat & Fast Food` cannot collide with
  `Chaat Fast Food`. Lowercase matters because production is Linux (case-sensitive) and
  the dev machine is Windows (not).
- **Rasters are WebP**, quality 82. Max widths: 400 px for logos (`clients/`, `partners/`,
  `images/logo.*`), 1200 px for `blog/`, 1920 px for top-level `images/*` (heroes and
  full-bleed backgrounds), 1600 px for product shots in category subfolders.
- **Brand files are built, not optimised.** `scripts/build-logo.mjs` generates
  `images/ak-sales-logo.png` (header), `favicon-32.png`, `favicon-192.png` and
  `apple-touch-icon.png` from `brand/ak-sales-logo-source.jpg`. They are listed in
  `KEEP_FORMAT` so the optimiser leaves them as PNG under their own names — renaming them
  to WebP would break the paths in `index.html` and the header.
- **Replacing a logo means a new filename, never an overwrite.** `/images/*` is cached for
  30 days; overwriting in place shows returning visitors the old logo for up to a month.
  The previous `images/logo.png` was removed for this reason when the AK Sales logo landed.
- **Do not hand-edit `public/`.** Put new originals in `public-original/`, then re-run the
  pipeline and the reference rewriter.
- Admin-uploaded images go to **Cloudinary**, not to `public/`, and bypass this pipeline
  entirely.

## Adding new images
```bash
# 1. put the new original in public-original/<folder>/
# 2. move public/ aside so the swap guard passes, then rebuild from originals
# 3. re-run and re-point references
node scripts/optimize-assets.mjs           # build + report, no swap
node scripts/optimize-assets.mjs --apply   # swap in
node scripts/rewrite-asset-refs.mjs        # update src/ + index.html
node scripts/audit-assets.mjs              # expect "MISSING: 0"
```
`--apply` refuses to run when `public-original/` already exists, so it cannot silently
overwrite the backup. Move the existing backup aside first, deliberately.

## Known gotchas
- **Brand source lives in `brand/`, not `public-original/`.** Anything in
  `public-original/` becomes a public asset on the next optimiser rebuild.
- **Background removal assumes a flat background.** `build-logo.mjs` samples the four
  corners and refuses to run if they disagree. It derives alpha from the channel with the
  most contrast (red, for gold on charcoal) and un-mixes edge pixels, so edges keep their
  gold instead of a dark halo. A logo on a photo or gradient needs a different approach.
- **The favicon is the "AK" mark only.** At 16-32 px "SALES" is illegible, so the script
  crops to the first band of artwork. On a white browser tab the pale-yellow half of the K
  is faint — an accepted consequence of gold on transparent (ISSUE-009).
- **The database holds its own copy of every product and blog image path.** Renaming
  anything in `public/` therefore needs a matching database migration — see
  `scripts/migrate-image-paths.mjs` and ISSUE-007. This was missed during the original
  rename and broke every image on the live site. It is invisible locally, because with no
  `MONGODB_URI` the front-end falls back to the bundled catalogue, which does get updated.
  **Always check the live API, not just the local build, after touching asset names.**
- **The optimiser is not idempotent.** Running it against an already-optimised `public/`
  re-encodes WebP that is already WebP, losing a little quality each pass. Always source
  from `public-original/`.
- **Windows case-insensitivity broke the first attempt.** Converting in place made
  `clients/Logo.webp` -> `clients/logo.webp` target the very file being read, and sharp
  failed with `unable to open for write`. The pipeline now builds into `public-optimized/`
  and swaps directories, which sidesteps the whole class of problem.
- **`basename(file, ext)` matches case-sensitively.** Lower-casing the extension before
  stripping it produced `photo-jpeg.jpeg` from `Photo.JPEG`. Fixed, and covered by a test.
  No shipped asset was affected — every original extension was already lowercase.
- The brochure PDF (16.7 MB) is **not** compressed; it is 70% of what remains in `public/`.
  It is only fetched on click, so it costs nothing on page load, but it is the obvious next
  win if disk or bandwidth becomes tight.
- `images/annas-logo-1.webp` (75 KB) and `vite.svg` are unreferenced. Harmless, left alone.

## How it is tested
`scripts/slugify.test.mjs` covers the naming rules: lower-casing, `&` -> `and`, collapsing
spaces/dots/parentheses, trimming, per-segment directory slugging, extension handling, and
that two similar real filenames stay distinct.

`server/server.test.js` asserts one slugified WebP is actually served with `image/webp`,
which catches a rename that was not propagated.

Deliberately not automated: visual quality of the conversions (checked by eye at the time)
and the byte-size numbers above.

## Related
- [deployment.md](deployment.md) — cache headers applied to these files
- [changelog.md](changelog.md) — the migration entry
