import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { responsiveWidths } from './build-seo-assets.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(ROOT, 'src/data/image-manifest.json'), 'utf8'));

describe('responsive asset widths', () => {
    it('never upscales a small image', () => {
        expect(responsiveWidths(80)).toEqual([80]);
        expect(responsiveWidths(160)).toEqual([160]);
        expect(responsiveWidths(400)).toEqual([160, 400]);
    });

    it('uses requested breakpoints and the available source cap', () => {
        expect(responsiveWidths(600)).toEqual([160, 480, 600]);
        expect(responsiveWidths(1440)).toEqual([160, 480, 960, 1440]);
        expect(responsiveWidths(1920)).toEqual([160, 480, 960, 1440]);
    });

    it('handles fractional dimensions and rejects unusable metadata', () => {
        expect(responsiveWidths(399.8)).toEqual([160, 399]);
        [undefined, null, 0, -1, NaN, Infinity].forEach((width) => expect(responsiveWidths(width)).toEqual([]));
    });

    it('keeps SVGs and intrinsic logo dimensions in the manifest without favicon variants', () => {
        expect(manifest['/partners/rational.svg'].width).toBeGreaterThan(0);
        expect(manifest['/partners/rational.svg']).not.toHaveProperty('srcSet');
        expect(manifest['/images/ak-sales-logo.png'].srcSet).toContain('/responsive/images/ak-sales-logo-160w.webp 160w');
        expect(manifest).not.toHaveProperty('/favicon-32.png');
        expect(manifest).not.toHaveProperty('/apple-touch-icon.png');
        expect(Object.keys(manifest).some((key) => key.startsWith('/responsive/'))).toBe(false);
    });

    it('generates existing WebP derivatives whose descriptors match their actual width', async () => {
        for (const path of ['/images/ak-sales-logo.png', '/images/refrigeration/cold-bain-marie.webp', '/blog/download.webp']) {
            const info = manifest[path];
            const current = await sharp(join(ROOT, 'public', path.slice(1))).metadata();
            expect(info.width).toBe(current.width);
            expect(info.height).toBe(current.height);
            for (const source of info.srcSet.split(', ')) {
                const [url, descriptor] = source.split(' ');
                const file = join(ROOT, 'public', url.slice(1));
                expect(existsSync(file)).toBe(true);
                const derivative = await sharp(file).metadata();
                expect(derivative.format).toBe('webp');
                expect(derivative.width).toBe(Number(descriptor.slice(0, -1)));
                expect(derivative.width).toBeLessThanOrEqual(info.width);
                expect(derivative.width).toBeLessThanOrEqual(1440);
            }
        }
    });
});
