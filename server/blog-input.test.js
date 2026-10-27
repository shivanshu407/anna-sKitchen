import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { sanitizeBody, sanitizePost, validateDraft, validateForPublish, displayDate } = require('./blog-input.js');

const text = (value, marks) => (marks ? { type: 'text', text: value, marks } : { type: 'text', text: value });
const p = (...content) => ({ type: 'paragraph', content });
const doc = (...content) => ({ type: 'doc', content });
const linkTo = (href, rel) => p(text('link', [{ type: 'link', attrs: { href, rel } }]));
const clean = (raw) => sanitizeBody(raw).body;
const hrefOf = (href) => clean(doc(linkTo(href))).content[0].content[0].marks?.[0]?.attrs.href;
const imageNode = (src, alt = 'A fryer') => ({ type: 'image', attrs: { src, alt } });

describe('sanitizeBody: nodes and marks', () => {
    it('drops unknown nodes such as scripts and iframes', () => {
        const body = clean(doc(
            { type: 'script', content: [text('alert(1)')] },
            { type: 'iframe', attrs: { src: 'https://evil.com' } },
            p(text('kept')),
        ));
        expect(body).toEqual(doc(p(text('kept'))));
    });

    it('drops unknown marks and attributes but keeps bold and italic', () => {
        const body = clean(doc({ type: 'paragraph', attrs: { onclick: 'x' }, content: [
            text('a', [{ type: 'bold' }, { type: 'italic' }, { type: 'underline' }, { type: 'textStyle', attrs: { color: 'red' } }]),
        ] }));
        expect(body).toEqual(doc(p(text('a', [{ type: 'bold' }, { type: 'italic' }]))));
    });

    it('drops a node type that is not allowed in its parent', () => {
        const body = clean(doc(p({ type: 'image', attrs: { src: '/a.webp', alt: 'x' } }, text('t'))));
        expect(body).toEqual(doc(p(text('t'))));
    });

    it('returns an empty doc for something that is not a doc', () => {
        expect(clean({ type: 'paragraph' })).toEqual(doc());
        expect(clean(null)).toEqual(doc());
    });
});

describe('sanitizeBody: links', () => {
    it.each(['javascript:alert(1)', ' JavaScript:alert(1)', 'data:text/html,<script>', '//evil.com', '/\\evil.com', 'ftp://example.com', 'https://user:pass@example.com', '/path with space', '/col\u0001lections', '/col\u007flections'])(
        'drops the link %j', (href) => {
            expect(hrefOf(href)).toBeUndefined();
        });

    it.each([
        ['https://example.com/a', 'https://example.com/a'],
        ['http://example.com/', 'http://example.com/'],
        ['mailto:sales@example.com', 'mailto:sales@example.com'],
        ['tel:+919106780688', 'tel:+919106780688'],
        ['/collections', '/collections'],
        ['#sizing', '#sizing'],
    ])('keeps the link %j', (href, expected) => {
        expect(hrefOf(href)).toBe(expected);
    });

    it('keeps the text of a link whose href was dropped', () => {
        expect(clean(doc(linkTo('javascript:alert(1)')))).toEqual(doc(p(text('link'))));
    });

    it('keeps rel only as nofollow', () => {
        const rel = (value) => clean(doc(linkTo('https://example.com', value))).content[0].content[0].marks[0].attrs.rel;
        expect(rel('nofollow noopener')).toBe('nofollow');
        expect(rel('noopener" onmouseover="x')).toBeNull();
        expect(rel(undefined)).toBeNull();
    });
});

describe('sanitizeBody: images', () => {
    it('keeps Cloudinary and site-path images', () => {
        const body = clean(doc(imageNode('https://res.cloudinary.com/demo/image/upload/a.jpg'), imageNode('/blog/a.webp')));
        expect(body.content.map((n) => n.attrs.src)).toEqual(['https://res.cloudinary.com/demo/image/upload/a.jpg', '/blog/a.webp']);
    });

    it.each(['https://evil.com/a.jpg', 'http://res.cloudinary.com/demo/a.jpg', 'javascript:alert(1)', '//evil.com/a.jpg', '#top', 'data:image/png;base64,AAAA'])(
        'drops the image source %j', (src) => {
            expect(clean(doc(imageNode(src)))).toEqual(doc());
        });

    it('keeps width and height only as a valid pair', () => {
        const node = (attrs) => clean(doc({ type: 'image', attrs: { src: '/a.webp', alt: 'x', ...attrs } })).content[0].attrs;
        expect(node({ width: 800, height: 600 })).toMatchObject({ width: 800, height: 600 });
        expect(node({ width: 800 })).not.toHaveProperty('width');
        expect(node({ width: -1, height: 600 })).not.toHaveProperty('width');
    });
});

describe('sanitizeBody: headings', () => {
    const heading = (level) => ({ type: 'heading', attrs: { level }, content: [text('H')] });

    it.each([[1, 2], [2, 2], [3, 3], [4, 4], [5, 4], [6, 4], [undefined, 2]])('clamps level %s to %s', (level, expected) => {
        expect(clean(doc(heading(level))).content[0].attrs.level).toBe(expected);
    });

    it('turns a heading inside a list item into a paragraph', () => {
        const body = clean(doc({ type: 'bulletList', content: [{ type: 'listItem', content: [heading(2)] }] }));
        expect(body.content[0].content[0].content[0]).toEqual(p(text('H')));
    });
});

