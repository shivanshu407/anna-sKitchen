// Helpers for blog bodies stored as TipTap JSON ({ type: 'doc', content: [...] }).
// Shared by the public page, server rendering, metadata and the admin editor.
// server/blog-input.js is the allowlist that decides which nodes can exist.

const WORDS_PER_MINUTE = 200;
const BLOCK_TYPES = new Set(['paragraph', 'heading', 'listItem', 'tableHeader', 'tableCell', 'blockquote']);

export function slugify(value) {
    return String(value ?? '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

const paragraph = (value) => ({ type: 'paragraph', content: [{ type: 'text', text: value }] });

// Old posts are [{ heading, text }] sections; they become an H2 plus paragraphs.
export function legacyToBody(content) {
    const blocks = [];
    for (const section of Array.isArray(content) ? content : []) {
        const heading = String(section?.heading ?? '').trim();
        if (heading) blocks.push({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: heading }] });
        String(section?.text ?? '').split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean)
            .forEach((part) => blocks.push(paragraph(part)));
    }
    return { type: 'doc', content: blocks };
}

export function bodyOf(blog) {
    const body = blog?.body;
    if (body?.type === 'doc' && Array.isArray(body.content) && body.content.length) return body;
    return legacyToBody(blog?.content);
}

export function walkBody(node, visit) {
    if (!node || typeof node !== 'object') return;
    visit(node);
    (Array.isArray(node.content) ? node.content : []).forEach((child) => walkBody(child, visit));
}

export function nodeText(node) {
    let out = '';
    walkBody(node, (child) => {
        if (child.type === 'text') out += child.text;
        if (child.type === 'hardBreak') out += ' ';
    });
    return out.replace(/\s+/g, ' ').trim();
}

// Plain text with one line per block, for articleBody, word counts and summaries.
export function bodyToText(body) {
    const lines = [];
    const visit = (node) => {
        if (!node || typeof node !== 'object') return;
        if (BLOCK_TYPES.has(node.type) && !(node.content || []).some((c) => BLOCK_TYPES.has(c.type) || c.type?.endsWith('List'))) {
            const value = nodeText(node);
            if (value) lines.push(value);
            return;
        }
        if (node.type === 'image' && node.attrs?.caption) lines.push(String(node.attrs.caption).trim());
        (node.content || []).forEach(visit);
    };
    visit(body);
    return lines.join('\n');
}

export function wordCount(value) {
    const matches = String(value ?? '').match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu);
    return matches ? matches.length : 0;
}

export function readingTime(words) {
    return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function firstParagraphText(body) {
    const first = (body?.content || []).find((node) => node.type === 'paragraph' && nodeText(node));
    return first ? nodeText(first) : '';
}

// Document-order headings with unique ids. BlogContent assigns the same ids in
// the same order, so table-of-contents links always land.
export function headingsOf(body) {
    const seen = new Map();
    const headings = [];
    walkBody(body, (node) => {
        if (node.type !== 'heading') return;
        const text = nodeText(node);
        const base = slugify(text) || 'section';
        const count = (seen.get(base) || 0) + 1;
        seen.set(base, count);
        headings.push({ level: node.attrs?.level ?? 2, text, id: count === 1 ? base : `${base}-${count}` });
    });
    return headings;
}

// The search-result title and description of a post. src/lib/seo.js and the
// admin snippet preview both use these, so the preview shows what ships.
export function blogSeoTitle(blog) {
    const custom = String(blog?.seoTitle ?? '').trim();
    return custom || `${String(blog?.title ?? '').trim()} | AK Sales Surat`;
}

export function blogDescription(blog) {
    const title = String(blog?.title ?? '').trim();
    return [blog?.metaDescription, blog?.excerpt, firstParagraphText(bodyOf(blog))]
        .map((value) => String(value ?? '').trim()).find(Boolean)
        || `${title}: a commercial kitchen guide from AK Sales in Surat.`;
}

const SRCSET_WIDTHS = [480, 800, 1200, 1600];

// Cloudinary resizes on request; other images keep the build-time manifest srcset.
export function cloudinaryUrl(url, width) {
    if (typeof url !== 'string' || !/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(url)) return undefined;
    return url.replace('/image/upload/', `/image/upload/f_auto,q_auto,c_limit,w_${width}/`);
}

export function cloudinarySrcSet(url) {
    if (!cloudinaryUrl(url, 1)) return undefined;
    return SRCSET_WIDTHS.map((width) => `${cloudinaryUrl(url, width)} ${width}w`).join(', ');
}
