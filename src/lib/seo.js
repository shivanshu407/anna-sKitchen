import defaultProducts from '../data/productsData.js';
import defaultBlogs from '../data/blogsData.js';
import { blogDescription, blogSeoTitle, bodyOf, bodyToText, wordCount } from './blog-content.js';
import { categoryProducts, findProduct, productPath } from './catalogue.js';

export const SITE_URL = 'https://aksales.in';
const DEFAULT_IMAGE = `${SITE_URL}/images/ak-sales-logo.png`;
const BUSINESS_ID = `${SITE_URL}/#business`;

const plainText = (value) => String(value ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const description = (value) => {
    const text = plainText(value);
    return text.length > 160 ? `${text.slice(0, 157).trimEnd()}…` : text;
};
const encode = (value) => encodeURIComponent(String(value ?? '').toWellFormed());
const decode = (value) => {
    try { return decodeURIComponent(value); } catch { return null; }
};
const xmlEscape = (value) => String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
})[char]);

function safeImage(value) {
    if (typeof value !== 'string' || !value.trim()) return DEFAULT_IMAGE;
    try {
        const url = new URL(value, SITE_URL);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return DEFAULT_IMAGE;
        return url.href;
    } catch { return DEFAULT_IMAGE; }
}

function pathOnly(value) {
    const input = String(value ?? '/');
    let path;
    try { path = new URL(input, `${SITE_URL}/`).pathname; } catch { return '/invalid-url'; }
    return path.replace(/\/+$/, '') || '/';
}

const staticPages = {
    '/': ['Commercial Kitchen Equipment in Surat | AK Sales', 'AK Sales manufactures commercial kitchen equipment in Surat: cooking ranges, refrigeration, bakery equipment and custom kitchen solutions. Enquire today.', 'Home'],
    '/about': ['About AK Sales | Kitchen Equipment Manufacturer in Surat', 'Meet AK Sales, a commercial kitchen equipment manufacturer in Surat, Gujarat. Learn about our manufacturing expertise and approach to professional kitchens.', 'About'],
    '/services': ['Commercial Kitchen Design & Installation in Surat | AK Sales', 'Explore AK Sales services in Surat: commercial kitchen planning, equipment manufacturing, installation and support for restaurants, hotels and food businesses.', 'Services'],
    '/projects': ['Commercial Kitchen Projects in Surat | AK Sales', 'Explore commercial kitchen projects by AK Sales in Surat, including equipment and kitchen solutions for hotels, restaurants and hospitality businesses.', 'Projects'],
    '/contact': ['Contact AK Sales in Surat | Kitchen Equipment Enquiries', 'Contact AK Sales in Bhatha, Surat for commercial kitchen equipment and project enquiries. Call +91 91067 80688 or request a customised kitchen solution.', 'Contact'],
    '/collections': ['Commercial Kitchen Equipment Catalogue | AK Sales Surat', 'Browse the AK Sales catalogue in Surat: refrigeration, cooking ranges, bakery equipment, work tables, food counters and equipment for commercial kitchens.', 'Collections'],
    '/blogs': ['Commercial Kitchen Equipment Guides | AK Sales Surat', 'Read AK Sales guides to commercial kitchen equipment, cooking essentials, dishwashers and kitchen planning for restaurants and hospitality businesses in Surat.', 'Blogs'],
};