describe('sanitizeBody: limits and input', () => {
    it('drops content nested deeper than the cap but keeps ordinary nesting', () => {
        const nested = (levels) => {
            let node = p(text('deep'));
            for (let i = 0; i < levels; i += 1) node = { type: 'bulletList', content: [{ type: 'listItem', content: [node] }] };
            return doc(node);
        };
        expect(JSON.stringify(clean(nested(3)))).toContain('deep');
        expect(JSON.stringify(clean(nested(10)))).not.toContain('deep');
    });

    it('refuses an oversized body, as a string or an object', () => {
        const huge = doc(p(text('x'.repeat(200001))));
        expect(sanitizeBody(JSON.stringify(huge)).error).toMatch(/too large/);
        expect(sanitizeBody(huge).error).toMatch(/too large/);
    });

    it('reports invalid JSON as an error', () => {
        expect(sanitizeBody('{not json').error).toMatch(/could not be read/);
    });

    it('accepts the body as a JSON string', () => {
        expect(clean(JSON.stringify(doc(p(text('hi')))))).toEqual(doc(p(text('hi'))));
    });
});

describe('sanitizePost', () => {
    const base = { title: ' Title ', slug: 'My-Post', body: JSON.stringify(doc(p(text('x')))) };

    it('trims fields, lowercases the slug and fills defaults', () => {
        const { post } = sanitizePost(base);
        expect(post).toMatchObject({ title: 'Title', slug: 'my-post', status: 'published', category: 'General', author: 'AK Sales Team', tags: [], faqs: [] });
    });

    it('treats anything but "draft" as published', () => {
        expect(sanitizePost({ ...base, status: 'draft' }).post.status).toBe('draft');
        expect(sanitizePost({ ...base, status: 'archived' }).post.status).toBe('published');
    });

    it('parses tags from JSON, dropping blanks and keeping at most 10', () => {
        const tags = JSON.stringify(['a', ' ', 'b'.repeat(60), ...Array.from({ length: 12 }, (_, i) => `t${i}`)]);
        const { post } = sanitizePost({ ...base, tags });
        expect(post.tags).toHaveLength(10);
        expect(post.tags[0]).toBe('a');
        expect(post.tags[1]).toHaveLength(40);
    });

    it('parses FAQs, dropping incomplete ones and keeping at most 20', () => {
        const faqs = [{ question: 'Q?', answer: '' }, { question: '', answer: 'A' }, 'junk',
            ...Array.from({ length: 25 }, (_, i) => ({ question: `Q${i}`, answer: `A${i}` }))];
        const { post } = sanitizePost({ ...base, faqs: JSON.stringify(faqs) });
        expect(post.faqs).toHaveLength(20);
        expect(post.faqs[0]).toEqual({ question: 'Q0', answer: 'A0' });
    });

    it('reports unreadable tags or FAQs', () => {
        expect(sanitizePost({ ...base, tags: '[oops' }).error).toBeTruthy();
        expect(sanitizePost({ ...base, faqs: '{oops' }).error).toBeTruthy();
    });

    it('passes a body error through', () => {
        expect(sanitizePost({ ...base, body: '{oops' }).error).toMatch(/could not be read/);
    });

    it.each([
        ['https://example.com/me', 'https://example.com/me'],
        ['http://example.com/', 'http://example.com/'],
        ['javascript:alert(1)', ''],
        ['mailto:me@example.com', ''],
        ['//evil.com', ''],
    ])('filters authorUrl %j', (authorUrl, expected) => {
        expect(sanitizePost({ ...base, authorUrl }).post.authorUrl).toBe(expected);
    });

    it('keeps a valid publishedAt and ignores an invalid one', () => {
        expect(sanitizePost({ ...base, publishedAt: '2026-01-15T10:00:00+05:30' }).post.publishedAt.toISOString()).toBe('2026-01-15T04:30:00.000Z');
        expect(sanitizePost({ ...base, publishedAt: 'not a date' }).post).not.toHaveProperty('publishedAt');
    });
});

describe('validation', () => {
    const ready = () => ({
        title: 'Title', slug: 'a-post', image: 'https://res.cloudinary.com/demo/a.jpg', imageAlt: 'A fryer',
        body: doc(p(text('Words'))),
    });

    it('lets a draft through with only a title and slug', () => {
        expect(validateDraft({ title: 'Title', slug: 'a-post', body: doc() })).toEqual([]);
    });

    it('still requires a title and valid slug for a draft', () => {
        expect(validateDraft({ title: '', slug: 'Bad Slug' })).toEqual([
            'Add a title.',
            'The URL slug may only use lowercase letters, numbers and single hyphens.',
        ]);
    });

    it('passes a complete post for publishing', () => {
        expect(validateForPublish(ready())).toEqual([]);
    });

    it('lists every publish blocker', () => {
        expect(validateForPublish({ title: 'Title', slug: 'a-post', body: doc(imageNode('/a.webp', '')) })).toEqual([
            'Add a featured image.',
            'Describe the featured image in its alt text.',
            'Write the article body.',
            '1 image(s) in the article need alt text.',
        ]);
    });

    it('accepts legacy sections as the body', () => {
        expect(validateForPublish({ ...ready(), body: doc(), content: [{ heading: 'H', text: 'T' }] })).toEqual([]);
    });

    it('formats the display date in Indian time', () => {
        expect(displayDate(new Date('2025-01-14T20:00:00Z'))).toBe('Jan 15, 2025');
    });
});
