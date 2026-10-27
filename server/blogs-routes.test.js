import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { createRequire } from 'node:module';

// Authenticated checks of the blog write routes against the real Express app.
// There is no database: the Blog model's statics and save() are stubbed on the
// same CommonJS instance the routes load, and Cloudinary is stubbed so nothing
// leaves the machine. Anonymous callers are covered by auth-routes.test.js.

const require = createRequire(import.meta.url);
const { hashPassword } = require('./auth.js');
const Blog = require('./models/Blog.js');
const { v2: cloudinary } = require('cloudinary');

const USERNAME = 'testadmin';
const PASSWORD = 'a-sufficiently-long-password';

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

function stubDb({ existing = null } = {}) {
    saved = [];
    const save = vi.spyOn(Blog.prototype, 'save').mockImplementation(function () {
        saved.push(this.toObject());
        return Promise.resolve(this);
    });
    const findOne = vi.spyOn(Blog, 'findOne').mockResolvedValue(existing);
    // Any upload that slips through fails loudly instead of reaching Cloudinary.
    const upload = vi.spyOn(cloudinary.uploader, 'upload').mockRejectedValue(new Error('Cloudinary must not be called'));
    return { save, findOne, upload };
}

afterEach(() => {
    vi.restoreAllMocks();
});

const doc = (...content) => ({ type: 'doc', content });
const p = (...content) => ({ type: 'paragraph', content });
const text = (value, marks) => (marks ? { type: 'text', text: value, marks } : { type: 'text', text: value });
const link = (value, href) => text(value, [{ type: 'link', attrs: { href } }]);
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

const published = () => new Blog({
    slug: 'published-post',
    title: 'Published post',
    status: 'published',
    image: 'https://res.cloudinary.com/demo/image/upload/a.jpg',
    imageAlt: 'A fryer',
    publishedAt: new Date('2026-01-15T06:30:00Z'),
    date: 'Jan 15, 2026',
    body: doc(p(text('Old words'))),
});

const complete = (overrides = {}) => ({
    title: 'Published post',
    slug: 'published-post',
    status: 'published',
    imageAlt: 'A fryer',
    body: doc(p(text('New words'))),
    ...overrides,
});

describe('the stub is the model instance the routes use', () => {
    it('serves a post from the stubbed findOne', async () => {
        const { findOne } = stubDb({ existing: published() });
        const res = await fetch(`${base}/api/blogs/published-post`);

        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toMatchObject({ slug: 'published-post' });
        expect(findOne).toHaveBeenCalledWith({ slug: 'published-post', status: { $ne: 'draft' } });
    });
});

describe('GET /api/blogs?drafts=1 when signed in', () => {
    it('lists every post, drafts included', async () => {
        const find = vi.spyOn(Blog, 'find').mockReturnValue({ sort: () => Promise.resolve([]) });
        const res = await fetch(`${base}/api/blogs?drafts=1`, { headers: { Cookie: cookie } });

        expect(res.status).toBe(200);
        expect(find).toHaveBeenCalledWith({});
    });

    it('still hides drafts from the public list', async () => {
        const find = vi.spyOn(Blog, 'find').mockReturnValue({ sort: () => Promise.resolve([]) });
        await fetch(`${base}/api/blogs`);
        expect(find).toHaveBeenCalledWith({ status: { $ne: 'draft' } });
    });
});

describe('POST /api/blogs', () => {
    it('refuses to publish without a featured image or alt text', async () => {
        const { save } = stubDb();
        const res = await send('POST', '/api/blogs', form(complete({ slug: 'new-post', imageAlt: '' })));

        expect(res.status).toBe(400);
        const { errors } = await res.json();
        expect(errors).toEqual(expect.arrayContaining(['Add a featured image.', 'Describe the featured image in its alt text.']));
        expect(save).not.toHaveBeenCalled();
    });

    it('refuses an invalid slug, even for a draft', async () => {
        const { save } = stubDb();
        const res = await send('POST', '/api/blogs', form({ title: 'Draft', slug: 'Bad Slug!', status: 'draft' }));

        expect(res.status).toBe(400);
        expect((await res.json()).errors[0]).toMatch(/slug/);
        expect(save).not.toHaveBeenCalled();
    });

    it('saves a draft with only a title and slug', async () => {
        const { save, upload } = stubDb();
        const res = await send('POST', '/api/blogs', form({ title: 'Draft', slug: 'draft-post', status: 'draft' }));

        expect(res.status).toBe(201);
        expect(save).toHaveBeenCalledTimes(1);
        expect(saved[0]).toMatchObject({ title: 'Draft', slug: 'draft-post', status: 'draft', image: '' });
        expect(saved[0]).not.toHaveProperty('publishedAt');
        expect(upload).not.toHaveBeenCalled();
    });

    it('strips a javascript: link from the saved body', async () => {
        stubDb();
        const body = doc(p(link('click', 'javascript:alert(1)'), text(' and '), link('collections', '/collections')));
        const res = await send('POST', '/api/blogs', form({ title: 'Draft', slug: 'draft-post', status: 'draft', body }));

        expect(res.status).toBe(201);
        expect(JSON.stringify(saved[0].body)).not.toMatch(/javascript/i);
        expect(saved[0].body.content[0].content).toEqual([
            text('click'),
            text(' and '),
            text('collections', [{ type: 'link', attrs: { href: '/collections', rel: null } }]),
        ]);
    });

    it('refuses an unreadable body', async () => {
        const { save } = stubDb();
        const res = await send('POST', '/api/blogs', form({ title: 'Draft', slug: 'draft-post', status: 'draft', body: '{oops' }));

        expect(res.status).toBe(400);
        expect(save).not.toHaveBeenCalled();
    });

    it('publishes with an uploaded featured image and sets the dates', async () => {
        const { upload } = stubDb();
        upload.mockResolvedValue({ secure_url: 'https://res.cloudinary.com/demo/image/upload/fryer.png', width: 1200, height: 800 });
        const res = await send('POST', '/api/blogs', form(complete({ slug: 'new-post' }), { blogImage: [png(), 'fryer.png'] }));

        expect(res.status).toBe(201);
        expect(saved[0]).toMatchObject({ status: 'published', image: 'https://res.cloudinary.com/demo/image/upload/fryer.png', imageWidth: 1200, imageHeight: 800 });
        expect(saved[0].publishedAt).toBeInstanceOf(Date);
        expect(saved[0].date).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
        expect(upload.mock.calls[0][1].public_id).toMatch(/^a-fryer-[0-9a-f]{6}$/);
    });
});

