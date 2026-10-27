import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';

// Authenticated checks of the catalogue write routes against the real Express
// app. There is no database: the Category and Blog statics and save() are
// stubbed on the same CommonJS instances the routes load, and Cloudinary is
// stubbed so nothing leaves the machine. Anonymous callers are covered by
// auth-routes.test.js.

const require = createRequire(import.meta.url);
const { hashPassword } = require('./auth.js');
const Category = require('./models/Product.js');
const Blog = require('./models/Blog.js');
const { v2: cloudinary } = require('cloudinary');

const USERNAME = 'testadmin';
const PASSWORD = 'a-sufficiently-long-password';
const UPLOADED = { secure_url: 'https://res.cloudinary.com/demo/image/upload/new.png', width: 1200, height: 900 };

let server;
let base;
let cookie;
let saved;

beforeAll(async () => {
    // Empty, never deleted: dotenv refills a deleted variable from a local .env.
    process.env.MONGODB_URI = '';
    process.env.ADMIN_USERNAME = USERNAME;
    process.env.ADMIN_PASSWORD_HASH = hashPassword(PASSWORD);
    process.env.SESSION_SECRET = 'x'.repeat(48);

    const { default: app } = await import('./index.js');
    await new Promise((resolve) => { server = app.listen(0, resolve); });
    base = `http://127.0.0.1:${server.address().port}`;

    const login = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
    });
    cookie = login.headers.get('set-cookie').split(';')[0];
}, 30_000); // Importing the app can exceed the 10s default when server files run in parallel (ISSUE-013).

afterAll(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
});

afterEach(() => {
    vi.restoreAllMocks();
});

// Two categories: a legacy item with no slug, a product with a previous slug,
// and one in another category whose old slug can be taken over.
const catalogue = () => [
    new Category({
        slug: 'heating-range', title: 'Heating Range', description: 'Ranges', products: [
            { name: 'Dosa Bhatti', image: '/dosa.webp' },
            { name: 'Chinese Range', slug: 'chinese-range', oldSlugs: ['wok-range'], image: '/chinese.webp', imageAlt: 'A chinese range' },
        ],
    }),
    new Category({
        slug: 'refrigeration', title: 'Refrigeration', products: [
            { name: 'Deep Freezer', slug: 'deep-freezer', oldSlugs: ['chest-freezer'], image: '/freezer.webp', imageAlt: 'A deep freezer' },
        ],
    }),
];

function stubDb() {
    saved = {};
    const categories = catalogue();
    const save = vi.spyOn(Category.prototype, 'save').mockImplementation(function () {
        saved[this.slug] = this.toObject();
        return Promise.resolve(this);
    });
    const find = vi.spyOn(Category, 'find').mockResolvedValue(categories);
    const findOne = vi.spyOn(Category, 'findOne').mockImplementation(async ({ slug }) => categories.find((c) => c.slug === slug) || null);
    // Any upload that is not expected fails loudly instead of reaching Cloudinary.
    const upload = vi.spyOn(cloudinary.uploader, 'upload').mockRejectedValue(new Error('Cloudinary must not be called'));
    return { categories, save, find, findOne, upload };
}

const png = (bytes = 64) => new Blob([Buffer.alloc(bytes, 1)], { type: 'image/png' });

