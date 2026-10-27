// Live SEO checklist for the admin blog editor. Pure and cheap: it runs on every
// keystroke. Errors mirror the server's publish blockers in server/blog-input.js,
// so the editor never offers a publish the server will refuse.
import { blogSeoTitle, bodyToText, firstParagraphText, nodeText, slugify, walkBody, wordCount } from './blog-content.js';

export const LIMITS = { title: [30, 60], seoTitle: [30, 60], metaDescription: [120, 160], excerptWords: [40, 60], imageAlt: 125 };

// Same pattern and length cap as server/blog-input.js.
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG = 80;
const MAX_BODY_CHARS = 200000;
const MAX_PARAGRAPH_WORDS = 150;
const MAX_DENSITY = 0.03;
const INTERNAL = /^(?:\/(?!\/)|https?:\/\/(?:www\.)?aksales\.in(?:[/?#]|$))/i;

const str = (value) => (typeof value === 'string' ? value.trim() : '');
const check = (id, level, message) => ({ id, level, message });

// Matches the keyword at the start of a word, so "fryer" finds "fryers" but
// "pan" does not find "span".
function keywordPattern(keyword) {
    const escaped = keyword.split(/\s+/).map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
    return new RegExp(`(?<![\\p{L}\\p{N}])${escaped}`, 'giu');
}

function scanBody(body) {
    const found = { headings: [], paragraphs: [], images: [], links: [] };
    walkBody(body, (node) => {
        if (node.type === 'heading') found.headings.push({ level: node.attrs?.level ?? 2, text: nodeText(node) });
        else if (node.type === 'paragraph') found.paragraphs.push(nodeText(node));
        else if (node.type === 'image') found.images.push(node.attrs || {});
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

function publishBlockers(post, body, scan) {
    const out = [];
    const title = str(post.title);
    const slug = str(post.slug);
    const imageAlt = str(post.imageAlt);

    out.push(title ? check('title', 'ok', 'The post has a title.') : check('title', 'error', 'Add a title.'));
    out.push(SLUG.test(slug) && slug.length <= MAX_SLUG
        ? check('slug', 'ok', 'The web address (slug) is valid.')
        : check('slug', 'error', slug
            ? `Fix the web address (slug): use only lowercase letters, numbers and single hyphens, up to ${MAX_SLUG} characters.`
            : 'Add a web address (slug), for example "how-to-choose-a-commercial-fryer".'));
    out.push(post.image
        ? check('image', 'ok', 'The post has a featured image.')
        : check('image', 'error', 'Add a featured image.'));
    if (!imageAlt) out.push(check('image-alt', 'error', 'Describe the featured image in its alt text.'));
    else if (imageAlt.length > LIMITS.imageAlt) out.push(check('image-alt', 'warn', `The featured image alt text is ${imageAlt.length} characters. Keep it under ${LIMITS.imageAlt}.`));
    else out.push(check('image-alt', 'ok', 'The featured image has alt text.'));

    out.push(nodeText(body)
        ? check('body', 'ok', 'The article has text.')
        : check('body', 'error', 'Write the article body.'));

    const missing = scan.images.filter((attrs) => !str(attrs.alt)).length;
    const long = scan.images.filter((attrs) => str(attrs.alt).length > LIMITS.imageAlt).length;
    if (missing) out.push(check('body-images-alt', 'error', `${missing} image(s) in the article need alt text. Describe what each one shows.`));
    else if (long) out.push(check('body-images-alt', 'warn', `${long} image(s) in the article have alt text over ${LIMITS.imageAlt} characters. Keep each description short.`));
    else out.push(check('body-images-alt', 'ok', 'Every image in the article has alt text.'));

    if (JSON.stringify(body).length > MAX_BODY_CHARS) {
        out.push(check('body-size', 'error', 'The article is too large to save. Split it into two posts.'));
    }
    return out;
}

function keywordChecks(post, body, keyword, scan, bodyText, words) {
    const out = [check('keyword', 'ok', `Focus keyword: "${keyword}".`)];
    const pattern = keywordPattern(keyword);
    const has = (value) => { pattern.lastIndex = 0; return pattern.test(value); };
    const where = (id, found, yes, no) => out.push(check(id, found ? 'ok' : 'warn', found ? yes : no));

    where('keyword-title', has(str(post.title)), 'The focus keyword is in the title.', 'Use the focus keyword in the title.');
    const keySlug = slugify(keyword);
    where('keyword-slug', Boolean(keySlug) && `-${str(post.slug)}-`.includes(`-${keySlug}-`),
        'The focus keyword is in the web address.', `Use the focus keyword in the web address, for example "${keySlug}".`);
    where('keyword-intro', has(str(post.excerpt)) || has(firstParagraphText(body)),
        'The focus keyword appears in the summary or first paragraph.', 'Mention the focus keyword in the summary or the first paragraph.');
    where('keyword-heading', scan.headings.some((h) => h.level === 2 && has(h.text)),
        'The focus keyword appears in a main heading (H2).', 'Use the focus keyword in at least one main heading (H2).');
    where('keyword-meta', has(str(post.metaDescription)),
        'The focus keyword is in the meta description.', 'Use the focus keyword in the meta description.');

    if (words) {
        const uses = bodyText.match(pattern)?.length ?? 0;
        const density = uses / words;
        out.push(density > MAX_DENSITY
            ? check('keyword-density', 'warn', `The focus keyword is used ${uses} times (${(density * 100).toFixed(1)}% of words). Use it less; repetition reads as spam.`)
            : check('keyword-density', 'ok', 'The focus keyword is used naturally.'));
    }
    return out;
}

export function analyzePost(post = {}) {
    const body = post.body && typeof post.body === 'object' ? post.body : { type: 'doc', content: [] };
    const scan = scanBody(body);
    const bodyText = bodyToText(body);
    const words = wordCount(bodyText);
    const out = publishBlockers(post, body, scan);

    out.push(lengthCheck('title-length', str(post.title), LIMITS.title, 'The title', 'so it is descriptive but not cut off'));
    out.push(lengthCheck('seo-title-length', blogSeoTitle(post), LIMITS.seoTitle, 'The search result title', 'so it shows in full on Google'));

    const meta = str(post.metaDescription);
    out.push(meta
        ? lengthCheck('meta-description', meta, LIMITS.metaDescription, 'The meta description', 'so Google shows a full snippet')
        : check('meta-description', 'warn', `Add a meta description (${LIMITS.metaDescription.join('–')} characters) to control the text under your Google result.`));

    const [minWords, maxWords] = LIMITS.excerptWords;
    const summaryWords = wordCount(str(post.excerpt));
    if (!summaryWords) out.push(check('excerpt', 'warn', `Add a summary of ${minWords}–${maxWords} words that answers the reader's question straight away.`));
    else if (summaryWords < minWords || summaryWords > maxWords) out.push(check('excerpt', 'warn', `The summary is ${summaryWords} words. Aim for ${minWords}–${maxWords} so search engines and AI tools can quote it.`));
    else out.push(check('excerpt', 'ok', `The summary length is good (${summaryWords} words).`));

    const keyword = str(post.focusKeyword).replace(/\s+/g, ' ');
    if (keyword) out.push(...keywordChecks(post, body, keyword, scan, bodyText, words));
    else out.push(check('keyword', 'warn', 'Set a focus keyword: the main phrase a customer would search for.'));

    const h2s = scan.headings.filter((h) => h.level === 2).length;
    out.push(h2s >= 2
        ? check('headings-h2', 'ok', `The article has ${h2s} main headings (H2).`)
        : check('headings-h2', 'warn', `Split the article into sections with at least 2 main headings (H2). It has ${h2s}.`));

    let previous = 1;
    const skipped = scan.headings.find((h) => { const skip = h.level > previous + 1; previous = h.level; return skip; });
    out.push(skipped
        ? check('heading-order', 'warn', `The heading "${skipped.text || 'untitled'}" skips a level (H${skipped.level}). Use H2 for sections, then H3, then H4.`)
        : check('heading-order', 'ok', 'Headings are in order.'));

    const longest = Math.max(0, ...scan.paragraphs.map(wordCount));
    out.push(longest > MAX_PARAGRAPH_WORDS
        ? check('paragraph-length', 'warn', `A paragraph has ${longest} words. Break paragraphs over ${MAX_PARAGRAPH_WORDS} words into shorter ones.`)
        : check('paragraph-length', 'ok', 'Paragraphs are a readable length.'));

    if (words < 300) out.push(check('word-count', 'warn', `The article is ${words} words, which is thin. Aim for at least 600 words.`));
    else if (words < 600) out.push(check('word-count', 'warn', `The article is ${words} words. 600 or more usually ranks better.`));
    else out.push(check('word-count', 'ok', `The article is ${words} words.`));

    const internal = scan.links.filter((href) => INTERNAL.test(href)).length;
    const external = scan.links.filter((href) => /^https?:\/\//i.test(href) && !INTERNAL.test(href)).length;
    out.push(internal
        ? check('internal-link', 'ok', 'The article links to other pages on this site.')
        : check('internal-link', 'warn', 'Link to at least one page on this site, such as a product collection or another post.'));
    out.push(external
        ? check('external-link', 'ok', 'The article links to an outside source.')
        : check('external-link', 'warn', 'Consider linking to a trusted outside source, such as a manufacturer or standards body.'));

    const faqs = (Array.isArray(post.faqs) ? post.faqs : []).filter((faq) => str(faq?.question) && str(faq?.answer));
    out.push(faqs.length
        ? check('faq', 'ok', `The post has ${faqs.length} FAQ(s).`)
        : check('faq', 'warn', 'Consider adding a few FAQs. AI search tools often quote short questions and answers.'));

    return out;
}
