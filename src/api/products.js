const API_BASE = '/api';

// Default fallback data import
import defaultProductsData from '../data/productsData';
import { fetchWithTimeout } from './http';

/**
 * Fetch all products from the API, falls back to static data if API is unavailable
 */
export const fetchProducts = async () => {
    try {
        const res = await fetchWithTimeout(`${API_BASE}/products`);
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`API error (${res.status}): ${errorText || res.statusText}`);
        }
        return await res.json();
    } catch (err) {
        console.warn('⚠️ API unavailable, using fallback data:', err.message);
        return defaultProductsData;
    }
};

// Turns a failed response into an Error. A 400 from validation carries every
// problem in `errors`, so all of them reach the owner at once.
const responseError = async (res, fallback) => {
    const contentType = res.headers.get('content-type');
    let message = fallback;
    let errors = [];
    if (contentType && contentType.includes('application/json')) {
        const err = await res.json().catch(() => ({}));
        errors = Array.isArray(err.errors) ? err.errors.filter(Boolean) : [];
        if (errors.length) message = errors.join(' ');
        else message = err.details ? `${err.error}: ${err.details}` : (err.error || fallback);
    } else {
        message = await res.text() || fallback;
    }
    const error = new Error(message);
    error.status = res.status;
    error.errors = errors.length ? errors : [message];
    return error;
};

const send = async (url, options, fallback) => {
    const res = await fetch(url, { ...options, credentials: 'same-origin' });
    if (!res.ok) throw await responseError(res, fallback);
    const contentType = res.headers.get('content-type');
    return contentType && contentType.includes('application/json') ? res.json() : {};
};

const path = (...segments) => `${API_BASE}/products/${segments.map((s) => encodeURIComponent(s)).join('/')}`;

const TEXT_FIELDS = [
    'categorySlug', 'categoryTitle', 'name', 'slug', 'imageAlt', 'summary',
    'seoTitle', 'metaDescription', 'focusKeyword', 'modelNumber',
];
const LIST_FIELDS = ['specs', 'faqs', 'gallery'];

/**
 * The multipart body the product routes read: plain text fields, JSON strings
 * for body/specs/faqs/gallery, and the main image under `productImage` only
 * when a new file was chosen.
 */
export const productFormData = (product, imageFile) => {
    const formData = new FormData();
    TEXT_FIELDS.forEach((field) => formData.append(field, product[field] == null ? '' : String(product[field])));
    formData.append('body', JSON.stringify(product.body || { type: 'doc', content: [] }));
    LIST_FIELDS.forEach((field) => formData.append(field, JSON.stringify(Array.isArray(product[field]) ? product[field] : [])));
    if (imageFile) formData.append('productImage', imageFile);
    return formData;
};

/**
 * Add a product (and its category, when `categoryTitle` names a new one).
 * Resolves to { message, category, product }.
 */
export const addProduct = (product, imageFile) =>
    send(`${API_BASE}/products`, { method: 'POST', body: productFormData(product, imageFile) }, 'Failed to add product');

/**
 * Update the product stored at categorySlug/productSlug. A different
 * `product.categorySlug` moves it. Resolves to { message, category, product }.
 */
export const updateProduct = (categorySlug, productSlug, product, imageFile) =>
    send(path(categorySlug, productSlug), { method: 'PUT', body: productFormData(product, imageFile) }, 'Failed to update product');

/**
 * Delete a product by its slug.
 */
export const deleteProduct = async (categorySlug, productSlug) => {
    const result = await send(path(categorySlug, productSlug), { method: 'DELETE' }, 'Failed to delete product');
    return result.message ? result : { message: 'Product deleted successfully' };
};

/**
 * Update a category's page content. The slug never changes.
 */
// Multipart rather than JSON: express.json() caps bodies at 100 KB, while a
// buying guide can be larger; multer allows 400 KB per field.
export const updateCategory = (categorySlug, fields) => {
    const formData = new FormData();
    formData.append('title', fields.title ?? '');
    formData.append('description', fields.description ?? '');
    formData.append('seoTitle', fields.seoTitle ?? '');
    formData.append('metaDescription', fields.metaDescription ?? '');
    formData.append('body', JSON.stringify(fields.body || { type: 'doc', content: [] }));
    formData.append('faqs', JSON.stringify(Array.isArray(fields.faqs) ? fields.faqs : []));
    return send(path('categories', categorySlug), { method: 'PUT', body: formData }, 'Failed to update category');
};

/**
 * Upload a gallery or description image. Resolves to { url, width, height }.
 */
export const uploadProductImage = (file, alt) => {
    const formData = new FormData();
    formData.append('alt', alt || '');
    formData.append('image', file);
    return send(`${API_BASE}/products/images`, { method: 'POST', body: formData }, 'Failed to upload image');
};
