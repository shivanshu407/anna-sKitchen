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
