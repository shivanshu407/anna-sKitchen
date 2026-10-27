import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { getPageInfo } from '../src/lib/seo.js';
import { productPath } from '../src/lib/catalogue.js';
import { fallbackData } from '../src/lib/site-data.js';

let server, base;
beforeAll(async () => {
    process.env.MONGODB_URI = '';
    const { default: app } = await import('./index.js');
    await new Promise(resolve => { server = app.listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(async () => { if (server) await new Promise(resolve => server.close(resolve)); });

describe('crawlable production HTML', () => {
    it.each(['/', '/about', '/services', '/projects', '/contact', '/collections', '/blogs', '/collections/heating-range', '/collections/heating-range/dosa-bhatti', '/blog/commercial-dishwasher-buying-guide-2025'])('serves complete metadata and visible content before JavaScript at %s', async path => {
        const response = await fetch(base + path, { redirect: 'manual' });
        const html = await response.text();
        const head = html.split('</head>')[0];
        const page = getPageInfo(path);
        expect(response.status).toBe(200);
        expect(head.match(/<title\b/g)).toHaveLength(1);
        expect(head.match(/name="description"/g)).toHaveLength(1);
        expect(head.match(/rel="canonical"/g)).toHaveLength(1);
        expect(head).toContain(page.canonical);
        expect(head).toContain('property="og:url"');
        expect(head).toContain('name="twitter:card"');
        expect(html).toMatch(/<h1\b/);
        expect(html).not.toContain('Loading products...');
        expect(html).not.toContain('Loading collections...');
        expect(html).toContain('id="site-data"');
        const schema = JSON.parse(html.match(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/s)[1]);
        expect(schema['@graph'].some(node => node['@type'] === 'LocalBusiness')).toBe(true);
    });
    it('renders product and blog text with crawlable internal links', async () => {
        const product = await (await fetch(base + '/collections/heating-range/dosa-bhatti')).text();
        expect(product).toContain('Dosa');
        expect(product).toContain('Bhatti');
        expect(product).toContain('href="/collections/heating-range"');
        const blog = await (await fetch(base + '/blog/commercial-dishwasher-buying-guide-2025')).text();
        expect(blog).toContain('Why a Commercial Dishwasher is Essential');
    });
    it('preserves the brochure link and keeps the old PDF branding out of search', async () => {
        const old = await fetch(base + '/anna-kitchen-broucher.pdf', { redirect: 'manual' });
        expect(old.status).toBe(301);
        expect(old.headers.get('location')).toBe('/ak-sales-brochure.pdf');
        const pdf = await fetch(base + '/ak-sales-brochure.pdf');
        expect(pdf.status).toBe(200);
        expect(pdf.headers.get('x-robots-tag')).toBe('noindex');
    });
    it.each(['/does-not-exist', '/collections/unknown', '/collections/heating-range/Unknown', '/blog/unknown', '/images/missing.webp'])('returns HTTP 404 for missing content at %s', async path => {
        const response = await fetch(base + path);
        expect(response.status).toBe(404);
        expect(response.headers.get('x-robots-tag')).toContain('noindex');
    });
    it.each(['/admin/login', '/admin/dashboard', '/collections/hotel-and-restaurant'])('keeps non-public or empty content out of the index at %s', async path => {
        const response = await fetch(base + path);
        expect(response.status).toBe(200);
        expect(response.headers.get('x-robots-tag')).toContain('noindex');
        expect(await response.text()).toMatch(/name="robots" content="noindex, follow"/);
    });
    it('permanently redirects trailing slashes, legacy product-name URLs and slug casing to the canonical while keeping queries', async () => {
        for (const [source, target] of [
            ['/about/?utm_source=test', '/about?utm_source=test'],
            ['/collections/heating-range/Dosa%20Bhatti', '/collections/heating-range/dosa-bhatti'],
            ['/collections/heating-range/dosa%20bhatti?ref=old', '/collections/heating-range/dosa-bhatti?ref=old'],
            ['/collections/heating-range/Dosa-Bhatti', '/collections/heating-range/dosa-bhatti'],
            ['/collections/heating-range/dosa-bhatti/', '/collections/heating-range/dosa-bhatti'],
            ['/index.html', '/'],
        ]) {
            const response = await fetch(base + source, { redirect: 'manual' });
            expect(response.status).toBe(301);
            expect(response.headers.get('location')).toBe(target);
        }
    });
    it('redirects www and plain HTTP on aksales.in to the HTTPS apex', async () => {
        for (const host of ['aksales.in', 'www.aksales.in']) {
            const response = await fetch(base + '/contact?source=test', { headers: { 'X-Forwarded-Host': host }, redirect: 'manual' });
            expect(response.status).toBe(301);
            expect(response.headers.get('location')).toBe('https://aksales.in/contact?source=test');
        }
    });
    it('returns actual robots text and an XML sitemap containing only indexable 200 routes', async () => {
        const robots = await fetch(base + '/robots.txt');
        expect(robots.headers.get('content-type')).toContain('text/plain');
        expect(await robots.text()).toContain('Sitemap: https://aksales.in/sitemap.xml');
        const response = await fetch(base + '/sitemap.xml');
        expect(response.headers.get('content-type')).toContain('application/xml');
        const xml = await response.text();
        expect(xml).not.toContain('/admin');
        expect(xml).not.toContain('/hotel-and-restaurant');
        const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1].replaceAll('&amp;', '&'));
        expect(new Set(urls).size).toBe(urls.length);
        expect(urls.length).toBeGreaterThan(70);
        expect(urls).toContain('https://aksales.in/collections/heating-range/dosa-bhatti');
        expect(urls.some(url => url.includes('%20'))).toBe(false);
        for (const url of urls) {
            const page = getPageInfo(new URL(url).pathname);
            expect(page.status, url).toBe(200);
            expect(page.noindex, url).toBe(false);
            expect(page.canonical, url).toBe(url);
            const route = await fetch(base + new URL(url).pathname, { redirect: 'manual' });
            expect(route.status, url).toBe(200);
        }
    });
    it('escapes malicious catalogue content in SSR and bootstrap JSON', async () => {
        const { render, serializeJson } = await import('../dist-server/entry-server.js');
        const name = '100% </script><script>alert(1)</script>';
        const data = { ...fallbackData, products: { custom: { title: 'Custom', slug: 'custom', description: 'Equipment', products: [{ name, image: '/images/ab.webp' }] } } };
        for (const path of [`/collections/custom/${encodeURIComponent(name)}`, productPath('custom', { name })]) {
            const { body, head } = render(path, data);
            expect(body, path).toContain('100%');
            expect(body, path).not.toContain('<script>alert(1)</script>');
            expect(head, path).not.toContain('<script>alert(1)</script>');
        }
        expect(serializeJson(data)).not.toContain('</script>');
        expect(JSON.parse(serializeJson(data))).toEqual(data);
    });
    it('uses retryable 503s instead of false 404s or stale sitemaps during a configured database outage', async () => {
        process.env.MONGODB_URI = 'configured-but-disconnected';
        try {
            const unknown = await fetch(base + '/collections/custom/New%20Product');
            expect(unknown.status).toBe(503);
            expect(unknown.headers.get('retry-after')).toBe('60');
            const sitemap = await fetch(base + '/sitemap.xml');
            expect(sitemap.status).toBe(503);
            expect((await fetch(base + '/collections/heating-range')).status).toBe(200);
        } finally { process.env.MONGODB_URI = ''; }
    });
});
