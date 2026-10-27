import { describe, expect, it } from 'vitest';
import { SITE_URL, getPageInfo, productPath, robotsTxt, serializeJson, sitemapXml } from './seo.js';
import productsData from '../data/productsData.js';
import blogsData from '../data/blogsData.js';

const products = {
    refrigeration: { title: 'Refrigeration', description: 'Fresh storage.', products: [
        { name: 'Cold Bain Marie', image: '/images/refrigeration/cold-bain-marie.webp' },
        { name: "Chef's & Baker's Counter", image: 'https://res.cloudinary.com/example/image.webp' },
        { name: '100% Cooler', image: 'javascript:alert(1)' },
    ] },
    empty: { title: 'Empty Collection', products: [] },
};
const blogs = [{ slug: 'kitchen-guide', title: 'Planning a Commercial Kitchen', image: '/blog/guide.webp', date: 'Jan 15, 2025', author: 'AK Sales Team', content: [{ heading: 'Plan the layout', text: 'Choose equipment to suit your menu, available space and daily service.' }] }];
const data = { products, blogs };
const schemaOf = (info, type) => info.schemas.find((schema) => schema['@type'] === type);

describe('public route metadata', () => {
    it('gives each static page unique Surat metadata and an apex canonical', () => {
        const paths = ['/', '/about', '/services', '/projects', '/contact', '/collections', '/blogs'];
        const pages = paths.map((path) => getPageInfo(path, data));
        expect(new Set(pages.map((info) => info.title)).size).toBe(paths.length);
        expect(new Set(pages.map((info) => info.description)).size).toBe(paths.length);
        pages.forEach((info, index) => {
            expect(info.status).toBe(200);
            expect(info.noindex).toBe(false);
            expect(info.title).toContain('AK Sales');
            expect(info.title).toContain('Surat');
            expect(info.canonical).toBe(`${SITE_URL}${paths[index]}`);
            expect(info.description.length).toBeLessThanOrEqual(160);
        });
    });

    it('removes query strings, fragments and trailing slashes from canonicals', () => {
        expect(getPageInfo('https://www.aksales.in/about/?utm_source=mail#team', data).canonical).toBe(`${SITE_URL}/about`);
        expect(getPageInfo('/?utm_campaign=launch', data).canonical).toBe(`${SITE_URL}/`);
    });

    it('provides only verified business details without ratings or business hours', () => {
        const business = schemaOf(getPageInfo('/', data), 'LocalBusiness');
        expect(business.name).toBe('AK Sales');
        expect(business.telephone).toBe('+919106780688');
        expect(business.email).toBe('annaskitchenequipment@gmail.com');
        expect(business.address).toEqual({ '@type': 'PostalAddress', streetAddress: 'Near Nayara Petrol Pump, Bhatha', addressLocality: 'Surat', addressRegion: 'Gujarat', postalCode: '394510', addressCountry: 'IN' });
        expect(business.sameAs).toContain('https://www.instagram.com/annas_kitchen_equipments/');
        expect(business).not.toHaveProperty('aggregateRating');
        expect(business).not.toHaveProperty('openingHours');
    });

    it('keeps empty categories accessible but excludes them from indexing', () => {
        const info = getPageInfo('/collections/empty', data);
        expect(info.status).toBe(200);
        expect(info.noindex).toBe(true);
        expect(schemaOf(info, 'BreadcrumbList').itemListElement.at(-1).item).toBe(`${SITE_URL}/collections/empty`);
    });

    it('normalises product name case to the existing encoded canonical', () => {
        const info = getPageInfo('/collections/refrigeration/cold%20bain%20marie/?source=search', data);
        expect(info.status).toBe(200);
        expect(info.canonical).toBe(`${SITE_URL}/collections/refrigeration/Cold%20Bain%20Marie`);
        expect(info.image).toBe(`${SITE_URL}/images/refrigeration/cold-bain-marie.webp`);
        const product = schemaOf(info, 'Product');
        expect(product.name).toBe('Cold Bain Marie');
        expect(product.url).toBe(info.canonical);
        expect(product).not.toHaveProperty('offers');
        expect(product).not.toHaveProperty('review');
        expect(product).not.toHaveProperty('aggregateRating');
        expect(schemaOf(info, 'BreadcrumbList').itemListElement.map((item) => item.position)).toEqual([1, 2, 3, 4]);
    });

    it('preserves reserved characters in existing product URLs without double decoding', () => {
        expect(productPath('refrigeration', "Chef's & Baker's Counter")).toBe("/collections/refrigeration/Chef's%20%26%20Baker's%20Counter");
        expect(getPageInfo(productPath('refrigeration', '100% Cooler'), data).status).toBe(200);
        expect(getPageInfo(productPath('refrigeration', '100% Cooler'), data).canonical).toContain('100%25%20Cooler');
    });

    it.each(['/unknown', '/collections/missing', '/collections/refrigeration/missing', '/blog/missing', '/collections/constructor', '/collections/refrigeration/%E0%A4%A'])('returns a noindex 404 for %s', (path) => {
        const info = getPageInfo(path, data);
        expect(info.status).toBe(404);
        expect(info.noindex).toBe(true);
        expect(info.schemas).toEqual([]);
    });

    it.each(['/admin/login', '/admin/dashboard'])('keeps %s noindex without public business schemas', (path) => {
        const info = getPageInfo(path, data);
        expect(info.status).toBe(200);
        expect(info.noindex).toBe(true);
        expect(info.schemas).toEqual([]);
    });

    it('describes actual blog content, author and publication date', () => {
        const info = getPageInfo('/blog/kitchen-guide', data);
        expect(info.type).toBe('article');
        expect(info.description).toBe(blogs[0].content[0].text);
        const article = schemaOf(info, 'BlogPosting');
        expect(article.headline).toBe(blogs[0].title);
        expect(article.datePublished).toBe('2025-01-15');
        expect(article.author).toEqual({ '@type': 'Organization', name: 'AK Sales Team' });
        expect(article.articleBody).toBe(`Plan the layout\n${blogs[0].content[0].text}`);
        expect(article).not.toHaveProperty('dateModified');
    });

    it.each(['Feb 30, 2025', '2025-01-15Tgarbage', 'not dated'])('omits missing authors and invalid publication date %s instead of fabricating values', (date) => {
        const info = getPageInfo('/blog/kitchen-guide', { products, blogs: [{ ...blogs[0], date, author: '' }] });
        const article = schemaOf(info, 'BlogPosting');
        expect(article).not.toHaveProperty('author');
        expect(article).not.toHaveProperty('datePublished');
    });

    it('clamps long content and rejects unsafe media URLs', () => {
        const info = getPageInfo('/blog/kitchen-guide', { products, blogs: [{ ...blogs[0], image: 'data:image/svg+xml,<svg/>', content: [{ text: '<p>' + 'Text '.repeat(100) + '</p>' }] }] });
        expect(info.description.length).toBeLessThanOrEqual(160);
        expect(info.description).not.toContain('<p>');
        expect(info.image).toBe(`${SITE_URL}/images/ak-sales-logo.png`);
        expect(getPageInfo(productPath('refrigeration', '100% Cooler'), data).image).toBe(`${SITE_URL}/images/ak-sales-logo.png`);
        const remote = getPageInfo(productPath('refrigeration', "Chef's & Baker's Counter"), data);
        expect(remote.image).toBe('https://res.cloudinary.com/example/image.webp');
    });

    it('resolves bundled catalogue and blog routes in Node without browser storage', () => {
        for (const [key, category] of Object.entries(productsData)) {
            expect(getPageInfo(`/collections/${key}`).status).toBe(200);
            category.products.forEach((product) => expect(getPageInfo(productPath(key, product.name)).status).toBe(200));
        }
        blogsData.forEach((blog) => expect(getPageInfo(`/blog/${blog.slug}`).status).toBe(200));
    });
});

