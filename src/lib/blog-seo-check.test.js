import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { LIMITS, SLUG, analyzePost } from './blog-seo-check.js';

const require = createRequire(import.meta.url);
const server = require('../../server/blog-input.js');

const text = (value, marks) => (marks ? { type: 'text', text: value, marks } : { type: 'text', text: value });
const link = (value, href) => text(value, [{ type: 'link', attrs: { href } }]);
const p = (...content) => ({ type: 'paragraph', content: content.map((c) => (typeof c === 'string' ? text(c) : c)) });
const h = (level, value) => ({ type: 'heading', attrs: { level }, content: [text(value)] });
const img = (alt) => ({ type: 'image', attrs: { src: 'https://res.cloudinary.com/demo/image/upload/fryer.jpg', alt } });
const doc = (...content) => ({ type: 'doc', content });
const words = (n) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');

const FILLER = 'Plan the oil capacity around your busiest service hour and the dishes you fry most often each day. ';

function wellFormed() {
    return {
        title: 'How to Choose a Commercial Fryer for Your Kitchen',
        slug: 'how-to-choose-a-commercial-fryer',
        seoTitle: 'How to Choose a Commercial Fryer | AK Sales',
        metaDescription: 'Learn how to choose a commercial fryer for a restaurant or hotel kitchen in Surat, covering oil capacity, power, safety and daily cleaning.',
        excerpt: 'A commercial fryer should match your menu, your busiest hour and your power supply. Pick the oil capacity from the portions you fry per hour, choose gas or electric from what your kitchen already has, and favour models with easy drains and thermostats you can trust.',
        focusKeyword: 'commercial fryer',
        image: 'https://res.cloudinary.com/demo/image/upload/fryer.jpg',
        imageAlt: 'Twin-tank stainless steel commercial fryer in a hotel kitchen',
        faqs: [{ question: 'How often should fryer oil be changed?', answer: 'Filter it daily and change it when it darkens or smokes.' }],
        body: doc(
            p('Choosing a commercial fryer starts with your menu. ', FILLER.repeat(4)),
            h(2, 'What size commercial fryer do you need?'),
            p(FILLER.repeat(5), link('Browse our fryers', '/collections/heating-range'), '.'),
            img('Gas fryer with two baskets'),
            h(3, 'Oil capacity'),
            p(FILLER.repeat(5)),
            h(2, 'Gas or electric?'),
            p(FILLER.repeat(5), link('Read the safety guidance', 'https://www.fssai.gov.in/'), '.'),
            h(3, 'Power supply'),
            p(FILLER.repeat(5)),
            p(FILLER.repeat(5)),
            p(FILLER.repeat(5)),
        ),
    };
}

const analyze = (overrides = {}) => analyzePost({ ...wellFormed(), ...overrides });
const find = (results, id) => results.find((r) => r.id === id);
const levelOf = (overrides, id) => find(analyze(overrides), id)?.level;

describe('analyzePost: shape', () => {
    it('exposes the agreed limits', () => {
        expect(LIMITS).toEqual({ title: [30, 60], seoTitle: [30, 60], metaDescription: [120, 160], excerptWords: [40, 60], imageAlt: 125 });
    });

    it('uses the same slug pattern as the server', () => {
        expect(SLUG.source).toBe(server.SLUG.source);
    });

    it('passes a well-formed post with no errors or warnings', () => {
        const results = analyze();
        expect(results.filter((r) => r.level !== 'ok')).toEqual([]);
        expect(results.map((r) => r.id)).toEqual(expect.arrayContaining([
            'title', 'slug', 'image', 'image-alt', 'body', 'body-images-alt', 'title-length', 'seo-title-length',
            'meta-description', 'excerpt', 'keyword', 'keyword-title', 'keyword-slug', 'keyword-intro',
            'keyword-heading', 'keyword-meta', 'keyword-density', 'headings-h2', 'heading-order',
            'paragraph-length', 'word-count', 'internal-link', 'external-link', 'faq',
        ]));
    });

    it('gives every result an id, a level and a plain message', () => {
        for (const r of analyze({ title: '', focusKeyword: '' })) {
            expect(r).toEqual({ id: expect.any(String), level: expect.stringMatching(/^(error|warn|ok)$/), message: expect.any(String) });
            expect(r.message.length).toBeGreaterThan(5);
        }
    });

    it('copes with an empty post', () => {
        expect(() => analyzePost({})).not.toThrow();
        expect(() => analyzePost()).not.toThrow();
        expect(() => analyzePost({ body: null, faqs: 'nope' })).not.toThrow();
    });
});

