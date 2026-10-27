// Live SEO checklist for the admin product editor, in the same shape as
// blog-seo-check.js. Errors mirror the server's save blockers for products
// (name, unique valid slug, main image + alt, alt on every other image);
// everything else is advice.
import { bodyToText, slugify, walkBody, wordCount } from './blog-content.js';
import { PRODUCT_SLUG } from './catalogue.js';

export const LIMITS = {
    seoTitle: [30, 60],
    metaDescription: [120, 160],
    summaryWords: [20, 60],
    imageAlt: 125,
    bodyWords: 150,
    specs: 3,
    slug: 80,
    gallery: 8,
};

const INTERNAL = /^(?:\/(?!\/)|https?:\/\/(?:www\.)?aksales\.in(?:[/?#]|$))/i;

const str = (value) => (typeof value === 'string' ? value.trim() : '');
const check = (id, level, message) => ({ id, level, message });

// The search-result title and description the product page asks for; the
// fallbacks match src/lib/seo.js.
export function productSeoTitle(product) {
    return str(product?.seoTitle) || `${str(product?.name)} in Surat | AK Sales`;
}

export function productDescription(product, categoryTitle = '') {
    const name = str(product?.name);
    return str(product?.metaDescription) || str(product?.summary)
        || `${name} from AK Sales in Surat. Explore our ${str(categoryTitle).toLowerCase()} catalogue and contact us for commercial kitchen specifications and a quote.`;
}

function keywordPattern(keyword) {
    const escaped = keyword.split(/\s+/).map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
    return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}`, 'iu');
}

function scanBody(body) {
    const found = { images: [], links: [] };
    walkBody(body, (node) => {
        if (node.type === 'image') found.images.push(node.attrs || {});
        else if (node.type === 'text') {
            const link = (node.marks || []).find((mark) => mark?.type === 'link');
            if (typeof link?.attrs?.href === 'string') found.links.push(link.attrs.href.trim());
        }
    });
    return found;
}

function lengthCheck(id, value, [min, max], label, advice) {
    const n = value.length;
    if (n < min) return check(id, 'warn', `${label} is ${n} characters. Aim for ${min}–${max} ${advice}.`);
    if (n > max) return check(id, 'warn', `${label} is ${n} characters. Shorten it to ${max} or fewer so Google does not cut it off.`);
    return check(id, 'ok', `${label} length is good (${n} characters).`);
}

function saveBlockers(product, scan, takenSlugs) {
    const out = [];
    const name = str(product.name);
    const slug = str(product.slug);
    const imageAlt = str(product.imageAlt);

    out.push(name ? check('name', 'ok', 'The product has a name.') : check('name', 'error', 'Add the product name.'));

    if (!slug) out.push(check('slug', 'error', 'Add a web address (slug), for example "three-burner-gas-range".'));
    else if (!PRODUCT_SLUG.test(slug) || slug.length > LIMITS.slug) {
        out.push(check('slug', 'error', `Fix the web address (slug): use only lowercase letters, numbers and single hyphens, up to ${LIMITS.slug} characters.`));
    } else if (takenSlugs.includes(slug)) {
        out.push(check('slug', 'error', `Another product already uses the web address "${slug}". Choose a different one.`));
    } else out.push(check('slug', 'ok', 'The web address (slug) is valid and unique.'));

    out.push(product.image
        ? check('image', 'ok', 'The product has a main image.')
        : check('image', 'error', 'Add a main image.'));
    if (!imageAlt) out.push(check('image-alt', 'error', 'Describe the main image in its alt text.'));
    else if (imageAlt.length > LIMITS.imageAlt) out.push(check('image-alt', 'warn', `The main image alt text is ${imageAlt.length} characters. Keep it under ${LIMITS.imageAlt}.`));
    else out.push(check('image-alt', 'ok', 'The main image has alt text.'));

    const gallery = Array.isArray(product.gallery) ? product.gallery : [];
    const missing = [...gallery, ...scan.images].filter((image) => !str(image?.alt)).length;
    out.push(missing
        ? check('images-alt', 'error', `${missing} gallery or description image(s) need alt text. Describe what each one shows.`)
        : check('images-alt', 'ok', 'Every gallery and description image has alt text.'));
    return out;
}

function keywordChecks(product, keyword, meta) {
    const out = [check('keyword', 'ok', `Focus keyword: "${keyword}".`)];
    const pattern = keywordPattern(keyword);
    const where = (id, found, yes, no) => out.push(check(id, found ? 'ok' : 'warn', found ? yes : no));

    where('keyword-name', pattern.test(str(product.name)), 'The focus keyword is in the product name.', 'Use the focus keyword in the product name.');
    const keySlug = slugify(keyword);
    where('keyword-slug', Boolean(keySlug) && `-${str(product.slug)}-`.includes(`-${keySlug}-`),
        'The focus keyword is in the web address.', `Use the focus keyword in the web address, for example "${keySlug}".`);
    where('keyword-summary', pattern.test(str(product.summary)),
        'The focus keyword is in the short summary.', 'Mention the focus keyword in the short summary.');
    where('keyword-meta', pattern.test(meta),
        'The focus keyword is in the meta description.', 'Use the focus keyword in the meta description.');
    return out;
}

/**
 * Checks a product as the editor holds it. `takenSlugs` lists the slugs of
 * every other product, so a duplicate address is caught before saving.
 */
export function analyzeProduct(product = {}, takenSlugs = []) {
    const body = product.body && typeof product.body === 'object' ? product.body : { type: 'doc', content: [] };
    const scan = scanBody(body);
    const out = saveBlockers(product, scan, takenSlugs);

    out.push(lengthCheck('seo-title-length', productSeoTitle(product), LIMITS.seoTitle, 'The search result title', 'so it shows in full on Google'));

    const ownMeta = str(product.metaDescription);
    const meta = ownMeta || str(product.summary);
    if (!meta) out.push(check('meta-description', 'warn', `Add a meta description (${LIMITS.metaDescription.join('–')} characters) to control the text under your Google result.`));
    else out.push(lengthCheck('meta-description', meta, LIMITS.metaDescription,
        ownMeta ? 'The meta description' : 'The meta description (taken from the summary)', 'so Google shows a full snippet'));

    const [minWords, maxWords] = LIMITS.summaryWords;
    const summaryWords = wordCount(str(product.summary));
    if (!summaryWords) out.push(check('summary', 'warn', `Add a short summary of ${minWords}–${maxWords} words: what the product is and who it is for.`));
    else if (summaryWords < minWords || summaryWords > maxWords) out.push(check('summary', 'warn', `The summary is ${summaryWords} words. Aim for ${minWords}–${maxWords}.`));
    else out.push(check('summary', 'ok', `The summary length is good (${summaryWords} words).`));

    const keyword = str(product.focusKeyword).replace(/\s+/g, ' ');
    if (keyword) out.push(...keywordChecks(product, keyword, meta));
    else out.push(check('keyword', 'warn', 'Set a focus keyword: the main phrase a customer would search for.'));

    const specs = (Array.isArray(product.specs) ? product.specs : []).filter((spec) => str(spec?.label) && str(spec?.value)).length;
    out.push(specs >= LIMITS.specs
        ? check('specs', 'ok', `The product lists ${specs} specifications.`)
        : check('specs', 'warn', `Add at least ${LIMITS.specs} specifications, such as material, dimensions and capacity. It has ${specs}.`));

    const words = wordCount(bodyToText(body));
    out.push(words >= LIMITS.bodyWords
        ? check('description', 'ok', `The description is ${words} words.`)
        : check('description', 'warn', `The description is ${words} words. Aim for at least ${LIMITS.bodyWords}: uses, build, sizes and care.`));

    out.push(scan.links.some((href) => INTERNAL.test(href))
        ? check('internal-link', 'ok', 'The description links to another page on this site.')
        : check('internal-link', 'warn', 'Consider linking to a related product, collection or guide on this site.'));

    const faqs = (Array.isArray(product.faqs) ? product.faqs : []).filter((faq) => str(faq?.question) && str(faq?.answer));
    out.push(faqs.length
        ? check('faq', 'ok', `The product has ${faqs.length} FAQ(s).`)
        : check('faq', 'warn', 'Consider adding a few FAQs that buyers often ask, such as fuel type or installation.'));

    return out;
}
