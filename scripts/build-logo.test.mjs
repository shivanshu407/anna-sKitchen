import { describe, it, expect } from 'vitest';
import { removeBackground, rowBands } from './build-logo.mjs';

const BG = [39, 40, 42];
const GOLD = [253, 200, 80];
const opts = { channels: 3, bg: BG, key: 0, fgLevel: 253 };

const pixel = (rgb) => removeBackground(Buffer.from(rgb), opts);
const blend = (a) => BG.map((b, c) => Math.round(a * GOLD[c] + (1 - a) * b));

describe('removeBackground', () => {
    it('makes pure background fully transparent', () => {
        expect(pixel(BG)[3]).toBe(0);
    });

    it('treats JPEG noise just above the background as background', () => {
        expect(pixel([BG[0] + 3, BG[1] + 3, BG[2] + 3])[3]).toBe(0);
    });

    it('keeps solid foreground fully opaque with its colour unchanged', () => {
        expect([...pixel(GOLD)]).toEqual([...GOLD, 255]);
    });

    it('recovers the true colour of an anti-aliased edge pixel instead of a dark fringe', () => {
        // A half-covered edge pixel looks like a muddy brown. A plain cutout would
        // paint that brown onto the page; un-mixing should give back the gold.
        const out = pixel(blend(0.5));

        expect(out[3]).toBeGreaterThan(110);
        expect(out[3]).toBeLessThan(140);
        out.slice(0, 3).forEach((v, c) => expect(Math.abs(v - GOLD[c])).toBeLessThanOrEqual(12));
    });

    it('produces alpha that rises with coverage', () => {
        const alphas = [0.2, 0.4, 0.6, 0.8].map((a) => pixel(blend(a))[3]);
        expect(alphas).toEqual([...alphas].sort((x, y) => x - y));
    });

    it('handles RGBA input by reading only the colour channels', () => {
        const out = removeBackground(Buffer.from([...GOLD, 255]), { ...opts, channels: 4 });
        expect([...out]).toEqual([...GOLD, 255]);
    });
});

describe('rowBands', () => {
    it('finds the separate bands of artwork, e.g. the "AK" mark and "SALES"', () => {
        const width = 2, height = 7;
        const rgba = Buffer.alloc(width * height * 4);
        for (const y of [1, 2, 5]) rgba[(y * width) * 4 + 3] = 255; // rows 1-2, then 5

        expect(rowBands(rgba, width, height)).toEqual([[1, 2], [5, 5]]);
    });

    it('ignores near-invisible pixels so faint noise cannot merge two bands', () => {
        const width = 1, height = 5;
        const rgba = Buffer.alloc(width * height * 4);
        rgba[0 * 4 + 3] = 255;
        rgba[2 * 4 + 3] = 4;   // stray noise between the bands
        rgba[4 * 4 + 3] = 255;

        expect(rowBands(rgba, width, height)).toEqual([[0, 0], [4, 4]]);
    });
});
