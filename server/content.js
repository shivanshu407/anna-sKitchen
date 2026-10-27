function createContentLoader({ fallback, isConnected, read, now = Date.now, ttl = 60000 }) {
    let snapshot;
    let expires = 0;
    let pending;
    return {
        invalidate() { expires = 0; },
        async get() {
            if (snapshot && now() < expires) return { data: snapshot, degraded: false };
            if (!isConnected()) return { data: snapshot || fallback, degraded: true };
            if (!pending) {
                pending = Promise.resolve().then(read).then(data => {
                    snapshot = data;
                    expires = now() + ttl;
                    return { data, degraded: false };
                }).catch(() => ({ data: snapshot || fallback, degraded: true }))
                    .finally(() => { pending = undefined; });
            }
            return pending;
        },
    };
}

module.exports = { createContentLoader, toCatalogue };
const CATEGORY_FIELDS = ['title', 'slug', 'description', 'seoTitle', 'metaDescription', 'body', 'faqs', 'updatedAt'];
const PRODUCT_FIELDS = ['name', 'slug', 'oldSlugs', 'image', 'imageAlt', 'imageWidth', 'imageHeight', 'gallery', 'summary',
    'body', 'specs', 'faqs', 'seoTitle', 'metaDescription', 'focusKeyword', 'modelNumber', 'updatedAt'];

// Only listed fields, never _id; undefined ones are left out so legacy items stay { name, image }.
function pick(source, fields) {
    const out = {};
    for (const field of fields) if (source[field] !== undefined) out[field] = source[field];
    return out;
}

function toCatalogue(categories) {
    return Object.fromEntries(categories.map((doc) => {
        const category = typeof doc.toObject === 'function' ? doc.toObject() : doc;
        return [category.slug, {
            ...pick(category, CATEGORY_FIELDS),
            products: (category.products || []).map((product) => pick(product, PRODUCT_FIELDS)),
        }];
    }));
}