describe('analyzePost: publish blockers', () => {
    it('errors on a missing title', () => {
        expect(levelOf({ title: '   ' }, 'title')).toBe('error');
    });

    it.each(['', 'Has Caps', 'double--hyphen', '-leading', 'trailing-', 'under_score', 'a'.repeat(81)])(
        'errors on the invalid slug %j', (slug) => {
            expect(levelOf({ slug }, 'slug')).toBe('error');
        });

    it('errors on a missing featured image', () => {
        expect(levelOf({ image: '' }, 'image')).toBe('error');
    });

    it('errors on missing featured alt text and warns when it is too long', () => {
        expect(levelOf({ imageAlt: ' ' }, 'image-alt')).toBe('error');
        expect(levelOf({ imageAlt: 'a'.repeat(126) }, 'image-alt')).toBe('warn');
        expect(levelOf({ imageAlt: 'a'.repeat(125) }, 'image-alt')).toBe('ok');
    });

    it('errors on an empty body, including one with only an image', () => {
        expect(levelOf({ body: doc() }, 'body')).toBe('error');
        expect(levelOf({ body: doc(p('   ')) }, 'body')).toBe('error');
        expect(levelOf({ body: doc(img('A fryer')) }, 'body')).toBe('error');
    });

    it('errors when any article image lacks alt text and warns on long alt text', () => {
        expect(levelOf({ body: doc(p('Text'), img('')) }, 'body-images-alt')).toBe('error');
        expect(levelOf({ body: doc(p('Text'), img('  ')) }, 'body-images-alt')).toBe('error');
        expect(levelOf({ body: doc(p('Text'), img('a'.repeat(126))) }, 'body-images-alt')).toBe('warn');
    });

    it('errors when the body is too large for the server to accept', () => {
        expect(levelOf({ body: doc(p('x'.repeat(200001))) }, 'body-size')).toBe('error');
        expect(find(analyze(), 'body-size')).toBeUndefined();
    });

    it('blocks publishing exactly when the server would refuse it', () => {
        const cases = [
            {},
            { title: '' },
            { slug: 'Bad Slug' },
            { image: '' },
            { imageAlt: '' },
            { body: doc() },
            { body: doc(img('A fryer')) },
            { body: doc(p('Text'), img('')) },
        ];
        for (const overrides of cases) {
            const post = { ...wellFormed(), ...overrides };
            const clientBlocks = analyzePost(post).some((r) => r.level === 'error');
            expect(clientBlocks, JSON.stringify(overrides)).toBe(server.validateForPublish(post).length > 0);
        }
    });
});

describe('analyzePost: titles and snippet', () => {
    it('warns when the title is too short or too long', () => {
        expect(levelOf({ title: 'Fryers' }, 'title-length')).toBe('warn');
        expect(levelOf({ title: 'A'.repeat(61) }, 'title-length')).toBe('warn');
    });

    it('checks the effective search title, adding the site suffix when none is set', () => {
        // 49 characters plus " | AK Sales Surat" is 66.
        expect(levelOf({ seoTitle: '' }, 'seo-title-length')).toBe('warn');
        expect(levelOf({ seoTitle: '', title: 'Choosing a Commercial Fryer' }, 'seo-title-length')).toBe('ok');
        expect(levelOf({ seoTitle: 'Short' }, 'seo-title-length')).toBe('warn');
    });

    it('warns on a missing, short or long meta description', () => {
        expect(levelOf({ metaDescription: '' }, 'meta-description')).toBe('warn');
        expect(levelOf({ metaDescription: 'Too short.' }, 'meta-description')).toBe('warn');
        expect(levelOf({ metaDescription: 'a'.repeat(161) }, 'meta-description')).toBe('warn');
    });

    it('wants a 40–60 word summary', () => {
        expect(levelOf({ excerpt: '' }, 'excerpt')).toBe('warn');
        expect(levelOf({ excerpt: words(39) }, 'excerpt')).toBe('warn');
        expect(levelOf({ excerpt: words(61) }, 'excerpt')).toBe('warn');
        expect(levelOf({ excerpt: words(40) }, 'excerpt')).toBe('ok');
    });
});

