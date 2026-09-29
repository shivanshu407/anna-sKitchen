import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// These cover the behaviour Hostinger depends on: one Node process serving both
// the API and the built SPA, with correct routing and cache headers.

const here = dirname(fileURLToPath(import.meta.url));
const DIST = join(here, '..', 'dist');

let server;
let base;

beforeAll(async () => {
    // No database in tests — the API must still boot and answer.
    // Empty, never deleted: a deleted variable is refilled by dotenv from a
    // local .env, which pointed these tests at the production database.
    process.env.MONGODB_URI = '';
    const { default: app } = await import('./index.js');
    await new Promise((resolve) => {
        server = app.listen(0, resolve);
    });
    base = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
});

describe('test isolation', () => {
    it('never picks up a real database from a local .env', () => {
        // One test logs in and sends DELETE /api/products/heating-range/0 to prove
        // the route is unlocked. Against a real database that deletes a product.
        expect(process.env.MONGODB_URI).toBe('');
    });
});

describe('API routing', () => {
    it('answers the health check without a database', async () => {
        const res = await fetch(`${base}/api/health`);
        expect(res.status).toBe(200);

        const body = await res.json();
        expect(body.status).toBe('ok');
        expect(body.db).toBe('disconnected');
    });

    it('returns JSON 404 for an unknown API route, not the SPA shell', async () => {
        // The SPA fallback would otherwise answer /api/typo with index.html and a
        // 200, turning a broken endpoint into a silent blank page.
        const res = await fetch(`${base}/api/definitely-not-real`);

        expect(res.status).toBe(404);
        expect(res.headers.get('content-type')).toMatch(/application\/json/);
        await expect(res.json()).resolves.toMatchObject({ error: expect.any(String) });
    });
});

describe('static hosting', () => {
    // Fail rather than skip. `npm test` builds via pretest, so a missing dist/ means
    // something is wrong — and silently skipping these eight assertions once already
    // hid the whole hosting contract during a run that looked mostly green.
    beforeAll(() => {
        if (!existsSync(DIST)) {
            throw new Error(
                'dist/ is missing — run "npm run build" first. ' +
                '"npm test" does this automatically via the pretest script.'
            );
        }
    });

    it('serves the SPA shell at the root', async () => {
        const res = await fetch(`${base}/`);
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toMatch(/text\/html/);
        await expect(res.text()).resolves.toContain('<div id="root">');
    });

    it('serves the SPA shell for a deep client-side route', async () => {
        // A hard refresh on a nested URL must not 404 — this is the single most
        // common SPA hosting failure.
        const res = await fetch(`${base}/collections/heating-range/Dosa%20Bhatti`);
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toMatch(/text\/html/);
    });

    it('marks the app shell no-cache so new deploys are picked up', async () => {
        const res = await fetch(`${base}/`);
        expect(res.headers.get('cache-control')).toBe('no-cache');
    });

    it('marks fingerprinted assets immutable', async () => {
        const html = await (await fetch(`${base}/`)).text();
        const assetPath = html.match(/\/assets\/[A-Za-z0-9._-]+\.js/)?.[0];
        expect(assetPath, 'built index.html should reference a hashed JS asset').toBeTruthy();

        const res = await fetch(base + assetPath);
        expect(res.status).toBe(200);
        expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    });

    it('serves public/ assets with a shorter TTL, since their names are stable', async () => {
        const res = await fetch(`${base}/images/ak-sales-logo.png`);
        expect(res.status).toBe(200);
        expect(res.headers.get('cache-control')).toBe('public, max-age=2592000');
    });

    it('points every favicon link at a real PNG', async () => {
        // Guards two past failures: a relative favicon href that 404'd on nested
        // routes, and a logo rename that could leave index.html pointing at nothing.
        const html = await (await fetch(`${base}/`)).text();
        const hrefs = [...html.matchAll(/<link[^>]+rel="(?:icon|apple-touch-icon)"[^>]*>/g)]
            .map((m) => m[0].match(/href="([^"]+)"/)[1]);

        expect(hrefs.length).toBeGreaterThanOrEqual(2);
        for (const href of hrefs) {
            expect(href, 'favicon hrefs must be absolute').toMatch(/^\//);
            const res = await fetch(base + href);
            expect(res.status, href).toBe(200);
            expect(res.headers.get('content-type'), href).toBe('image/png');
        }
    });

    it('serves a slugified WebP product image', async () => {
        // Guards the rename: this path only exists after the asset optimisation.
        const res = await fetch(`${base}/images/chaat-and-fast-food-counter/pani-puri-counter.webp`);
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toBe('image/webp');
    });
});