describe('PUT /api/blogs/:slug', () => {
    it('returns 404 for an unknown post', async () => {
        stubDb({ existing: null });
        const res = await send('PUT', '/api/blogs/missing-post', form(complete({ slug: 'missing-post' })));
        expect(res.status).toBe(404);
    });

    it('refuses to change the slug of a published post', async () => {
        const { save } = stubDb({ existing: published() });
        const res = await send('PUT', '/api/blogs/published-post', form(complete({ slug: 'renamed-post' })));

        expect(res.status).toBe(400);
        expect((await res.json()).errors[0]).toMatch(/cannot change/);
        expect(save).not.toHaveBeenCalled();
    });

    it('updates a published post in place, keeping its image and first publish date', async () => {
        const { save } = stubDb({ existing: published() });
        const res = await send('PUT', '/api/blogs/published-post', form(complete()));

        expect(res.status).toBe(200);
        expect(save).toHaveBeenCalledTimes(1);
        expect(saved[0]).toMatchObject({
            slug: 'published-post',
            image: 'https://res.cloudinary.com/demo/image/upload/a.jpg',
            date: 'Jan 15, 2026',
            body: doc(p(text('New words'))),
        });
        expect(saved[0].publishedAt.toISOString()).toBe('2026-01-15T06:30:00.000Z');
    });

    it('lets a draft change its slug', async () => {
        const draft = new Blog({ slug: 'old-draft', title: 'Draft', status: 'draft' });
        stubDb({ existing: draft });
        const res = await send('PUT', '/api/blogs/old-draft', form({ title: 'Draft', slug: 'new-draft', status: 'draft' }));

        expect(res.status).toBe(200);
        expect(saved[0].slug).toBe('new-draft');
    });
});

describe('POST /api/blogs/images', () => {
    it('refuses a file that is not an image', async () => {
        const { upload } = stubDb();
        const file = new Blob(['<script>alert(1)</script>'], { type: 'text/html' });
        const res = await send('POST', '/api/blogs/images', form({ alt: 'A fryer' }, { image: [file, 'page.html'] }));

        expect(res.status).toBe(400);
        expect((await res.json()).error).toMatch(/JPEG, PNG, WebP or AVIF/);
        expect(upload).not.toHaveBeenCalled();
    });

    it('refuses an image over 5 MB', async () => {
        const { upload } = stubDb();
        const res = await send('POST', '/api/blogs/images', form({ alt: 'A fryer' }, { image: [png(5 * 1024 * 1024 + 1), 'big.png'] }));

        expect(res.status).toBe(400);
        expect((await res.json()).error).toMatch(/5 MB/);
        expect(upload).not.toHaveBeenCalled();
    });

    it('refuses an image without alt text', async () => {
        const { upload } = stubDb();
        const res = await send('POST', '/api/blogs/images', form({ alt: '   ' }, { image: [png(), 'fryer.png'] }));

        expect(res.status).toBe(400);
        expect((await res.json()).error).toMatch(/alt text/);
        expect(upload).not.toHaveBeenCalled();
    });

    it('uploads a valid image under a name taken from its alt text', async () => {
        const { upload } = stubDb();
        upload.mockResolvedValue({ secure_url: 'https://res.cloudinary.com/demo/image/upload/x.png', width: 640, height: 480 });
        const res = await send('POST', '/api/blogs/images', form({ alt: 'Twin-tank gas fryer' }, { image: [png(), 'IMG_0001.png'] }));

        expect(res.status).toBe(201);
        await expect(res.json()).resolves.toEqual({ url: 'https://res.cloudinary.com/demo/image/upload/x.png', width: 640, height: 480 });
        expect(upload.mock.calls[0][1]).toMatchObject({ folder: 'annas-kitchen/blogs', public_id: expect.stringMatching(/^twin-tank-gas-fryer-[0-9a-f]{6}$/) });
    });
});
