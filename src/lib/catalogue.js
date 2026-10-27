import { slugify } from './blog-content.js';

// Product URLs are /collections/<category>/<product slug>. Products saved before
// slugs existed have none, so their slug is derived from the name. Old name-based
// URLs, previous slugs and moves between categories all resolve through
// findProduct; the server then 301s to the canonical productPath.

export const PRODUCT_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const encode = (value) => encodeURIComponent(String(value ?? '').toWellFormed());
const validProduct = (product) => typeof product?.name === 'string' && product.name.trim() !== '';

export function productSlug(product) {
    const custom = typeof product?.slug === 'string' ? product.slug.trim().toLowerCase() : '';
    return PRODUCT_SLUG.test(custom) ? custom : slugify(product?.name) || 'product';
}

export function productPath(categorySlug, product) {
    return `/collections/${encode(categorySlug)}/${encode(productSlug(product))}`;
}

export function categoryProducts(category) {
    return Array.isArray(category?.products) ? category.products.filter(validProduct) : [];
}

const oldSlugs = (product) => (Array.isArray(product?.oldSlugs) ? product.oldSlugs.map((s) => String(s).toLowerCase()) : []);

// Returns { categoryKey, product } or null. `segment` is the decoded last URL segment.
export function findProduct(products, categoryKey, segment) {
    if (!products || typeof segment !== 'string' || !segment) return null;
    const wanted = segment.toLowerCase();
    const category = Object.hasOwn(products, categoryKey) ? products[categoryKey] : null;
    const inCategory = categoryProducts(category);

    const match = inCategory.find((p) => productSlug(p) === wanted)
        || inCategory.find((p) => oldSlugs(p).includes(wanted))
        || inCategory.find((p) => p.name.trim().toLowerCase() === wanted);
    if (match) return { categoryKey, product: match };

    // A product moved to another category keeps answering at its old address.
    for (const [key, other] of Object.entries(products)) {
        if (key === categoryKey) continue;
        const moved = categoryProducts(other).find((p) => productSlug(p) === wanted || oldSlugs(p).includes(wanted));
        if (moved) return { categoryKey: key, product: moved };
    }
    return null;
}
