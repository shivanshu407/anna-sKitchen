import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
    productSlug, sanitizeProduct, validateProduct, productSlugsInUse, nextOldSlugs,
    validateNewCategory, sanitizeCategory, validateCategory,
} = require('./catalogue-input.js');

const text = (value) => ({ type: 'text', text: value });
const p = (...content) => ({ type: 'paragraph', content });
const doc = (...content) => ({ type: 'doc', content });
const image = (alt) => ({ type: 'image', attrs: { src: 'https://res.cloudinary.com/demo/image/upload/a.jpg', alt } });

const valid = (overrides = {}) => ({ name: 'Dosa Bhatti', slug: 'dosa-bhatti', image: '/dosa.webp', imageAlt: 'A dosa bhatti', ...overrides });

describe('productSlug agrees with the ESM twin in src/lib/catalogue.js', () => {
    const products = [
        { name: 'Dosa Bhatti' },
        { name: '  Chinese Range (3 Burner)  ' },
        { name: 'Café Crème Machine' },
        { name: 'Tandoor -- Large' },
        { name: '!!!' },
        { name: '' },
        {},
        { name: 'Anything', slug: 'custom-slug' },
        { name: 'Anything', slug: '  Custom-Slug ' },
        { name: 'Fallback To Name', slug: 'Not a slug!' },
        { name: 'Fallback', slug: 42 },
    ];

    it('derives the same slug for every product', async () => {
        const esm = await import('../src/lib/catalogue.js');
        expect(products.map(productSlug)).toEqual(products.map(esm.productSlug));
        expect(products.map(productSlug).slice(0, 4)).toEqual(['dosa-bhatti', 'chinese-range-3-burner', 'cafe-creme-machine', 'tandoor-large']);
    });
});

describe('sanitizeProduct', () => {
    it('trims and caps text fields and drops empty ones, so a legacy-shaped product stays small', () => {
        const { product } = sanitizeProduct({ name: `  ${'n'.repeat(200)}  `, slug: 'x', summary: '   ', seoTitle: '' });
        expect(product.name).toHaveLength(150);
        expect(Object.keys(product).sort()).toEqual(['name', 'slug']);
    });

    it('derives the slug from the name when none is given', () => {
        expect(sanitizeProduct({ name: 'Chinese Range (3 Burner)' }).product.slug).toBe('chinese-range-3-burner');
    });

    it('reads JSON fields and keeps only well-formed specs, FAQs and safe gallery images', () => {
        const { product } = sanitizeProduct({
            name: 'Range',
            specs: JSON.stringify([{ label: 'Burners', value: '3' }, { label: 'No value' }, { label: 'x'.repeat(100), value: 'y' }]),
            faqs: JSON.stringify([{ question: 'Gas?', answer: 'LPG.' }, { question: 'Missing answer' }]),
            gallery: JSON.stringify([
                { src: 'https://res.cloudinary.com/demo/image/upload/a.jpg', alt: 'Front', width: 800, height: 600 },
                { src: '/images/side.webp', alt: '' },
                { src: 'https://evil.example.com/x.jpg', alt: 'Elsewhere' },
                { src: 'javascript:alert(1)', alt: 'Script' },
            ]),
        });
        expect(product.specs).toEqual([{ label: 'Burners', value: '3' }, { label: 'x'.repeat(60), value: 'y' }]);
        expect(product.faqs).toEqual([{ question: 'Gas?', answer: 'LPG.' }]);
        expect(product.gallery).toEqual([
            { src: 'https://res.cloudinary.com/demo/image/upload/a.jpg', alt: 'Front', width: 800, height: 600 },
            { src: '/images/side.webp', alt: '' },
        ]);
    });

    it('caps the gallery at 8, specs at 30 and FAQs at 20', () => {
        const many = (n, make) => JSON.stringify(Array.from({ length: n }, (_, i) => make(i)));
        const { product } = sanitizeProduct({
            name: 'Range',
            gallery: many(12, (i) => ({ src: `/g${i}.webp`, alt: `G${i}` })),
            specs: many(40, (i) => ({ label: `L${i}`, value: 'v' })),
            faqs: many(30, (i) => ({ question: `Q${i}`, answer: 'a' })),
        });
        expect([product.gallery.length, product.specs.length, product.faqs.length]).toEqual([8, 30, 20]);
    });

    it('sanitizes the body and leaves out an empty one', () => {
        const { product } = sanitizeProduct({ name: 'Range', body: JSON.stringify(doc({ type: 'script' }, p(text('Kept')))) });
        expect(product.body).toEqual(doc(p(text('Kept'))));
        expect(sanitizeProduct({ name: 'Range', body: JSON.stringify(doc()) }).product).not.toHaveProperty('body');
    });

    it('reports unreadable JSON', () => {
        expect(sanitizeProduct({ name: 'Range', specs: '{oops' }).error).toMatch(/could not be read/);
        expect(sanitizeProduct({ name: 'Range', body: '{oops' }).error).toMatch(/could not be read/);
    });
});