function businessSchemas() {
    return [
        {
            '@context': 'https://schema.org', '@type': 'LocalBusiness', '@id': BUSINESS_ID,
            name: 'AK Sales', url: `${SITE_URL}/`, image: DEFAULT_IMAGE,
            description: 'Commercial kitchen equipment manufacturer in Surat, Gujarat.',
            telephone: '+919106780688', email: 'annaskitchenequipment@gmail.com',
            address: { '@type': 'PostalAddress', streetAddress: 'Near Nayara Petrol Pump, Bhatha', addressLocality: 'Surat', addressRegion: 'Gujarat', postalCode: '394510', addressCountry: 'IN' },
            sameAs: ['https://www.instagram.com/annas_kitchen_equipments/'],
        },
        { '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${SITE_URL}/#website`, name: 'AK Sales', url: `${SITE_URL}/`, publisher: { '@id': BUSINESS_ID }, inLanguage: 'en-IN' },
    ];
}

function breadcrumb(items) {
    return {
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: items.map(([name, path], index) => ({ '@type': 'ListItem', position: index + 1, name: plainText(name), item: `${SITE_URL}${path}` })),
    };
}

function page(path, title, summary, options = {}) {
    return { status: 200, title: plainText(title), description: description(summary), canonical: `${SITE_URL}${path}`, image: DEFAULT_IMAGE, imageAlt: undefined, type: 'website', noindex: false, schemas: businessSchemas(), ...options };
}

function missingPage(path) {
    return page(path, 'Page Not Found | AK Sales Surat', 'This page could not be found. Browse the AK Sales commercial kitchen equipment catalogue or contact our team in Surat.', { status: 404, noindex: true, schemas: [] });
}

const validSegment = (value) => typeof value === 'string' && value.trim() && value !== '.' && value !== '..';
const isPublicCategory = (key, category) => validSegment(key) && Boolean(plainText(category?.title));

// Database timestamps arrive as Date objects during SSR and as ISO strings
// after JSON. Anything that is not a real instant is dropped, never guessed.
export function isoDate(value) {
    if (!(value instanceof Date) && (typeof value !== 'string' || !value.trim())) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

const isPublicBlog = (blog) => validSegment(blog?.slug) && plainText(blog.title) && blog.status !== 'draft';

function absoluteUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return undefined;
    try {
        const url = new URL(value, SITE_URL);
        return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
    } catch { return undefined; }
}

function faqSchema(item, canonical) {
    const questions = (Array.isArray(item?.faqs) ? item.faqs : [])
        .map((faq) => [plainText(faq?.question), plainText(faq?.answer)])
        .filter(([question, answer]) => question && answer);
    if (!questions.length) return null;
    return {
        '@context': 'https://schema.org', '@type': 'FAQPage', '@id': `${canonical}#faq`,
        mainEntity: questions.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })),
    };
}

export function publicationDate(value) {
    if (typeof value !== 'string') return undefined;
    const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);
    if (match && value.includes('T') && Number.isNaN(Date.parse(value))) return undefined;
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const display = value.trim().match(/^([A-Za-z]{3}) (\d{1,2}), (\d{4})$/);
    let year, month, day;
    if (match) [, year, month, day] = match;
    else if (display && months.includes(display[1].toLowerCase())) {
        year = display[3]; month = months.indexOf(display[1].toLowerCase()) + 1; day = display[2];
    } else return undefined;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) return undefined;
    return date.toISOString().slice(0, 10);
}