describe('rich blog metadata', () => {
    const rich = {
        slug: 'tandoor-guide', title: 'Choosing a Tandoor', image: 'https://res.cloudinary.com/demo/image/upload/v1/tandoor.jpg',
        imageAlt: 'Clay tandoor in a hotel kitchen', date: 'Mar 03, 2026', publishedAt: '2026-03-03T04:30:00.000Z', updatedAt: '2026-04-10T09:15:00.000Z',
        category: 'Buying Guide', tags: ['tandoor', ' ', 'clay oven'], author: 'Ravi Shah', authorUrl: '/about', authorBio: 'Kitchen planner in Surat.',
        excerpt: 'Pick a clay tandoor for flavour and a steel body for durability.', status: 'published',
        body: { type: 'doc', content: [
            { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Clay or steel?' }] },
            { type: 'paragraph', content: [{ type: 'text', text: 'Clay holds heat longer.' }] },
        ] },
        faqs: [{ question: 'How hot does a tandoor get?', answer: 'Around <b>480°C</b> at the wall.' }, { question: 'Empty answer', answer: ' ' }],
    };
    const info = (blog) => getPageInfo(`/blog/${blog.slug}`, { products, blogs: [blog] });

    it('uses the custom SEO title and meta description without adding the suffix twice', () => {
        const page = info({ ...rich, seoTitle: 'Tandoor Buying Guide for Surat Hotels', metaDescription: 'How to pick a tandoor for a hotel kitchen.' });
        expect(page.title).toBe('Tandoor Buying Guide for Surat Hotels');
        expect(page.description).toBe('How to pick a tandoor for a hotel kitchen.');
        expect(schemaOf(page, 'BlogPosting').description).toBe('How to pick a tandoor for a hotel kitchen.');
    });

    it('falls back to the suffixed title and the excerpt', () => {
        const page = info(rich);
        expect(page.title).toBe('Choosing a Tandoor | AK Sales Surat');
        expect(page.description).toBe(rich.excerpt);
    });

    it('falls back to the first body paragraph when there is no excerpt', () => {
        expect(info({ ...rich, excerpt: '' }).description).toBe('Clay holds heat longer.');
    });

    it('exposes the featured image alt and article times for Open Graph', () => {
        const page = info(rich);
        expect(page.imageAlt).toBe('Clay tandoor in a hotel kitchen');
        expect(page.publishedTime).toBe('2026-03-03T04:30:00.000Z');
        expect(page.modifiedTime).toBe('2026-04-10T09:15:00.000Z');
        expect(info({ ...rich, imageAlt: '' }).imageAlt).toBe('Choosing a Tandoor');
        expect(getPageInfo('/about', data).imageAlt).toBeUndefined();
    });

    it('dates the article from ISO publishedAt and updatedAt, including Date objects from the database', () => {
        const article = schemaOf(info(rich), 'BlogPosting');
        expect(article.datePublished).toBe('2026-03-03T04:30:00.000Z');
        expect(article.dateModified).toBe('2026-04-10T09:15:00.000Z');
        const fromDb = schemaOf(info({ ...rich, publishedAt: new Date(rich.publishedAt), updatedAt: new Date(rich.updatedAt) }), 'BlogPosting');
        expect(fromDb.datePublished).toBe('2026-03-03T04:30:00.000Z');
        expect(fromDb.dateModified).toBe('2026-04-10T09:15:00.000Z');
    });

    it('falls back to the display date and omits dateModified when timestamps are missing or invalid', () => {
        const article = schemaOf(info({ ...rich, publishedAt: 'not a date', updatedAt: undefined }), 'BlogPosting');
        expect(article.datePublished).toBe('2026-03-03');
        expect(article).not.toHaveProperty('dateModified');
        expect(info({ ...rich, publishedAt: undefined, updatedAt: '' }).modifiedTime).toBeUndefined();
    });

    it('adds an absolute author url, section, keywords, word count and plain article body', () => {
        const article = schemaOf(info(rich), 'BlogPosting');
        expect(article.author).toEqual({ '@type': 'Person', name: 'Ravi Shah', url: `${SITE_URL}/about` });
        expect(article.articleSection).toBe('Buying Guide');
        expect(article.keywords).toBe('tandoor, clay oven');
        expect(article.articleBody).toBe('Clay or steel?\nClay holds heat longer.');
        expect(article.wordCount).toBe(7);
        expect(article.image).toBe(rich.image);
    });

    it('omits author url, keywords and unsafe author links when they are not usable', () => {
        const article = schemaOf(info({ ...rich, authorUrl: 'javascript:alert(1)', tags: [] }), 'BlogPosting');
        expect(article.author).toEqual({ '@type': 'Person', name: 'Ravi Shah' });
        expect(article).not.toHaveProperty('keywords');
        expect(schemaOf(info({ ...rich, authorUrl: 'https://www.linkedin.com/in/ravi' }), 'BlogPosting').author.url).toBe('https://www.linkedin.com/in/ravi');
    });

    it('adds a plain-text FAQPage only for complete questions', () => {
        const faq = schemaOf(info(rich), 'FAQPage');
        expect(faq['@id']).toBe(`${SITE_URL}/blog/tandoor-guide#faq`);
        expect(faq.mainEntity).toEqual([{ '@type': 'Question', name: 'How hot does a tandoor get?', acceptedAnswer: { '@type': 'Answer', text: 'Around 480°C at the wall.' } }]);
        expect(schemaOf(info({ ...rich, faqs: [] }), 'FAQPage')).toBeUndefined();
        expect(schemaOf(info({ ...rich, faqs: undefined }), 'FAQPage')).toBeUndefined();
        expect(schemaOf(getPageInfo('/blog/kitchen-guide', data), 'FAQPage')).toBeUndefined();
    });

    it('treats a draft as a noindex 404 and leaves it out of the sitemap', () => {
        const draft = { ...rich, status: 'draft' };
        const page = info(draft);
        expect(page.status).toBe(404);
        expect(page.noindex).toBe(true);
        expect(sitemapXml({ products, blogs: [draft, ...blogs] })).not.toContain('tandoor-guide');
    });

    it('adds lastmod only to blogs with a real update time', () => {
        const xml = sitemapXml({ products, blogs: [rich, ...blogs, { ...blogs[0], slug: 'bad-date', updatedAt: 'garbage' }] });
        expect(xml).toContain(`<url><loc>${SITE_URL}/blog/tandoor-guide</loc><lastmod>2026-04-10</lastmod></url>`);
        expect(xml).toContain(`<url><loc>${SITE_URL}/blog/kitchen-guide</loc></url>`);
        expect(xml).toContain(`<url><loc>${SITE_URL}/blog/bad-date</loc></url>`);
        expect(xml.match(/<lastmod>/g)).toHaveLength(1);
    });

    it('keeps the titles and descriptions of the bundled legacy posts', () => {
        const clamp = (value) => (value.length > 160 ? `${value.slice(0, 157).trimEnd()}…` : value);
        blogsData.forEach((blog) => {
            const page = getPageInfo(`/blog/${blog.slug}`);
            expect(page.title).toBe(`${blog.title} | AK Sales Surat`);
            expect(page.description).toBe(clamp(blog.content[0].text));
            expect(page.imageAlt).toBe(blog.title);
            expect(schemaOf(page, 'BlogPosting').articleSection).toBe(blog.category);
        });
    });
});

describe('crawler documents', () => {
    it('includes public populated routes exactly once and excludes empty or private routes', () => {
        const xml = sitemapXml(data);
        expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
        expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
        expect(xml).toContain(`<loc>${SITE_URL}/collections/refrigeration</loc>`);
        expect(xml).toContain(`<loc>${SITE_URL}/blog/kitchen-guide</loc>`);
        expect(xml).not.toContain('/collections/empty');
        expect(xml).not.toContain('/admin/');
        expect(xml).not.toContain('/api/');
        expect(xml).not.toContain('lastmod');
        const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
        expect(urls.length).toBe(12);
        expect(new Set(urls).size).toBe(urls.length);
    });

    it('escapes XML-sensitive URL characters and ignores incomplete catalogue entries', () => {
        const xml = sitemapXml({ products: { ...products, invalid: { title: '', products: [{ name: 'Invisible' }] } }, blogs: [...blogs, { slug: '', title: 'Missing slug' }, { slug: 'missing-title' }] });
        expect(xml).toContain('Chef&apos;s%20%26%20Baker&apos;s%20Counter');
        expect(xml).not.toContain('Invisible');
        expect(xml).not.toContain('missing-title');
    });

    it('excludes dot segments that cannot represent usable catalogue routes', () => {
        const xml = sitemapXml({ products: { '..': products.refrigeration, test: { title: 'Test', products: [{ name: '.' }, { name: '..' }] } }, blogs: [{ slug: '.', title: 'Invalid route' }] });
        expect(xml).not.toContain('/collections/');
        expect(xml).not.toContain('/blog/');
    });

    it('blocks API and administration crawling and advertises the canonical sitemap', () => {
        expect(robotsTxt()).toBe(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
    });

    it('embeds hostile JSON-LD safely while preserving its parsed content', () => {
        const data = { name: '</script><script>alert(1)</script>', text: 'line\u2028paragraph\u2029end' };
        const json = serializeJson(data);
        expect(json).not.toContain('<');
        expect(json).not.toContain('\u2028');
        expect(json).not.toContain('\u2029');
        expect(JSON.parse(json)).toEqual(data);
    });
});
