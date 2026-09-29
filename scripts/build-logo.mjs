/**
 * Build the site logo and favicons from one source image.
 *
 *   node scripts/build-logo.mjs [source]   (default: brand/ak-sales-logo-source.jpg)
 *
 * Outputs:
 *   public/images/ak-sales-logo.png  full lockup, transparent, header logo
 *   public/favicon-32.png            "AK" mark only, transparent
 *   public/favicon-192.png           "AK" mark only, transparent
 *   public/apple-touch-icon.png      "AK" mark on the source's own background
 *                                    (iOS has no transparency; it would fill black)
 *
 * The source is light artwork on a flat dark background. Rather than cutting
 * pixels in or out, alpha is recovered from the channel with the most contrast
 * and each edge pixel is un-mixed from the background, so anti-aliased edges
 * keep their gold colour instead of carrying a dark halo onto the page.
 */
import sharp from 'sharp';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Raw RGB(A) on a flat background -> RGBA with that background removed.
 *
 * `bg` is the background colour, `key` the channel index with the most
 * foreground/background contrast, `fgLevel` that channel's value in solid
 * foreground, `noise` the JPEG noise floor treated as pure background.
 */
export const removeBackground = (data, { channels, bg, key, fgLevel, noise = 6 }) => {
    const pixels = data.length / channels;
    const out = Buffer.alloc(pixels * 4);
    const span = fgLevel - bg[key] - noise;

    for (let p = 0; p < pixels; p++) {
        const i = p * channels;
        const o = p * 4;
        const a = Math.min(1, Math.max(0, (data[i + key] - bg[key] - noise) / span));
        if (a === 0) continue; // already transparent black

        // Observed = a * F + (1 - a) * bg  ->  F = (observed - (1 - a) * bg) / a
        for (let c = 0; c < 3; c++) {
            const f = (data[i + c] - (1 - a) * bg[c]) / a;
            out[o + c] = Math.min(255, Math.max(0, Math.round(f)));
        }
        out[o + 3] = Math.round(a * 255);
    }
    return out;
};

/** Consecutive runs of rows that contain any visible pixel: [[top, bottom], ...]. */
export const rowBands = (rgba, width, height, minAlpha = 16) => {
    const bands = [];
    let start = -1;
    for (let y = 0; y < height; y++) {
        let hit = false;
        for (let x = 0; x < width && !hit; x++) hit = rgba[(y * width + x) * 4 + 3] >= minAlpha;
        if (hit && start < 0) start = y;
        if (!hit && start >= 0) { bands.push([start, y - 1]); start = -1; }
    }
    if (start >= 0) bands.push([start, height - 1]);
    return bands;
};

/** Tight bounding box of visible pixels inside a row range. */
const boxOf = (rgba, width, top, bottom, minAlpha = 16) => {
    let left = width, right = -1;
    for (let y = top; y <= bottom; y++)
        for (let x = 0; x < width; x++)
            if (rgba[(y * width + x) * 4 + 3] >= minAlpha) { left = Math.min(left, x); right = Math.max(right, x); }
    return { left, top, width: right - left + 1, height: bottom - top + 1 };
};

const build = async (source) => {
    const { data, info } = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info;
    const px = (x, y) => [0, 1, 2].map((c) => data[(y * width + x) * channels + c]);

    // Background: the four corners must agree, or the "flat background" premise is false.
    const corners = [px(2, 2), px(width - 3, 2), px(2, height - 3), px(width - 3, height - 3)];
    const bg = corners[0];
    if (corners.some((c) => c.some((v, i) => Math.abs(v - bg[i]) > 6)))
        throw new Error(`Corners disagree (${JSON.stringify(corners)}); background is not flat.`);

    // Key channel = the one where bright foreground stands furthest from the background.
    const bright = [];
    for (let i = 0; i < data.length; i += channels)
        if (data[i] + data[i + 1] + data[i + 2] > bg[0] + bg[1] + bg[2] + 300) bright.push(i);
    const level = (c) => {
        const v = bright.map((i) => data[i + c]).sort((a, b) => a - b);
        return v[Math.floor(v.length * 0.5)]; // median solid-foreground value
    };
    const key = [0, 1, 2].reduce((best, c) => (level(c) - bg[c] > level(best) - bg[best] ? c : best), 0);
    const fgLevel = level(key);

    const rgba = removeBackground(data, { channels, bg, key, fgLevel });
    const raw = { raw: { width, height, channels: 4 } };

    const bands = rowBands(rgba, width, height);
    const whole = boxOf(rgba, width, bands[0][0], bands[bands.length - 1][1]);
    const mark = boxOf(rgba, width, bands[0][0], bands[0][1]); // first band = "AK"

    // Header logo: full lockup, trimmed.
    await sharp(rgba, raw).extract(whole)
        .resize({ width: 400 })
        .png({ compressionLevel: 9, palette: true, quality: 100 })
        .toFile(join(ROOT, 'public/images/ak-sales-logo.png'));

    // Square icon canvases around the mark, with breathing room.
    const markPng = await sharp(rgba, raw).extract(mark).png().toBuffer();
    const square = (padRatio, background) => {
        const side = Math.round(Math.max(mark.width, mark.height) * (1 + padRatio * 2));
        return sharp({ create: { width: side, height: side, channels: 4, background } })
            .composite([{
                input: markPng,
                left: Math.round((side - mark.width) / 2),
                top: Math.round((side - mark.height) / 2),
            }])
            .png();
    };
    const clear = { r: 0, g: 0, b: 0, alpha: 0 };
    const solid = { r: bg[0], g: bg[1], b: bg[2], alpha: 1 };

    for (const size of [32, 192]) {
        const buf = await square(0.04, clear).toBuffer();
        await sharp(buf).resize(size, size).png({ compressionLevel: 9 })
            .toFile(join(ROOT, `public/favicon-${size}.png`));
    }
    const touch = await square(0.14, solid).toBuffer();
    await sharp(touch).resize(180, 180).flatten({ background: solid }).png({ compressionLevel: 9 })
        .toFile(join(ROOT, 'public/apple-touch-icon.png'));

    return { bg, key: 'RGB'[key], fgLevel, bands, whole, mark };
};

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
    const source = process.argv[2] ?? join(ROOT, 'brand/ak-sales-logo-source.jpg');
    const report = await build(source);
    console.log(JSON.stringify(report, null, 2));
}
