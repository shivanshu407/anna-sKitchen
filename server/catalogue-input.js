// Turns admin form input into storable products and categories. Rich-text bodies
// and FAQs go through the same allowlist as blog posts (blog-input.js).

const { sanitizeBody, text, int, imageSrc, parseJson, sanitizeFaqs, walk, SLUG } = require('./blog-input');

const PRODUCT_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG = 80;
const MAX_OLD_SLUGS = 20;
// Paths under /api/products that a category slug would collide with.
const RESERVED_CATEGORY_SLUGS = ['categories', 'images'];

// CommonJS twin of slugify (src/lib/blog-content.js) and productSlug
// (src/lib/catalogue.js), which this server cannot require. Keep them in step;
// catalogue-input.test.js checks that both agree.
function slugify(value) {
    return String(value ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

function productSlug(product) {
    const custom = typeof product?.slug === 'string' ? product.slug.trim().toLowerCase() : '';
    return PRODUCT_SLUG.test(custom) ? custom : slugify(product?.name) || 'product';
}

const list = (value) => (Array.isArray(value) ? value : []);

// Empty values are left out, so a cleared field is removed instead of stored blank.
function compact(object) {
    const out = {};
    for (const [key, value] of Object.entries(object)) {
        if (value === undefined || value === '') continue;
        if (Array.isArray(value) && !value.length) continue;
        if (value?.type === 'doc' && !value.content?.length) continue;
        out[key] = value;
    }
    return out;
}

function sanitizeGallery(gallery) {
    return list(gallery).map((item) => {
        const src = imageSrc(item?.src);
        if (!src) return null;
        const out = { src, alt: text(item.alt, 200) };
        const width = int(item.width, 1, 20000);
        const height = int(item.height, 1, 20000);
        if (width && height) Object.assign(out, { width, height });
        return out;
    }).filter(Boolean).slice(0, 8);
}

function sanitizeProduct(raw = {}) {
    const specs = parseJson(raw.specs, []);
    const faqs = parseJson(raw.faqs, []);
    const gallery = parseJson(raw.gallery, []);
    if ([specs, faqs, gallery].includes(undefined)) return { error: 'The specifications, FAQs or gallery could not be read.' };
    const { body, error } = sanitizeBody(raw.body);
    if (error) return { error };

    const name = text(raw.name, 150);
    const product = {
        name,
        // Left blank, the slug comes from the name, as it does for legacy products.
        slug: text(raw.slug, 200).toLowerCase() || slugify(name).slice(0, MAX_SLUG).replace(/-+$/, ''),
        imageAlt: text(raw.imageAlt, 200),
        summary: text(raw.summary, 320),
        seoTitle: text(raw.seoTitle, 120),
        metaDescription: text(raw.metaDescription, 300),
        focusKeyword: text(raw.focusKeyword, 80),
        modelNumber: text(raw.modelNumber, 60),
        gallery: sanitizeGallery(gallery),
        specs: list(specs)
            .map((spec) => ({ label: text(spec?.label, 60), value: text(spec?.value, 200) }))
            .filter((spec) => spec.label && spec.value)
            .slice(0, 30),
        faqs: sanitizeFaqs(faqs),
        body,
    };
    return { product: compact(product) };
}

function missingBodyAlt(body) {
    let missing = 0;
    if (body) walk(body, (node) => { if (node.type === 'image' && !node.attrs?.alt) missing += 1; });
    return missing;
}

// `takenSlugs` are the current slugs of every other product, in every category.
function validateProduct(product, { takenSlugs = [] } = {}) {
    const errors = [];
    if (!product.name) errors.push('Add a product name.');
    if (!PRODUCT_SLUG.test(product.slug || '')) errors.push('The URL slug may only use lowercase letters, numbers and single hyphens.');
    else if (product.slug.length > MAX_SLUG) errors.push(`Keep the URL slug to ${MAX_SLUG} characters or fewer.`);
    else if (takenSlugs.includes(product.slug)) errors.push('Another product already uses this URL slug.');
    if (!product.image) errors.push('Add a main image.');
    if (!product.imageAlt) errors.push('Describe the main image in its alt text.');
    const galleryMissing = list(product.gallery).filter((item) => !item.alt).length;
    if (galleryMissing) errors.push(`${galleryMissing} gallery image(s) need alt text.`);
    const bodyMissing = missingBodyAlt(product.body);
    if (bodyMissing) errors.push(`${bodyMissing} image(s) in the description need alt text.`);
    return errors;
}

function productSlugsInUse(categories, except) {
    return categories.flatMap((category) => list(category.products))
        .filter((product) => product !== except)
        .map(productSlug);
}

// The previous slug keeps redirecting; the new one never redirects to itself.
function nextOldSlugs(previousSlug, oldSlugs, newSlug) {
    const slugs = [...list(oldSlugs), previousSlug].filter((slug) => slug && slug !== newSlug);
    return [...new Set(slugs)].slice(-MAX_OLD_SLUGS);
}

function validateNewCategory({ slug, title }) {
    const errors = [];
    if (!SLUG.test(slug || '') || slug.length > MAX_SLUG || RESERVED_CATEGORY_SLUGS.includes(slug)) {
        errors.push('Choose a category, or give the new category a URL of lowercase letters, numbers and single hyphens.');
    }
    if (!title) errors.push('Name the new category.');
    return errors;
}

// Only the fields present in `raw` are returned, so a partial update leaves the rest alone.
function sanitizeCategory(raw = {}) {
    const out = {};
    if (raw.title !== undefined) out.title = text(raw.title, 100);
    if (raw.description !== undefined) out.description = text(raw.description, 1000);
    if (raw.seoTitle !== undefined) out.seoTitle = text(raw.seoTitle, 120) || undefined;
    if (raw.metaDescription !== undefined) out.metaDescription = text(raw.metaDescription, 300) || undefined;
    if (raw.faqs !== undefined) {
        const faqs = parseJson(raw.faqs, []);
        if (faqs === undefined) return { error: 'The FAQs could not be read.' };
        const clean = sanitizeFaqs(faqs);
        out.faqs = clean.length ? clean : undefined;
    }
    if (raw.body !== undefined) {
        const { body, error } = sanitizeBody(raw.body);
        if (error) return { error };
        out.body = body.content.length ? body : undefined;
    }
    return { category: out };
}

function validateCategory(category) {
    const errors = [];
    if (!category.title) errors.push('Add a category title.');
    const bodyMissing = missingBodyAlt(category.body);
    if (bodyMissing) errors.push(`${bodyMissing} image(s) in the buying guide need alt text.`);
    return errors;
}

module.exports = {
    PRODUCT_SLUG, slugify, productSlug, sanitizeProduct, validateProduct, productSlugsInUse, nextOldSlugs,
    validateNewCategory, sanitizeCategory, validateCategory,
};