function form(fields, files = {}) {
    const data = new FormData();
    for (const [key, value] of Object.entries(fields)) {
        data.append(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
    for (const [key, [blob, name]] of Object.entries(files)) data.append(key, blob, name);
    return data;
}

const send = (method, path, body) => fetch(base + path, { method, headers: { Cookie: cookie }, body });
const sendJson = (method, path, body) => fetch(base + path, {
    method,
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
});

const names = (slug) => saved[slug].products.map((product) => product.name);
const productIn = (slug, name) => saved[slug].products.find((product) => product.name === name);

describe('POST /api/products', () => {
    it('refuses a product without a name, image or alt text', async () => {
        const { save, upload } = stubDb();
        const res = await send('POST', '/api/products', form({ categorySlug: 'heating-range', name: '' }));

        expect(res.status).toBe(400);
        const { errors } = await res.json();
        expect(errors).toEqual(expect.arrayContaining([
            'Add a product name.', 'Add a main image.', 'Describe the main image in its alt text.',
        ]));
        expect(save).not.toHaveBeenCalled();
        expect(upload).not.toHaveBeenCalled();
    });

    it('refuses a slug used by a product in another category', async () => {
        const { save, upload } = stubDb();
        const res = await send('POST', '/api/products', form(
            { categorySlug: 'heating-range', name: 'Freezer', slug: 'deep-freezer', imageAlt: 'A freezer' },
            { productImage: [png(), 'f.png'] },
        ));

        expect(res.status).toBe(400);
        expect((await res.json()).errors).toEqual(['Another product already uses this URL slug.']);
        expect(save).not.toHaveBeenCalled();
        expect(upload).not.toHaveBeenCalled();
    });

    it('refuses a new category without a title', async () => {
        const { save } = stubDb();
        const res = await send('POST', '/api/products', form(
            { categorySlug: 'pizza-ovens', name: 'Deck Oven', imageAlt: 'A deck oven' },
            { productImage: [png(), 'oven.png'] },
        ));

        expect(res.status).toBe(400);
        expect((await res.json()).errors).toEqual(['Name the new category.']);
        expect(save).not.toHaveBeenCalled();
    });

    it('creates a product in a new category with its SEO fields and uploaded image', async () => {
        const { upload } = stubDb();
        upload.mockResolvedValue(UPLOADED);
        const res = await send('POST', '/api/products', form({
            categorySlug: 'pizza-ovens',
            categoryTitle: 'Pizza Ovens',
            name: 'Deck Oven',
            imageAlt: 'Two-deck pizza oven',
            summary: 'A two-deck electric oven.',
            modelNumber: 'DO-2',
            specs: [{ label: 'Decks', value: '2' }],
            faqs: [{ question: 'Power?', answer: 'Three-phase.' }],
        }, { productImage: [png(), 'IMG_1.png'] }));

        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body.category).toMatchObject({ slug: 'pizza-ovens', title: 'Pizza Ovens' });
        expect(body.product).toMatchObject({
            name: 'Deck Oven', slug: 'deck-oven', image: UPLOADED.secure_url, imageWidth: 1200, imageHeight: 900,
            imageAlt: 'Two-deck pizza oven', summary: 'A two-deck electric oven.', modelNumber: 'DO-2',
            specs: [{ label: 'Decks', value: '2' }], faqs: [{ question: 'Power?', answer: 'Three-phase.' }],
        });
        expect(body.product).not.toHaveProperty('_id');
        expect(Object.keys(saved)).toEqual(['pizza-ovens']);
        expect(productIn('pizza-ovens', 'Deck Oven').updatedAt).toBeInstanceOf(Date);
        expect(upload.mock.calls[0][1]).toMatchObject({
            folder: 'annas-kitchen/products',
            public_id: expect.stringMatching(/^two-deck-pizza-oven-[0-9a-f]{6}$/),
        });
    });

    it('refuses a main image that is not an image file', async () => {
        const { upload } = stubDb();
        const file = new Blob(['%PDF'], { type: 'application/pdf' });
        const res = await send('POST', '/api/products', form(
            { categorySlug: 'heating-range', name: 'Tawa', imageAlt: 'A tawa' },
            { productImage: [file, 'tawa.pdf'] },
        ));

        expect(res.status).toBe(400);
        expect((await res.json()).error).toMatch(/JPEG, PNG, WebP or AVIF/);
        expect(upload).not.toHaveBeenCalled();
    });
});

describe('PUT /api/products/:categorySlug/:productSlug', () => {
    const fields = (overrides = {}) => ({ name: 'Dosa Bhatti', slug: 'dosa-bhatti', imageAlt: 'A dosa bhatti', ...overrides });

    it('finds a legacy product by its derived slug and keeps its image and position', async () => {
        const { upload } = stubDb();
        const res = await send('PUT', '/api/products/heating-range/dosa-bhatti', form(fields({ summary: 'A flat griddle.' })));

        expect(res.status).toBe(200);
        expect(names('heating-range')).toEqual(['Dosa Bhatti', 'Chinese Range']);
        const product = productIn('heating-range', 'Dosa Bhatti');
        expect(product).toMatchObject({ slug: 'dosa-bhatti', image: '/dosa.webp', imageAlt: 'A dosa bhatti', summary: 'A flat griddle.' });
        expect(product).not.toHaveProperty('oldSlugs');
        expect(product.updatedAt).toBeInstanceOf(Date);
        expect((await res.json()).product).toMatchObject({ slug: 'dosa-bhatti', summary: 'A flat griddle.' });
        expect(upload).not.toHaveBeenCalled();
    });

    it('records the previous slug when the slug changes', async () => {
        stubDb();
        const res = await send('PUT', '/api/products/heating-range/chinese-range', form(
            fields({ name: 'Chinese Range', slug: 'chinese-gas-range', imageAlt: 'A chinese range' }),
        ));

        expect(res.status).toBe(200);
        expect(productIn('heating-range', 'Chinese Range')).toMatchObject({
            slug: 'chinese-gas-range', oldSlugs: ['wok-range', 'chinese-range'],
        });
    });

    it('takes over a slug another product used before, so it stops redirecting there', async () => {
        stubDb();
        const res = await send('PUT', '/api/products/heating-range/dosa-bhatti', form(fields({ slug: 'chest-freezer' })));

        expect(res.status).toBe(200);
        expect(productIn('heating-range', 'Dosa Bhatti')).toMatchObject({ slug: 'chest-freezer', oldSlugs: ['dosa-bhatti'] });
        expect(productIn('refrigeration', 'Deep Freezer')).not.toHaveProperty('oldSlugs');
    });

    it('refuses a slug another product currently uses', async () => {
        const { save } = stubDb();
        const res = await send('PUT', '/api/products/heating-range/dosa-bhatti', form(fields({ slug: 'deep-freezer' })));

        expect(res.status).toBe(400);
        expect((await res.json()).errors).toEqual(['Another product already uses this URL slug.']);
        expect(save).not.toHaveBeenCalled();
    });

    it('moves the product to another category', async () => {
        stubDb();
        const res = await send('PUT', '/api/products/heating-range/chinese-range', form(
            fields({ name: 'Chinese Range', slug: 'chinese-range', imageAlt: 'A chinese range', categorySlug: 'refrigeration' }),
        ));

        expect(res.status).toBe(200);
        expect(names('heating-range')).toEqual(['Dosa Bhatti']);
        expect(names('refrigeration')).toEqual(['Deep Freezer', 'Chinese Range']);
        expect(productIn('refrigeration', 'Chinese Range')).toMatchObject({ slug: 'chinese-range', oldSlugs: ['wok-range'] });
        expect((await res.json()).category.slug).toBe('refrigeration');
    });

    it('refuses to move the product to a category that does not exist', async () => {
        const { save } = stubDb();
        const res = await send('PUT', '/api/products/heating-range/dosa-bhatti', form(fields({ categorySlug: 'nowhere' })));

        expect(res.status).toBe(400);
        expect((await res.json()).errors).toEqual(['Choose an existing category to move the product to.']);
        expect(save).not.toHaveBeenCalled();
    });

    it('replaces the main image when a new file is sent', async () => {
        const { upload } = stubDb();
        upload.mockResolvedValue(UPLOADED);
        const res = await send('PUT', '/api/products/heating-range/dosa-bhatti', form(fields(), { productImage: [png(), 'd.png'] }));

        expect(res.status).toBe(200);
        expect(productIn('heating-range', 'Dosa Bhatti')).toMatchObject({ image: UPLOADED.secure_url, imageWidth: 1200, imageHeight: 900 });
    });

    it('returns 404 for an unknown product or category', async () => {
        stubDb();
        expect((await send('PUT', '/api/products/heating-range/missing', form(fields()))).status).toBe(404);
        expect((await send('PUT', '/api/products/missing/dosa-bhatti', form(fields()))).status).toBe(404);
    });
});

describe('DELETE /api/products/:categorySlug/:productSlug', () => {
    it('deletes a product by its slug', async () => {
        stubDb();
        const res = await send('DELETE', '/api/products/heating-range/chinese-range');

        expect(res.status).toBe(200);
        expect(names('heating-range')).toEqual(['Dosa Bhatti']);
    });

    it('deletes a legacy product by its derived slug', async () => {
        stubDb();
        const res = await send('DELETE', '/api/products/heating-range/dosa-bhatti');

        expect(res.status).toBe(200);
        expect(names('heating-range')).toEqual(['Chinese Range']);
    });

    it('no longer accepts a position index', async () => {
        const { save } = stubDb();
        const res = await send('DELETE', '/api/products/heating-range/0');

        expect(res.status).toBe(404);
        expect(save).not.toHaveBeenCalled();
    });
});

describe('PUT /api/products/categories/:categorySlug', () => {
    const guide = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'How to choose a range.' }] }] };

    it('updates the SEO fields and keeps the slug immutable', async () => {
        stubDb();
        const res = await sendJson('PUT', '/api/products/categories/heating-range', {
            slug: 'renamed', title: 'Heating Ranges', seoTitle: 'Heating Ranges in Surat', metaDescription: 'Gas ranges.',
            body: guide, faqs: [{ question: 'LPG or PNG?', answer: 'Both.' }],
        });

        expect(res.status).toBe(200);
        expect(saved['heating-range']).toMatchObject({
            slug: 'heating-range', title: 'Heating Ranges', description: 'Ranges', seoTitle: 'Heating Ranges in Surat',
            metaDescription: 'Gas ranges.', body: guide, faqs: [{ question: 'LPG or PNG?', answer: 'Both.' }],
        });
        expect(saved).not.toHaveProperty('renamed');
        expect((await res.json()).category).toMatchObject({ slug: 'heating-range', title: 'Heating Ranges' });
    });

    it('accepts multipart fields with JSON strings and clears a blank SEO title', async () => {
        const { categories } = stubDb();
        categories[0].seoTitle = 'Old title';
        const res = await send('PUT', '/api/products/categories/heating-range', form({ title: 'Heating Range', seoTitle: '', body: guide }));

        expect(res.status).toBe(200);
        expect(saved['heating-range'].body).toEqual(guide);
        expect(saved['heating-range']).not.toHaveProperty('seoTitle');
    });

    it('refuses a blank title', async () => {
        const { save } = stubDb();
        const res = await sendJson('PUT', '/api/products/categories/heating-range', { title: '  ' });

        expect(res.status).toBe(400);
        expect((await res.json()).errors).toEqual(['Add a category title.']);
        expect(save).not.toHaveBeenCalled();
    });

    it('returns 404 for an unknown category', async () => {
        stubDb();
        expect((await sendJson('PUT', '/api/products/categories/missing', { title: 'X' })).status).toBe(404);
    });
});

