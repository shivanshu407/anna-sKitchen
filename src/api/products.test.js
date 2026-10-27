import { describe, it, expect, vi, afterEach } from 'vitest';
import { addProduct, updateProduct, deleteProduct, updateCategory, uploadProductImage, productFormData } from './products';

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

const product = {
    categorySlug: 'heating-range',
    name: 'Three Burner Range',
    slug: 'three-burner-range',
    imageAlt: 'Three burner gas range in stainless steel',
    summary: 'A heavy-duty three burner range for restaurant kitchens.',
    specs: [{ label: 'Material', value: 'SS 304' }],
    faqs: [{ question: 'Gas type?', answer: 'LPG or PNG.' }],
    gallery: [{ src: 'https://res.cloudinary.com/x/image/upload/a.webp', alt: 'Side view' }],
    body: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }] },
};

describe('productFormData', () => {
    it('sends body, specs, FAQs and gallery as JSON strings', () => {
        const form = productFormData(product);

        expect(JSON.parse(form.get('body'))).toEqual(product.body);
        expect(JSON.parse(form.get('specs'))).toEqual(product.specs);
        expect(JSON.parse(form.get('faqs'))).toEqual(product.faqs);
        expect(JSON.parse(form.get('gallery'))).toEqual(product.gallery);
        expect(form.get('name')).toBe(product.name);
        expect(form.get('categorySlug')).toBe('heating-range');
    });

    it('sends missing text fields as empty strings and missing lists as []', () => {
        const form = productFormData({ name: 'Tandoor', slug: 'tandoor' });

        expect(form.get('modelNumber')).toBe('');
        expect(form.get('categoryTitle')).toBe('');
        expect(form.get('specs')).toBe('[]');
        expect(form.get('gallery')).toBe('[]');
    });

    it('attaches the main image only when a file is chosen', () => {
        expect(productFormData(product).has('productImage')).toBe(false);

        const file = new File(['x'], 'range.webp', { type: 'image/webp' });
        expect(productFormData(product, file).get('productImage')).toBeInstanceOf(File);
    });
});

describe('product write calls', () => {
    it('adds a product with POST /api/products and the session cookie', async () => {
        const spy = vi.fn().mockResolvedValue(jsonResponse(201, { message: 'Added' }));
        vi.stubGlobal('fetch', spy);
        const file = new File(['x'], 'range.webp', { type: 'image/webp' });

        await expect(addProduct(product, file)).resolves.toEqual({ message: 'Added' });
        const [url, options] = spy.mock.calls[0];
        expect(url).toBe('/api/products');
        expect(options.method).toBe('POST');
        expect(options.credentials).toBe('same-origin');
        expect(options.body.get('productImage')).toBeInstanceOf(File);
    });

    it('updates the product stored at its original category and slug', async () => {
        const spy = vi.fn().mockResolvedValue(jsonResponse(200, { message: 'Updated' }));
        vi.stubGlobal('fetch', spy);

        await updateProduct('heating-range', 'old-range', { ...product, categorySlug: 'bakery-products' });
        const [url, options] = spy.mock.calls[0];
        expect(url).toBe('/api/products/heating-range/old-range');
        expect(options.method).toBe('PUT');
        expect(options.body.get('categorySlug')).toBe('bakery-products');
        expect(options.body.has('productImage')).toBe(false);
    });

    it('deletes by slug, not by index', async () => {
        const spy = vi.fn().mockResolvedValue(jsonResponse(200, { message: 'Deleted "Tandoor"' }));
        vi.stubGlobal('fetch', spy);

        await expect(deleteProduct('heating-range', 'tandoor')).resolves.toEqual({ message: 'Deleted "Tandoor"' });
        const [url, options] = spy.mock.calls[0];
        expect(url).toBe('/api/products/heating-range/tandoor');
        expect(options.method).toBe('DELETE');
        expect(options.credentials).toBe('same-origin');
    });

    it('encodes slugs in the address', async () => {
        const spy = vi.fn().mockResolvedValue(jsonResponse(200, {}));
        vi.stubGlobal('fetch', spy);

        await deleteProduct('a/b', 'c d');
        expect(spy.mock.calls[0][0]).toBe('/api/products/a%2Fb/c%20d');
    });

    it('surfaces every validation message from a 400', async () => {
        const errors = ['Add a product name.', 'Describe the main image in its alt text.'];
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(400, { error: errors.join(' '), errors })));

        const failure = await addProduct(product).catch((err) => err);
        expect(failure).toBeInstanceOf(Error);
        expect(failure.status).toBe(400);
        expect(failure.errors).toEqual(errors);
    });

    it('keeps the error and details of a server failure', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(500, { error: 'Failed to update product', details: 'boom' })));

        await expect(updateProduct('a', 'b', product)).rejects.toThrow('Failed to update product: boom');
    });

    it('updates a category with JSON, body and FAQs as JSON strings', async () => {
        const spy = vi.fn().mockResolvedValue(jsonResponse(200, { message: 'Category updated' }));
        vi.stubGlobal('fetch', spy);
        const body = { type: 'doc', content: [] };

        await updateCategory('heating-range', { title: 'Heating Range', faqs: product.faqs, body });
        const [url, options] = spy.mock.calls[0];
        expect(url).toBe('/api/products/categories/heating-range');
        expect(options.method).toBe('PUT');
        expect(options.body).toBeInstanceOf(FormData);
        const sent = options.body;
        expect(sent.get('title')).toBe('Heating Range');
        expect(sent.get('seoTitle')).toBe('');
        expect(JSON.parse(sent.get('faqs'))).toEqual(product.faqs);
        expect(JSON.parse(sent.get('body'))).toEqual(body);
    });

    it('uploads a gallery image with its alt text', async () => {
        const spy = vi.fn().mockResolvedValue(jsonResponse(201, { url: 'https://res.cloudinary.com/x/image/upload/a.webp', width: 800, height: 600 }));
        vi.stubGlobal('fetch', spy);
        const file = new File(['x'], 'range.png', { type: 'image/png' });

        await expect(uploadProductImage(file, 'Range side view')).resolves.toMatchObject({ width: 800 });
        const [url, options] = spy.mock.calls[0];
        expect(url).toBe('/api/products/images');
        expect(options.body.get('alt')).toBe('Range side view');
        expect(options.body.get('image')).toBeInstanceOf(File);
    });
});
