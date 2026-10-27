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
function toCatalogue(categories) {
    return Object.fromEntries(categories.map(category => [category.slug, {
        title: category.title,
        slug: category.slug,
        description: category.description,
        products: category.products.map(({ name, image }) => ({ name, image })),
    }]));
}

