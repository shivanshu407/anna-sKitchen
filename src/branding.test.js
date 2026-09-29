import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// The site was renamed from "Anna Kitchen Equipments" to "AK Sales" on
// 2026-09-29. These guard against the old name drifting back in via copied
// text, new pages, or merges of older branches.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const walk = (dir) => readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
});

const shipped = [
    ...walk(join(ROOT, 'src')).filter((p) => /\.(jsx?|css)$/.test(p) && !/\.test\./.test(p)),
    join(ROOT, 'index.html'),
];

// Deliberately still in use until replacements exist — see known-issues.md.
const KEPT_CONTACT_HANDLES = /annaskitchenequipment@gmail\.com|annas_kitchen_equipments/g;

describe('AK Sales branding', () => {
    it('never shows the old business name', () => {
        const offenders = [];
        for (const file of shipped) {
            readFileSync(file, 'utf8')
                .replace(KEPT_CONTACT_HANDLES, '')
                .split('\n')
                .forEach((line, i) => {
                    if (/anna'?s?[\s-]*kitchen/i.test(line)) {
                        offenders.push(`${relative(ROOT, file)}:${i + 1}  ${line.trim().slice(0, 80)}`);
                    }
                });
        }
        expect(offenders).toEqual([]);
    });

    it('names AK Sales and Surat in the page title Google sees before JavaScript runs', () => {
        const title = readFileSync(join(ROOT, 'index.html'), 'utf8').match(/<title>(.*?)<\/title>/)[1];
        expect(title).toContain('AK Sales');
        expect(title).toContain('Surat');
    });

    it('does not claim the business is in Lucknow', () => {
        // The address, map and the rest of the site are Surat; the title used to
        // say Lucknow, which put the wrong city in search results.
        const head = readFileSync(join(ROOT, 'index.html'), 'utf8').split('</head>')[0];
        expect(head).not.toMatch(/lucknow/i);
    });

    it('gives the home page a descriptive title, not just "Home"', () => {
        // <SEO> replaces the index.html title once React loads, so this is the
        // title search engines that run JavaScript actually index.
        const home = readFileSync(join(ROOT, 'src/pages/Home.jsx'), 'utf8');
        const title = home.match(/<SEO[^>]*title="([^"]+)"/)[1];
        expect(title).not.toBe('Home');
        expect(title).toContain('Surat');
    });
});
