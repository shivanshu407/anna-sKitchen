import { describe, it, expect, vi, afterEach } from 'vitest';
import { addBlog, updateBlog, uploadBlogImage, fetchAllBlogsAdmin, blogFormData, importBundledBlogs } from './blogs';

afterEach(() => {
    vi.unstubAllGlobals();
});

const jsonResponse = (status, body) => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => (name.toLowerCase() === 'content-type' ? 'application/json; charset=utf-8' : null) },
    json: async () => body,
    text: async () => JSON.stringify(body),
});

const post = {
    title: 'How to Choose a Commercial Fryer',
    slug: 'how-to-choose-a-commercial-fryer',
    status: 'draft',
    excerpt: 'A short answer.',
    imageAlt: 'Twin-basket fryer',
    tags: ['fryers', 'kitchens'],
    faqs: [{ question: 'Gas or electric?', answer: 'Gas for volume.' }],
    body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }] },
};

describe('blogFormData', () => {
    it('sends tags, FAQs and the body as JSON strings', () => {
        const form = blogFormData(post);

        expect(JSON.parse(form.get('tags'))).toEqual(['fryers', 'kitchens']);
        expect(JSON.parse(form.get('faqs'))).toEqual(post.faqs);
        expect(JSON.parse(form.get('body'))).toEqual(post.body);
        expect(form.get('title')).toBe(post.title);
        expect(form.get('status')).toBe('draft');
    });

    it('sends missing text fields as empty strings rather than "undefined"', () => {
        const form = blogFormData({ title: 'T', slug: 't' });

        expect(form.get('seoTitle')).toBe('');
        expect(form.get('publishedAt')).toBe('');
        expect(form.get('tags')).toBe('[]');
    });

    it('attaches the featured image only when a file is chosen', () => {
        expect(blogFormData(post).has('blogImage')).toBe(false);

        const file = new File(['x'], 'fryer.webp', { type: 'image/webp' });
        expect(blogFormData(post, file).get('blogImage')).toBeInstanceOf(File);
    });
});

describe('blog write calls', () => {
    it('creates a post with POST /api/blogs', async () => {
        const spy = vi.fn().mockResolvedValue(jsonResponse(201, { message: 'Draft saved' }));
        vi.stubGlobal('fetch', spy);

        await expect(addBlog(post)).resolves.toEqual({ message: 'Draft saved' });
        const [url, options] = spy.mock.calls[0];
        expect(url).toBe('/api/blogs');
        expect(options.method).toBe('POST');
        expect(options.body).toBeInstanceOf(FormData);
    });

    it('updates the post stored at its original slug with PUT', async () => {
        const spy = vi.fn().mockResolvedValue(jsonResponse(200, { message: 'Blog updated' }));
        vi.stubGlobal('fetch', spy);

        await updateBlog('old-slug', { ...post, slug: 'new-slug' });
        const [url, options] = spy.mock.calls[0];
        expect(url).toBe('/api/blogs/old-slug');
        expect(options.method).toBe('PUT');
        expect(options.body.get('slug')).toBe('new-slug');
    });

    it('surfaces every validation message from a 400', async () => {
        const errors = ['Add a featured image.', 'Describe the featured image in its alt text.'];
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(400, { error: errors.join(' '), errors })));

        const failure = await addBlog({ ...post, status: 'published' }).catch((err) => err);
        expect(failure).toBeInstanceOf(Error);
        expect(failure.status).toBe(400);
        expect(failure.errors).toEqual(errors);
        expect(failure.message).toBe(errors.join(' '));
    });

    it('keeps the error and details of a server failure', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(500, { error: 'Failed to add blog', details: 'boom' })));

        await expect(addBlog(post)).rejects.toThrow('Failed to add blog: boom');
    });

    it('uploads an inline image with its alt text', async () => {
        const spy = vi.fn().mockResolvedValue(jsonResponse(201, { url: 'https://res.cloudinary.com/x/image/upload/a.webp', width: 800, height: 600 }));
        vi.stubGlobal('fetch', spy);
        const file = new File(['x'], 'range.png', { type: 'image/png' });

        await expect(uploadBlogImage(file, 'Six-burner range')).resolves.toMatchObject({ width: 800, height: 600 });
        const [url, options] = spy.mock.calls[0];
        expect(url).toBe('/api/blogs/images');
        expect(options.body.get('alt')).toBe('Six-burner range');
        expect(options.body.get('image')).toBeInstanceOf(File);
    });
});

describe('importBundledBlogs', () => {
    it('posts to the import route with the session cookie', async () => {
        const spy = vi.fn().mockResolvedValue(jsonResponse(201, { message: 'Imported 4 posts', imported: ['a', 'b'] }));
        vi.stubGlobal('fetch', spy);

        await expect(importBundledBlogs()).resolves.toEqual({ message: 'Imported 4 posts', imported: ['a', 'b'] });
        const [url, options] = spy.mock.calls[0];
        expect(url).toBe('/api/blogs/import-bundled');
        expect(options.method).toBe('POST');
        expect(options.credentials).toBe('same-origin');
    });

    it('throws the server message when the import fails', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(401, { error: 'Authentication required' })));

        await expect(importBundledBlogs()).rejects.toThrow('Authentication required');
    });
});

describe('fetchAllBlogsAdmin', () => {
    it('asks for drafts too', async () => {
        const spy = vi.fn().mockResolvedValue(jsonResponse(200, [{ slug: 'a', status: 'draft' }]));
        vi.stubGlobal('fetch', spy);

        await expect(fetchAllBlogsAdmin()).resolves.toEqual([{ slug: 'a', status: 'draft' }]);
        expect(spy.mock.calls[0][0]).toBe('/api/blogs?drafts=1');
    });

    it('throws instead of falling back to bundled posts', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(401, { error: 'Authentication required' })));

        await expect(fetchAllBlogsAdmin()).rejects.toThrow('Authentication required');
    });
});
