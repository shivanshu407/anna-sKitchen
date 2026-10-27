import sharp from 'sharp';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slugPath } from './slugify.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RASTER = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif']);
const SKIP_DIRECTORIES = new Set(['responsive', 'fonts', 'icons']);

export function responsiveWidths(sourceWidth) {
    if (!Number.isFinite(sourceWidth) || sourceWidth < 1) return [];
    const cap = Math.floor(sourceWidth);
    return [...new Set([160, 480, 960, 1440, Math.min(cap, 1440)].filter((width) => width <= cap))].sort((a, b) => a - b);
}

function filesUnder(directory) {
    return readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((entry) => {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) return SKIP_DIRECTORIES.has(entry.name) ? [] : filesUnder(path);
        return entry.isFile() ? [path] : [];
    });
}

export function buildSourceMap(root = ROOT) {
    const mapFile = join(root, 'scripts', 'asset-map.json');
    if (!existsSync(mapFile)) return new Map();
    return new Map(Object.entries(JSON.parse(readFileSync(mapFile, 'utf8'))).map(([original, current]) => [current, original]));
}

export async function buildSeoAssets(root = ROOT) {
    const publicRoot = join(root, 'public');
    const originalRoot = join(root, 'public-original');
    const manifestFile = join(root, 'src', 'data', 'image-manifest.json');
    const sourceMap = buildSourceMap(root);
    const manifest = {};
    let variants = 0;
    const outputs = new Set();

    for (const file of filesUnder(publicRoot)) {
        const path = '/' + relative(publicRoot, file).split(sep).join('/');
        const ext = extname(file).toLowerCase();
        if (!RASTER.has(ext) && ext !== '.svg') continue;
        if (/\/(?:favicon[^/]*|apple-touch-icon|icon[^/]*)\.(?:png|svg|webp)$/i.test(path)) continue;
        const metadata = await sharp(file).metadata();
        if (!metadata.width || !metadata.height) continue;
        manifest[path] = { width: metadata.width, height: metadata.height };
        if (ext === '.svg') continue;

        const mapped = sourceMap.get(path);
        const original = mapped ? resolve(originalRoot, '.' + mapped) : null;
        const withinOriginal = original && (original.startsWith(originalRoot + sep));
        const source = withinOriginal && existsSync(original) ? original : file;
        const sourceMeta = source === file ? metadata : await sharp(source).metadata();
        const maxWidth = Math.min(metadata.width, sourceMeta.width);
        const base = slugPath(relative(publicRoot, file).split(sep).join('/')).replace(/\.[^.]+$/, '');
        const sources = [];
        for (const width of responsiveWidths(maxWidth)) {
            const outputPath = `/responsive/${base}-${width}w.webp`;
            if (outputs.has(outputPath)) throw new Error(`Responsive asset collision: ${outputPath}`);
            outputs.add(outputPath);
            const output = join(publicRoot, outputPath.slice(1));
            mkdirSync(dirname(output), { recursive: true });
            await sharp(source).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 82, effort: 5 }).toFile(output);
            const actual = await sharp(output).metadata();
            sources.push(`${outputPath} ${actual.width}w`);
            variants += 1;
        }
        manifest[path].srcSet = sources.join(', ');
    }

    mkdirSync(dirname(manifestFile), { recursive: true });
    writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
    let fonts = 0;
    const sourceFonts = join(root, 'brand', 'fonts');
    if (existsSync(sourceFonts)) {
        const outputFonts = join(publicRoot, 'fonts');
        mkdirSync(outputFonts, { recursive: true });
        for (const file of readdirSync(sourceFonts).sort()) {
            if (!/\.(?:woff2|txt)$/.test(file)) continue;
            copyFileSync(join(sourceFonts, file), join(outputFonts, file));
            if (file.endsWith('.woff2')) fonts += 1;
        }
    }
    return { images: Object.keys(manifest).length, variants, fonts };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const result = await buildSeoAssets();
    console.log(`SEO assets: ${result.images} image dimensions, ${result.variants} responsive variants, ${result.fonts} local fonts.`);
}
