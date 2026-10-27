// Turns admin form input into a storable blog post. The rich-text body is an
// allowlist walk over TipTap JSON: anything the public renderer does not know
// how to draw safely is converted or dropped here, never trusted later.

const MAX_BODY_CHARS = 200000;
const MAX_DEPTH = 12;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const INLINE = ['text', 'hardBreak'];
const LISTS = ['bulletList', 'orderedList'];
const BLOCKS = ['paragraph', 'heading', ...LISTS, 'blockquote', 'table', 'image', 'horizontalRule'];
const CHILDREN = {
    doc: BLOCKS,
    paragraph: INLINE,
    heading: INLINE,
    bulletList: ['listItem'],
    orderedList: ['listItem'],
    listItem: ['paragraph', ...LISTS],
    blockquote: ['paragraph', ...LISTS],
    table: ['tableRow'],
    tableRow: ['tableHeader', 'tableCell'],
    tableHeader: ['paragraph'],
    tableCell: ['paragraph', ...LISTS],
};

const text = (value, max) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const int = (value, min, max) => {
    const n = Number(value);
    return Number.isInteger(n) && n >= min && n <= max ? n : undefined;
};

function safeUrl(value, protocols) {
    if (typeof value !== 'string') return null;
    const href = value.trim();
    if (!href || href.length > 2000 || href.includes('\\')) return null;
    // Site paths and in-page anchors. "//host" and "/\host" are other origins.
    if (/^\/(?!\/)/.test(href) || /^#[\w-]+$/.test(href)) return /[\s\p{Cc}]/u.test(href) ? null : href;
    try {
        const url = new URL(href);
        return protocols.includes(url.protocol) && !url.username && !url.password ? url.href : null;
    } catch { return null; }
}

const linkHref = (value) => safeUrl(value, ['http:', 'https:', 'mailto:', 'tel:']);

function imageSrc(value) {
    const src = safeUrl(value, ['https:']);
    if (!src || src.startsWith('#')) return null;
    return src.startsWith('/') || new URL(src).hostname === 'res.cloudinary.com' ? src : null;
}

function sanitizeMarks(marks) {
    if (!Array.isArray(marks)) return undefined;
    const out = [];
    for (const mark of marks) {
        if (out.some((m) => m.type === mark?.type)) continue;
        if (mark?.type === 'bold' || mark?.type === 'italic') out.push({ type: mark.type });
        if (mark?.type === 'link') {
            const href = linkHref(mark.attrs?.href);
            if (href) out.push({ type: 'link', attrs: { href, rel: /nofollow/.test(mark.attrs?.rel ?? '') ? 'nofollow' : null } });
        }
    }
    return out.length ? out : undefined;
}

function sanitizeNode(node, parent, depth) {
    if (!node || typeof node !== 'object' || depth > MAX_DEPTH) return null;
    let { type } = node;
    const allowed = CHILDREN[parent];
    // A heading pasted into a list or table keeps its words as a paragraph.
    if (type === 'heading' && !allowed.includes('heading') && allowed.includes('paragraph')) type = 'paragraph';
    if (!allowed.includes(type)) return null;

    if (type === 'text') {
        if (typeof node.text !== 'string' || !node.text) return null;
        const marks = sanitizeMarks(node.marks);
        return marks ? { type, text: node.text, marks } : { type, text: node.text };
    }
    if (type === 'hardBreak' || type === 'horizontalRule') return { type };
    if (type === 'image') {
        const src = imageSrc(node.attrs?.src);
        if (!src) return null;
        const attrs = { src, alt: text(node.attrs?.alt, 300), caption: text(node.attrs?.caption, 500) };
        const width = int(node.attrs?.width, 1, 20000);
        const height = int(node.attrs?.height, 1, 20000);
        if (width && height) Object.assign(attrs, { width, height });
        return { type, attrs };
    }

    const out = { type };
    if (type === 'heading') out.attrs = { level: Math.min(4, Math.max(2, int(node.attrs?.level, 1, 6) ?? 2)) };
    if (type === 'orderedList') out.attrs = { start: int(node.attrs?.start, 1, 10000) ?? 1 };
    if (type === 'tableHeader' || type === 'tableCell') {
        out.attrs = { colspan: int(node.attrs?.colspan, 1, 20) ?? 1, rowspan: int(node.attrs?.rowspan, 1, 50) ?? 1 };
    }
    const content = (Array.isArray(node.content) ? node.content : [])
        .map((child) => sanitizeNode(child, type, depth + 1))
        .filter(Boolean);
    // Containers that would be invalid when empty are dropped with their wrapper.
    if (!content.length && !['paragraph', 'heading', 'tableHeader', 'tableCell'].includes(type)) return null;
    if (content.length) out.content = content;
    return out;
}

function sanitizeBody(raw) {
    let doc = raw;
    if (typeof raw === 'string') {
        if (raw.length > MAX_BODY_CHARS) return { error: 'The article body is too large.' };
        try { doc = JSON.parse(raw); } catch { return { error: 'The article body could not be read.' }; }
    } else if (JSON.stringify(raw ?? null).length > MAX_BODY_CHARS) {
        return { error: 'The article body is too large.' };
    }
    if (!doc || doc.type !== 'doc') return { body: { type: 'doc', content: [] } };
    const content = (Array.isArray(doc.content) ? doc.content : [])
        .map((child) => sanitizeNode(child, 'doc', 1))
        .filter(Boolean);
    return { body: { type: 'doc', content } };
}

function walk(node, visit) {
    visit(node);
    (node?.content || []).forEach((child) => walk(child, visit));
}

function bodyText(body) {
    let out = '';
    walk(body, (node) => { if (node.type === 'text') out += node.text; });
    return out.trim();
}

function parseJson(value, fallback) {
    if (typeof value !== 'string') return value ?? fallback;
    try { return JSON.parse(value); } catch { return undefined; }
}

function sanitizePost(raw = {}) {
    const tags = parseJson(raw.tags, []);
    const faqs = parseJson(raw.faqs, []);
    if (tags === undefined || faqs === undefined) return { error: 'Tags or FAQs could not be read.' };
    const { body, error } = sanitizeBody(raw.body);
    if (error) return { error };

    const publishedAt = typeof raw.publishedAt === 'string' && raw.publishedAt ? new Date(raw.publishedAt) : null;
    const post = {
        title: text(raw.title, 150),
        slug: text(raw.slug, 80).toLowerCase(),
        status: raw.status === 'draft' ? 'draft' : 'published',
        excerpt: text(raw.excerpt, 600),
        seoTitle: text(raw.seoTitle, 120),
        metaDescription: text(raw.metaDescription, 300),
        focusKeyword: text(raw.focusKeyword, 80),
        imageAlt: text(raw.imageAlt, 200),
        category: text(raw.category, 60) || 'General',
        author: text(raw.author, 80) || 'AK Sales Team',
        authorBio: text(raw.authorBio, 500),
        authorUrl: safeUrl(raw.authorUrl, ['http:', 'https:']) || '',
        tags: (Array.isArray(tags) ? tags : []).map((tag) => text(tag, 40)).filter(Boolean).slice(0, 10),
        faqs: (Array.isArray(faqs) ? faqs : [])
            .map((faq) => ({ question: text(faq?.question, 300), answer: text(faq?.answer, 2000) }))
            .filter((faq) => faq.question && faq.answer)
            .slice(0, 20),
        body,
    };
    if (publishedAt && !Number.isNaN(publishedAt.getTime())) post.publishedAt = publishedAt;
    return { post };
}

// Rules for the slug and title apply to drafts too; the rest only on publish.
function validateDraft(post) {
    const errors = [];
    if (!post.title) errors.push('Add a title.');
    if (!SLUG.test(post.slug)) errors.push('The URL slug may only use lowercase letters, numbers and single hyphens.');
    return errors;
}

function validateForPublish(post) {
    const errors = validateDraft(post);
    if (!post.image) errors.push('Add a featured image.');
    if (!post.imageAlt) errors.push('Describe the featured image in its alt text.');
    const hasLegacyText = Array.isArray(post.content) && post.content.length > 0;
    if (!bodyText(post.body) && !hasLegacyText) errors.push('Write the article body.');
    let missingAlt = 0;
    walk(post.body, (node) => { if (node.type === 'image' && !node.attrs?.alt) missingAlt += 1; });
    if (missingAlt) errors.push(`${missingAlt} image(s) in the article need alt text.`);
    return errors;
}

function displayDate(date) {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'Asia/Kolkata' });
}

module.exports = { sanitizeBody, sanitizePost, validateDraft, validateForPublish, displayDate, SLUG };