describe('validateProduct', () => {
    it('accepts a complete product', () => {
        expect(validateProduct(valid())).toEqual([]);
    });

    it('requires a name, a main image and its alt text', () => {
        expect(validateProduct(valid({ name: '', image: '', imageAlt: '' }))).toEqual([
            'Add a product name.', 'Add a main image.', 'Describe the main image in its alt text.',
        ]);
    });

    it('rejects a malformed or overlong slug', () => {
        expect(validateProduct(valid({ slug: 'Bad Slug' }))[0]).toMatch(/lowercase letters/);
        expect(validateProduct(valid({ slug: '' }))[0]).toMatch(/lowercase letters/);
        expect(validateProduct(valid({ slug: 'a'.repeat(81) }))[0]).toMatch(/80 characters/);
    });

    it('rejects a slug another product already uses', () => {
        expect(validateProduct(valid(), { takenSlugs: ['tawa', 'dosa-bhatti'] })).toEqual(['Another product already uses this URL slug.']);
    });

    it('requires alt text on every gallery and description image', () => {
        const errors = validateProduct(valid({
            gallery: [{ src: '/a.webp', alt: 'A' }, { src: '/b.webp', alt: '' }],
            body: doc(image('Fine'), image(''), image('')),
        }));
        expect(errors).toEqual(['1 gallery image(s) need alt text.', '2 image(s) in the description need alt text.']);
    });
});

describe('slug bookkeeping', () => {
    it('lists the effective slugs of every other product, derived for legacy items', () => {
        const self = { name: 'Dosa Bhatti' };
        const categories = [{ products: [self, { name: 'Tawa' }] }, { products: [{ name: 'Old', slug: 'custom' }] }];
        expect(productSlugsInUse(categories, self)).toEqual(['tawa', 'custom']);
    });

    it('keeps the previous slug, never the new one, without duplicates and at most 20', () => {
        expect(nextOldSlugs('old', undefined, 'new')).toEqual(['old']);
        expect(nextOldSlugs('same', ['older'], 'same')).toEqual(['older']);
        expect(nextOldSlugs('b', ['a', 'new', 'b'], 'new')).toEqual(['a', 'b']);
        const many = Array.from({ length: 25 }, (_, i) => `s${i}`);
        expect(nextOldSlugs('latest', many, 'new')).toEqual([...many.slice(6), 'latest']);
    });
});

describe('categories', () => {
    it('validates a new category slug and title', () => {
        expect(validateNewCategory({ slug: 'pizza-ovens', title: 'Pizza Ovens' })).toEqual([]);
        expect(validateNewCategory({ slug: '', title: '' })).toHaveLength(2);
        expect(validateNewCategory({ slug: 'Pizza Ovens', title: 'Pizza Ovens' })).toHaveLength(1);
        expect(validateNewCategory({ slug: 'categories', title: 'Clash' })).toHaveLength(1);
    });

    it('returns only the fields sent, clearing blank optional ones', () => {
        const { category } = sanitizeCategory({ title: ' Ranges ', seoTitle: '  ', faqs: JSON.stringify([{ question: 'Q', answer: 'A' }]) });
        expect(category).toEqual({ title: 'Ranges', seoTitle: undefined, faqs: [{ question: 'Q', answer: 'A' }] });
        expect(sanitizeCategory({}).category).toEqual({});
    });

    it('accepts the body and FAQs as objects or JSON strings', () => {
        const body = doc(p(text('Guide')));
        expect(sanitizeCategory({ body }).category.body).toEqual(body);
        expect(sanitizeCategory({ body: JSON.stringify(body) }).category.body).toEqual(body);
        expect(sanitizeCategory({ faqs: '{oops' }).error).toMatch(/could not be read/);
    });

    it('requires a title and alt text on buying-guide images', () => {
        expect(validateCategory({ title: '', body: doc(image('')) })).toEqual([
            'Add a category title.', '1 image(s) in the buying guide need alt text.',
        ]);
    });
});