export function getPageInfo(pathname, { products = defaultProducts, blogs = defaultBlogs } = {}) {
    const path = pathOnly(pathname);
    if (path === '/admin/login' || path === '/admin/dashboard') {
        return page(path, 'Administration | AK Sales Surat', 'AK Sales administration.', { noindex: true, schemas: [] });
    }
    if (Object.hasOwn(staticPages, path)) {
        const [title, summary, label] = staticPages[path];
        const info = page(path, title, summary);
        if (path !== '/') info.schemas.push(breadcrumb([['Home', '/'], [label, path]]));
        return info;
    }
    const segments = path.split('/').slice(1).map(decode);
    if (segments.some((segment) => segment === null)) return missingPage(path);
    if (segments[0] === 'collections' && (segments.length === 2 || segments.length === 3)) {
        // A product URL may name an old category or an old name; findProduct
        // returns where it lives now, and that becomes the canonical.
        const found = segments.length === 3 && products ? findProduct(products, segments[1], segments[2]) : null;
        if (segments.length === 3 && !found) return missingPage(path);
        const key = found ? found.categoryKey : segments[1];
        const category = products && Object.hasOwn(products, key) ? products[key] : null;
        if (!isPublicCategory(key, category)) return missingPage(path);
        const items = categoryProducts(category);
        const categoryPath = `/collections/${encode(key)}`;
        const categoryTitle = plainText(category.title);
        const crumbs = [['Home', '/'], ['Collections', '/collections'], [categoryTitle, categoryPath]];
        if (!found) {
            const info = page(categoryPath,
                plainText(category.seoTitle) || `${categoryTitle} Equipment | AK Sales Surat`,
                plainText(category.metaDescription) || `Explore ${categoryTitle.toLowerCase()} equipment from AK Sales in Surat. Compare commercial kitchen products and contact our team for specifications and a quote.`,
                { noindex: items.length === 0, image: safeImage(items[0]?.image) });
            info.schemas.push(breadcrumb(crumbs));
            const faq = faqSchema(category, info.canonical);
            if (faq) info.schemas.push(faq);
            return info;
        }
        const { product } = found;
        const canonicalPath = productPath(key, product);
        const productName = plainText(product.name);
        const info = page(canonicalPath,
            plainText(product.seoTitle) || `${productName} in Surat | AK Sales`,
            plainText(product.metaDescription) || plainText(product.summary) || `${productName} from AK Sales in Surat. Explore our ${categoryTitle.toLowerCase()} catalogue and contact us for commercial kitchen specifications and a quote.`,
            { image: safeImage(product.image), imageAlt: plainText(product.imageAlt) || productName });
        const gallery = (Array.isArray(product.gallery) ? product.gallery : []).map((item) => absoluteUrl(item?.src));
        const schema = {
            '@context': 'https://schema.org', '@type': 'Product', '@id': `${info.canonical}#product`, name: productName,
            url: info.canonical, image: [...new Set([info.image, ...gallery.filter(Boolean)])], description: info.description,
            category: categoryTitle, brand: { '@type': 'Brand', name: 'AK Sales' }, manufacturer: { '@id': BUSINESS_ID },
        };
        if (plainText(product.modelNumber)) schema.sku = plainText(product.modelNumber);
        const specs = (Array.isArray(product.specs) ? product.specs : [])
            .map((spec) => [plainText(spec?.label), plainText(spec?.value)])
            .filter(([label, value]) => label && value);
        if (specs.length) schema.additionalProperty = specs.map(([name, value]) => ({ '@type': 'PropertyValue', name, value }));
        info.schemas.push(breadcrumb([...crumbs, [productName, canonicalPath]]), schema);
        const faq = faqSchema(product, info.canonical);
        if (faq) info.schemas.push(faq);
        return info;
    }
    if (segments[0] === 'blog' && segments.length === 2) {
        const blog = Array.isArray(blogs) ? blogs.find((item) => isPublicBlog(item) && item.slug === segments[1]) : null;
        if (!blog) return missingPage(path);
        const canonicalPath = `/blog/${encode(blog.slug)}`;
        const body = bodyToText(bodyOf(blog));
        const published = isoDate(blog.publishedAt) ?? publicationDate(blog.date);
        const modified = isoDate(blog.updatedAt);
        const info = page(canonicalPath, blogSeoTitle(blog), blogDescription(blog), {
            type: 'article', image: safeImage(blog.image), imageAlt: plainText(blog.imageAlt) || plainText(blog.title),
            publishedTime: published, modifiedTime: modified,
        });
        const schema = {
            '@context': 'https://schema.org', '@type': 'BlogPosting', '@id': `${info.canonical}#article`, headline: plainText(blog.title),
            description: info.description, image: info.image, url: info.canonical, mainEntityOfPage: { '@type': 'WebPage', '@id': info.canonical },
            publisher: { '@id': BUSINESS_ID }, inLanguage: 'en-IN',
        };
        if (plainText(blog.author)) {
            schema.author = { '@type': plainText(blog.author) === 'AK Sales Team' ? 'Organization' : 'Person', name: plainText(blog.author) };
            const authorUrl = absoluteUrl(blog.authorUrl);
            if (authorUrl) schema.author.url = authorUrl;
        }
        if (published) schema.datePublished = published;
        if (modified) schema.dateModified = modified;
        if (plainText(blog.category)) schema.articleSection = plainText(blog.category);
        const tags = (Array.isArray(blog.tags) ? blog.tags : []).map(plainText).filter(Boolean);
        if (tags.length) schema.keywords = tags.join(', ');
        if (body) {
            schema.articleBody = body;
            schema.wordCount = wordCount(body);
        }
        info.schemas.push(breadcrumb([['Home', '/'], ['Blogs', '/blogs'], [blog.title, canonicalPath]]), schema);
        const faq = faqSchema(blog, info.canonical);
        if (faq) info.schemas.push(faq);
        return info;
    }
    return missingPage(path);
}

export function sitemapXml({ products = defaultProducts, blogs = defaultBlogs } = {}) {
    // path -> lastmod. A lastmod is written only from a real update time.
    const day = (value) => isoDate(value)?.slice(0, 10);
    const paths = new Map(Object.keys(staticPages).map((path) => [path, undefined]));
    for (const [key, category] of Object.entries(products || {})) {
        const items = categoryProducts(category);
        if (!isPublicCategory(key, category) || items.length === 0) continue;
        paths.set(`/collections/${encode(key)}`, day(category.updatedAt));
        items.forEach((product) => {
            // The first product with a slug wins, as in findProduct.
            const path = productPath(key, product);
            if (!paths.has(path)) paths.set(path, day(product.updatedAt));
        });
    }
    for (const blog of Array.isArray(blogs) ? blogs : []) {
        if (isPublicBlog(blog)) paths.set(`/blog/${encode(blog.slug)}`, day(blog.updatedAt));
    }
    const entry = ([path, lastmod]) => `  <url><loc>${xmlEscape(`${SITE_URL}${path}`)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`;
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...paths].map(entry).join('\n')}\n</urlset>\n`;
}

export function robotsTxt() {
    return `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
}

export function serializeJson(data) {
    return JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