describe('POST /api/products/images', () => {
    it('refuses a file that is not an image', async () => {
        const { upload } = stubDb();
        const file = new Blob(['<script>alert(1)</script>'], { type: 'text/html' });
        const res = await send('POST', '/api/products/images', form({ alt: 'A range' }, { image: [file, 'page.html'] }));

        expect(res.status).toBe(400);
        expect((await res.json()).error).toMatch(/JPEG, PNG, WebP or AVIF/);
        expect(upload).not.toHaveBeenCalled();
    });

    it('refuses an image over 5 MB', async () => {
        const { upload } = stubDb();
        const res = await send('POST', '/api/products/images', form({ alt: 'A range' }, { image: [png(5 * 1024 * 1024 + 1), 'big.png'] }));

        expect(res.status).toBe(400);
        expect((await res.json()).error).toMatch(/5 MB/);
        expect(upload).not.toHaveBeenCalled();
    });

    it('refuses an image without alt text', async () => {
        const { upload } = stubDb();
        const res = await send('POST', '/api/products/images', form({ alt: ' ' }, { image: [png(), 'r.png'] }));

        expect(res.status).toBe(400);
        expect(upload).not.toHaveBeenCalled();
    });

    it('uploads into the products folder under a name taken from the alt text', async () => {
        const { upload } = stubDb();
        upload.mockResolvedValue(UPLOADED);
        const res = await send('POST', '/api/products/images', form({ alt: 'Range burner close-up' }, { image: [png(), 'IMG_2.png'] }));

        expect(res.status).toBe(201);
        await expect(res.json()).resolves.toEqual({ url: UPLOADED.secure_url, width: 1200, height: 900 });
        expect(upload.mock.calls[0][1]).toMatchObject({
            folder: 'annas-kitchen/products',
            public_id: expect.stringMatching(/^range-burner-close-up-[0-9a-f]{6}$/),
        });
    });
});