describe('analyzePost: focus keyword', () => {
    it('warns when no focus keyword is set and skips the keyword checks', () => {
        const results = analyze({ focusKeyword: ' ' });
        expect(find(results, 'keyword').level).toBe('warn');
        expect(results.some((r) => r.id.startsWith('keyword-'))).toBe(false);
    });

    it('warns when the keyword is missing from the title', () => {
        expect(levelOf({ title: 'How to Choose a Deep Fryer for Your Hotel Kitchen' }, 'keyword-title')).toBe('warn');
    });

    it('matches the keyword case-insensitively and at the start of words', () => {
        expect(levelOf({ title: 'COMMERCIAL FRYERS: a buying guide for Surat hotels' }, 'keyword-title')).toBe('ok');
        expect(levelOf({ focusKeyword: 'pan', title: 'Choosing a span of shelving for any kitchen' }, 'keyword-title')).toBe('warn');
    });

    it('warns when the keyword is missing from the slug', () => {
        expect(levelOf({ slug: 'choosing-a-deep-fryer' }, 'keyword-slug')).toBe('warn');
        expect(levelOf({ slug: 'best-commercial-fryer-2026' }, 'keyword-slug')).toBe('ok');
    });

    it('accepts the keyword in either the summary or the first paragraph', () => {
        const noIntro = doc(p('Start with your menu.'), ...wellFormed().body.content.slice(1));
        expect(levelOf({ excerpt: 'Pick by menu and power.', body: noIntro }, 'keyword-intro')).toBe('warn');
        expect(levelOf({ excerpt: 'Pick by menu and power.' }, 'keyword-intro')).toBe('ok');
        expect(levelOf({ body: noIntro }, 'keyword-intro')).toBe('ok');
    });

    it('needs the keyword in an H2, not just an H3', () => {
        const body = doc(h(2, 'Sizing'), h(3, 'Commercial fryer sizes'), p('Some text.'));
        expect(levelOf({ body }, 'keyword-heading')).toBe('warn');
    });

    it('warns when the keyword is missing from the meta description', () => {
        expect(levelOf({ metaDescription: 'a '.repeat(70) }, 'keyword-meta')).toBe('warn');
    });

    it('warns when the keyword makes up more than 3% of the words', () => {
        const stuffed = doc(h(2, 'Commercial fryer'), p('commercial fryer '.repeat(10), words(200)));
        expect(levelOf({ body: stuffed }, 'keyword-density')).toBe('warn');
    });
});

describe('analyzePost: structure and length', () => {
    it('wants at least two H2 headings', () => {
        expect(levelOf({ body: doc(h(2, 'Only one'), p('Text')) }, 'headings-h2')).toBe('warn');
    });

    it('warns when a heading level is skipped', () => {
        expect(levelOf({ body: doc(h(2, 'A'), h(4, 'B'), p('Text')) }, 'heading-order')).toBe('warn');
        expect(levelOf({ body: doc(h(3, 'Starts too deep'), p('Text')) }, 'heading-order')).toBe('warn');
        expect(levelOf({ body: doc(h(2, 'A'), h(3, 'B'), h(4, 'C'), h(2, 'D'), p('Text')) }, 'heading-order')).toBe('ok');
    });

    it('warns about a paragraph over 150 words', () => {
        expect(levelOf({ body: doc(p(words(151))) }, 'paragraph-length')).toBe('warn');
        expect(levelOf({ body: doc(p(words(150))) }, 'paragraph-length')).toBe('ok');
    });

    it('grades the word count: thin, short, then fine', () => {
        const thin = find(analyze({ body: doc(p(words(299))) }), 'word-count');
        const short = find(analyze({ body: doc(p(words(120)), p(words(120)), p(words(120))) }), 'word-count');
        expect(thin.level).toBe('warn');
        expect(thin.message).toMatch(/thin/);
        expect(short.level).toBe('warn');
        expect(short.message).not.toMatch(/thin/);
        expect(find(analyze(), 'word-count').level).toBe('ok');
    });
});

describe('analyzePost: links and FAQ', () => {
    const withLink = (href) => ({ body: doc(p('See ', link('this page', href), '.')) });

    it('counts site paths and aksales.in links as internal', () => {
        expect(levelOf(withLink('/collections'), 'internal-link')).toBe('ok');
        expect(levelOf(withLink('https://aksales.in/blogs/other-post'), 'internal-link')).toBe('ok');
        expect(levelOf(withLink('https://www.fssai.gov.in/'), 'internal-link')).toBe('warn');
        expect(levelOf(withLink('//evil.com/x'), 'internal-link')).toBe('warn');
        expect(levelOf(withLink('https://aksales.in.evil.com/'), 'internal-link')).toBe('warn');
    });

    it('suggests an external link when there is none', () => {
        expect(levelOf(withLink('/collections'), 'external-link')).toBe('warn');
        expect(levelOf(withLink('mailto:sales@example.com'), 'external-link')).toBe('warn');
        expect(levelOf(withLink('https://www.fssai.gov.in/'), 'external-link')).toBe('ok');
    });

    it('suggests adding an FAQ, ignoring blank ones', () => {
        expect(levelOf({ faqs: [] }, 'faq')).toBe('warn');
        expect(levelOf({ faqs: [{ question: 'Why?', answer: '  ' }] }, 'faq')).toBe('warn');
    });
});
