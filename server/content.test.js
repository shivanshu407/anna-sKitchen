import { describe, it, expect, vi } from 'vitest';
import content from './content.js';

const { createContentLoader, toCatalogue } = content;
const fallback = { products: { fallback: {} }, blogs: [] };
const live = { products: { live: {} }, blogs: [] };

describe('server catalogue snapshots', () => {
    it('shares the exact public catalogue shape with the API and omits database fields', () => {
        expect(toCatalogue([{ _id: 'private-id', slug: 'custom', title: 'Custom', description: 'Description', products: [{ name: 'Range', image: '/range.webp', _id: 'item-id' }] }])).toEqual({
            custom: { slug: 'custom', title: 'Custom', description: 'Description', products: [{ name: 'Range', image: '/range.webp' }] },
        });
        expect(toCatalogue([])).toEqual({});
    });
    it('passes the SEO fields through and leaves out the ones a product does not have', () => {
        const updatedAt = new Date('2026-10-01T00:00:00Z');
        const body = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Guide' }] }] };
        const rich = {
            name: 'Dosa Bhatti', slug: 'dosa-bhatti', oldSlugs: ['dosa-plate'], image: '/dosa.webp', imageAlt: 'A dosa bhatti',
            imageWidth: 800, imageHeight: 600, gallery: [{ src: '/side.webp', alt: 'Side view' }], summary: 'Flat griddle.',
            body, specs: [{ label: 'Burners', value: '2' }], faqs: [{ question: 'Gas?', answer: 'LPG or PNG.' }],
            seoTitle: 'Dosa Bhatti', metaDescription: 'A griddle.', focusKeyword: 'dosa bhatti', modelNumber: 'DB-2', updatedAt,
        };
        const publicCategory = {
            slug: 'heating-range', title: 'Heating Range', description: 'Ranges', seoTitle: 'Ranges in Surat',
            metaDescription: 'Ranges', body, faqs: [{ question: 'Q', answer: 'A' }], updatedAt,
        };
        const stored = {
            ...publicCategory, _id: 'c', createdAt: updatedAt, __v: 0,
            products: [{ ...rich, _id: 'p' }, { name: 'Tawa', image: '/tawa.webp', extra: 'not public' }],
        };
        expect(toCatalogue([stored])).toEqual({
            'heating-range': { ...publicCategory, products: [rich, { name: 'Tawa', image: '/tawa.webp' }] },
        });
    });
    it('reads Mongoose documents the same way as lean ones, so legacy items stay { name, image }', async () => {
        const { createRequire } = await import('node:module');
        const Category = createRequire(import.meta.url)('./models/Product.js');
        const doc = new Category({ slug: 'custom', title: 'Custom', products: [{ name: 'Range', image: '/range.webp' }] });
        expect(toCatalogue([doc]).custom).toEqual({ slug: 'custom', title: 'Custom', description: '', products: [{ name: 'Range', image: '/range.webp' }] });
    });
    it('uses bundled content immediately when the database is disconnected', async () => {
        const read = vi.fn();
        const loader = createContentLoader({ fallback, isConnected: () => false, read });
        expect(await loader.get()).toEqual({ data: fallback, degraded: true });
        expect(read).not.toHaveBeenCalled();
    });
    it('coalesces concurrent refreshes and caches the successful snapshot', async () => {
        const read = vi.fn().mockResolvedValue(live);
        const loader = createContentLoader({ fallback, isConnected: () => true, read, now: () => 1 });
        const results = await Promise.all([loader.get(), loader.get(), loader.get()]);
        expect(results.every(result => result.data === live)).toBe(true);
        await loader.get();
        expect(read).toHaveBeenCalledTimes(1);
    });
    it('refreshes expired content and respects explicit invalidation after admin changes', async () => {
        let time = 1;
        const read = vi.fn().mockResolvedValue(live);
        const loader = createContentLoader({ fallback, isConnected: () => true, read, now: () => time, ttl: 10 });
        await loader.get();
        time = 12;
        await loader.get();
        loader.invalidate();
        await loader.get();
        expect(read).toHaveBeenCalledTimes(3);
    });
    it('preserves the last known catalogue when a refresh fails', async () => {
        const read = vi.fn().mockResolvedValueOnce(live).mockRejectedValue(new Error('offline'));
        const loader = createContentLoader({ fallback, isConnected: () => true, read });
        await loader.get();
        loader.invalidate();
        expect(await loader.get()).toEqual({ data: live, degraded: true });
    });
    it('retains an intentionally empty live catalogue instead of resurrecting products', async () => {
        const empty = { products: {}, blogs: [] };
        const loader = createContentLoader({ fallback, isConnected: () => true, read: async () => empty });
        expect((await loader.get()).data).toEqual(empty);
    });
});