describe('POST /api/blogs/import-bundled', () => {
    function stubBlogs(existingSlugs) {
        const inserted = [];
        const find = vi.spyOn(Blog, 'find').mockResolvedValue(existingSlugs.map((slug) => ({ slug })));
        const insertMany = vi.spyOn(Blog, 'insertMany').mockImplementation(async (docs) => {
            inserted.push(...docs);
            return docs;
        });
        return { find, insertMany, inserted };
    }

    it('inserts only the built-in posts whose slug is not in the database yet', async () => {
        const { inserted } = stubBlogs(['finding-best-commercial-kitchen-equipment']);
        const res = await send('POST', '/api/blogs/import-bundled');

        expect(res.status).toBe(201);
        const { imported } = await res.json();
        expect(imported).toEqual([
            'commercial-cooking-equipment-essentials',
            'commercial-dishwasher-buying-guide-2025',
            'top-commercial-kitchen-solutions-lucknow',
        ]);
        expect(inserted.map((post) => post.slug)).toEqual(imported);
        for (const post of inserted) {
            expect(post).toMatchObject({ status: 'published', imageAlt: post.title });
            expect(post.publishedAt).toBeInstanceOf(Date);
            expect(post.content.length).toBeGreaterThan(0);
        }
        expect(inserted[0].publishedAt.toISOString()).toBe('2025-02-02T12:00:00.000Z');
    });

    it('imports nothing when every built-in post is already stored', async () => {
        const { insertMany } = stubBlogs([
            'finding-best-commercial-kitchen-equipment', 'commercial-cooking-equipment-essentials',
            'commercial-dishwasher-buying-guide-2025', 'top-commercial-kitchen-solutions-lucknow',
        ]);
        const res = await send('POST', '/api/blogs/import-bundled');

        expect(res.status).toBe(200);
        expect((await res.json()).imported).toEqual([]);
        expect(insertMany).not.toHaveBeenCalled();
    });
});
