import { describe, expect, it } from 'vitest';
import { LIMITS, analyzeProduct, productDescription, productSeoTitle } from './product-seo-check.js';

const text = (value, marks) => (marks ? { type: 'text', text: value, marks } : { type: 'text', text: value });
const link = (value, href) => text(value, [{ type: 'link', attrs: { href } }]);
const p = (...content) => ({ type: 'paragraph', content: content.map((c) => (typeof c === 'string' ? text(c) : c)) });
const img = (alt) => ({ type: 'image', attrs: { src: 'https://res.cloudinary.com/demo/image/upload/range.jpg', alt } });
const doc = (...content) => ({ type: 'doc', content });

const FILLER = 'The burners are cast iron and the frame is welded stainless steel for daily restaurant service. ';

function wellFormed() {
    return {
        name: 'Three Burner Gas Range',
        slug: 'three-burner-gas-range',
        seoTitle: 'Three Burner Gas Range in Surat | AK Sales',
        metaDescription: 'A heavy-duty three burner gas range in SS 304 for restaurants, hotels and canteens in Surat, built for long service hours and easy daily cleaning.',
        summary: 'A heavy-duty three burner gas range in SS 304 for restaurants, hotels and canteens that cook for long hours every day.',
        focusKeyword: 'gas range',
        image: 'https://res.cloudinary.com/demo/image/upload/range.jpg',
        imageAlt: 'Three burner stainless steel gas range',
        gallery: [{ src: 'https://res.cloudinary.com/demo/image/upload/side.jpg', alt: 'Side view of the range' }],
        specs: [
            { label: 'Material', value: 'SS 304' },
            { label: 'Burners', value: '3' },
            { label: 'Fuel', value: 'LPG / PNG' },
        ],
        faqs: [{ question: 'Does it run on PNG?', answer: 'Yes, with the PNG nozzle kit.' }],
        body: doc(
            p(FILLER.repeat(10), link('See all ranges', '/collections/heating-range'), '.'),
            img('Burner close-up'),
        ),
    };
}

const analyze = (overrides = {}, taken) => analyzeProduct({ ...wellFormed(), ...overrides }, taken);
const levelOf = (overrides, id, taken) => analyze(overrides, taken).find((r) => r.id === id)?.level;

describe('analyzeProduct: shape', () => {
    it('returns { id, level, message } items and no errors or warnings for a complete product', () => {
        const results = analyze();
        results.forEach((r) => {
            expect(['error', 'warn', 'ok']).toContain(r.level);
            expect(typeof r.message).toBe('string');
        });
        expect(results.filter((r) => r.level !== 'ok')).toEqual([]);
    });

    it('copes with an empty product', () => {
        expect(analyzeProduct().filter((r) => r.level === 'error').map((r) => r.id)).toEqual(['name', 'slug', 'image', 'image-alt']);
    });
});

describe('analyzeProduct: save blockers', () => {
    it('requires a name', () => {
        expect(levelOf({ name: '  ' }, 'name')).toBe('error');
    });

    it('requires a valid slug', () => {
        expect(levelOf({ slug: '' }, 'slug')).toBe('error');
        expect(levelOf({ slug: 'Bad Slug' }, 'slug')).toBe('error');
        expect(levelOf({ slug: 'a'.repeat(LIMITS.slug + 1) }, 'slug')).toBe('error');
    });

    it('rejects a slug another product already uses', () => {
        expect(levelOf({}, 'slug', ['three-burner-gas-range'])).toBe('error');
        expect(levelOf({}, 'slug', ['other-product'])).toBe('ok');
    });

    it('requires a main image', () => {
        expect(levelOf({ image: '' }, 'image')).toBe('error');
    });

    it('requires main image alt text and warns when it is long', () => {
        expect(levelOf({ imageAlt: '' }, 'image-alt')).toBe('error');
        expect(levelOf({ imageAlt: 'x'.repeat(LIMITS.imageAlt + 1) }, 'image-alt')).toBe('warn');
    });

    it('requires alt text on gallery and description images', () => {
        expect(levelOf({ gallery: [{ src: '/a.webp', alt: '' }] }, 'images-alt')).toBe('error');
        expect(levelOf({ body: doc(p('Text'), img('')) }, 'images-alt')).toBe('error');
    });
});

describe('analyzeProduct: advice', () => {
    it('measures the effective search title, falling back to "<name> in Surat | AK Sales"', () => {
        expect(productSeoTitle({ name: 'Tandoor' })).toBe('Tandoor in Surat | AK Sales');
        expect(levelOf({ seoTitle: 'x'.repeat(70) }, 'seo-title-length')).toBe('warn');
        expect(levelOf({ seoTitle: '', name: 'Three Burner Gas Range' }, 'seo-title-length')).toBe('ok');
    });

    it('checks the meta description length, falling back to the summary', () => {
        expect(levelOf({ metaDescription: 'Too short.' }, 'meta-description')).toBe('warn');
        expect(levelOf({ metaDescription: '', summary: '' }, 'meta-description')).toBe('warn');
        const results = analyze({ metaDescription: '' });
        expect(results.find((r) => r.id === 'meta-description').message).toMatch(/taken from the summary/);
        expect(productDescription({ name: 'Tandoor', summary: 'Clay oven.' })).toBe('Clay oven.');
    });

    it('wants a summary of 20–60 words', () => {
        expect(levelOf({ summary: '' }, 'summary')).toBe('warn');
        expect(levelOf({ summary: 'Too short summary.' }, 'summary')).toBe('warn');
        expect(levelOf({ summary: 'word '.repeat(61) }, 'summary')).toBe('warn');
    });

    it('asks for a focus keyword', () => {
        expect(levelOf({ focusKeyword: '' }, 'keyword')).toBe('warn');
    });

    it('looks for the keyword in the name, slug, summary and meta description', () => {
        const results = analyze({ focusKeyword: 'tandoor' });
        ['keyword-name', 'keyword-slug', 'keyword-summary', 'keyword-meta'].forEach((id) => {
            expect(results.find((r) => r.id === id).level).toBe('warn');
        });
        expect(levelOf({}, 'keyword-slug')).toBe('ok');
    });

    it('wants at least 3 complete specifications', () => {
        expect(levelOf({ specs: [{ label: 'Material', value: 'SS 304' }, { label: 'Burners', value: '' }] }, 'specs')).toBe('warn');
    });

    it('wants a description of at least 150 words', () => {
        expect(levelOf({ body: doc(p('Short description.')) }, 'description')).toBe('warn');
    });

    it('suggests an internal link', () => {
        expect(levelOf({ body: doc(p(FILLER.repeat(10), link('Maker', 'https://example.com'))) }, 'internal-link')).toBe('warn');
        expect(levelOf({}, 'internal-link')).toBe('ok');
    });

    it('suggests FAQs', () => {
        expect(levelOf({ faqs: [{ question: 'Q?', answer: '' }] }, 'faq')).toBe('warn');
    });
});
