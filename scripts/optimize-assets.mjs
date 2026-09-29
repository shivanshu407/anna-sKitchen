/**
 * Asset optimizer for static hosting (Hostinger).
 *
 * Builds an optimized copy of public/ into public-optimized/, then (with --apply)
 * swaps it in, moving the untouched originals to public-original/. Nothing is deleted.
 *
 * Why a separate directory instead of in-place conversion: Windows filesystems are
 * case-insensitive, so slugifying "clients/Logo.webp" -> "clients/logo.webp" targets
 * the very file being read. Building fresh and swapping avoids that class of bug.
 *
 *   node scripts/optimize-assets.mjs          # build + report only
 *   node scripts/optimize-assets.mjs --apply  # build, then swap directories
 */
import sharp from 'sharp';
import { readdirSync, statSync, existsSync, mkdirSync, copyFileSync, renameSync, writeFileSync, rmSync } from 'node:fs';
import { join, relative, dirname, extname, sep } from 'node:path';
import { slugPath } from './slugify.mjs';

const ROOT = process.cwd();
const PUBLIC = join(ROOT, 'public');
const STAGE = join(ROOT, 'public-optimized');
const BACKUP = join(ROOT, 'public-original');
const APPLY = process.argv.includes('--apply');

const RASTER = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif']);
// Brand files built by scripts/build-logo.mjs. Kept as PNG so the favicon works
// in every browser and the paths referenced in index.html and the header stay valid.
const KEEP_FORMAT = new Set([
  '/images/ak-sales-logo.png',
  '/favicon-32.png',
  '/favicon-192.png',
  '/apple-touch-icon.png',
]);

// Logos render small; product and hero art needs to stay crisp on retina.
// Top-level /images/*.ext are heroes and full-bleed backgrounds, so they keep more width
// than the product shots inside category subfolders.
const maxWidthFor = (p) =>
  /^\/(clients|partners)\//.test(p) ? 400
    : /^\/images\/logo\./.test(p) ? 400
      : /^\/blog\//.test(p) ? 1200
        : /^\/images\/[^/]+$/.test(p) ? 1920
          : 1600;

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}

const files = walk(PUBLIC).map((abs) => '/' + relative(PUBLIC, abs).split(sep).join('/'));

// ---- old -> new mapping; refuse to run if two assets would share a slug ----
const map = new Map();
const taken = new Map();
for (const oldPath of files) {
  const ext = extname(oldPath).toLowerCase();
  let newPath = '/' + slugPath(oldPath.slice(1));
  if (RASTER.has(ext) && !KEEP_FORMAT.has(oldPath)) newPath = newPath.replace(/\.[^.]+$/, '.webp');
  const key = newPath.toLowerCase();
  if (taken.has(key)) throw new Error(`Slug collision: "${oldPath}" and "${taken.get(key)}" both map to "${newPath}"`);
  taken.set(key, oldPath);
  map.set(oldPath, newPath);
}

if (existsSync(STAGE)) rmSync(STAGE, { recursive: true, force: true }); // regenerated output only
mkdirSync(STAGE, { recursive: true });

let before = 0, after = 0;
const rows = [];

for (const [oldPath, newPath] of map) {
  const srcAbs = join(PUBLIC, oldPath.slice(1));
  const outAbs = join(STAGE, newPath.slice(1));
  const ext = extname(oldPath).toLowerCase();
  const srcBytes = statSync(srcAbs).size;
  before += srcBytes;
  mkdirSync(dirname(outAbs), { recursive: true });

  if (RASTER.has(ext)) {
    const img = sharp(srcAbs);
    const meta = await img.metadata();
    const max = maxWidthFor(oldPath);
    const p = meta.width > max ? img.resize({ width: max, withoutEnlargement: true }) : img;
    // palette:true quantises to an indexed PNG — ~4x smaller on flat logo art
    // and still smaller than WebP at equivalent quality.
    if (KEEP_FORMAT.has(oldPath)) await p.png({ compressionLevel: 9, palette: true }).toFile(outAbs);
    else await p.webp({ quality: 82, effort: 6 }).toFile(outAbs);
  } else {
    copyFileSync(srcAbs, outAbs);
  }

  const outBytes = statSync(outAbs).size;
  after += outBytes;
  rows.push([oldPath, newPath, srcBytes, outBytes]);
}

writeFileSync(join(ROOT, 'scripts', 'asset-map.json'), JSON.stringify(Object.fromEntries(map), null, 2));

const stagedCount = walk(STAGE).length;
if (stagedCount !== files.length) throw new Error(`Expected ${files.length} optimized files, produced ${stagedCount}`);

rows.sort((a, b) => (b[2] - b[3]) - (a[2] - a[3]));
console.log(`${APPLY ? 'APPLY' : 'BUILD ONLY'} — ${rows.length} assets, all accounted for\n`);
console.log('  biggest savings:');
for (const [, n, sb, ob] of rows.slice(0, 10)) {
  console.log(`  ${(sb / 1024).toFixed(0).padStart(6)} KB -> ${(ob / 1024).toFixed(0).padStart(5)} KB   ${n}`);
}
console.log(`\n  before: ${(before / 1024 / 1024).toFixed(1)} MB`);
console.log(`  after:  ${(after / 1024 / 1024).toFixed(1)} MB   (${(100 - (after / before) * 100).toFixed(1)}% smaller)`);

if (APPLY) {
  if (existsSync(BACKUP)) throw new Error(`${BACKUP} already exists — move it aside before applying.`);
  renameSync(PUBLIC, BACKUP);   // originals preserved, not deleted
  renameSync(STAGE, PUBLIC);
  console.log(`\n  swapped: originals -> public-original/, optimized -> public/`);
}
