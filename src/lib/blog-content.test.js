import { describe, expect, it } from 'vitest';
import {
    blogDescription, blogSeoTitle, bodyOf, bodyToText, cloudinarySrcSet, cloudinaryUrl, firstParagraphText,
    headingsOf, legacyToBody, nodeText, readingTime, slugify, walkBody, wordCount,
} from './blog-content.js';

const text = (value, marks) => (marks ? { type: 'text', text: value, marks } : { type: 'text', text: value });
const paragraph = (...content) => ({ type: 'paragraph', content });
const heading = (level, value) => ({ type: 'heading', attrs: { level }, content: [text(value)] });
const doc = (...content) => ({ type: 'doc', content });
const CLOUDINARY = 'https://res.cloudinary.com/demo/image/upload/v1/blog/tandoor.jpg';

describe('slugify', () => {
    it('lowercases, strips accents and joins words with single hyphens', () => {
        expect(slugify('  Café Équipement: Gas & Electric!  ')).toBe('cafe-equipement-gas-electric');
    });

    it('returns an empty string for empty or symbol-only input', () => {
        expect(slugify(null)).toBe('');
        expect(slugify('!!!')).toBe('');
    });
});

describe('legacy bodies', () => {
    it('turns heading/text sections into H2s and one paragraph per blank-line block', () => {
        const body = legacyToBody([{ heading: 'Plan', text: 'First part.\n\nSecond part.' }, { heading: '', text: 'No heading.' }]);
        expect(body).toEqual(doc(heading(2, 'Plan'), paragraph(text('First part.')), paragraph(text('Second part.')), paragraph(text('No heading.'))));
    });

    it('returns an empty doc for missing content', () => {
        expect(legacyToBody(undefined)).toEqual(doc());
    });

    it('prefers a non-empty rich body over legacy sections', () => {
        const body = doc(paragraph(text('Rich')));
        expect(bodyOf({ body, content: [{ heading: 'Old', text: 'Old text' }] })).toBe(body);
    });

    it('falls back to legacy sections when the rich body is empty or missing', () => {
        const content = [{ heading: 'Old', text: 'Old text' }];
        expect(bodyOf({ body: doc(), content })).toEqual(legacyToBody(content));
        expect(bodyOf({ content })).toEqual(legacyToBody(content));
        expect(bodyOf(null)).toEqual(doc());
    });
});

describe('text extraction', () => {
    const body = doc(
        heading(2, 'Choosing a range'),
        paragraph(text('Gas '), text('burners', [{ type: 'bold' }]), { type: 'hardBreak' }, text('heat fast.')),
        { type: 'bulletList', content: [{ type: 'listItem', content: [paragraph(text('Two burners'))] }, { type: 'listItem', content: [paragraph(text('Four burners'))] }] },
        { type: 'image', attrs: { src: CLOUDINARY, alt: 'Range', caption: 'A six-burner range' } },
    );

    it('visits every node depth-first in document order', () => {
        const types = [];
        walkBody(body, (node) => types.push(node.type));
        expect(types.slice(0, 4)).toEqual(['doc', 'heading', 'text', 'paragraph']);
        expect(types).toContain('listItem');
        expect(() => walkBody(null, () => {})).not.toThrow();
    });

    it('joins inline text and turns hard breaks into spaces', () => {
        expect(nodeText(body.content[1])).toBe('Gas burners heat fast.');
    });

    it('writes one line per block, including list items and captions', () => {
        expect(bodyToText(body)).toBe('Choosing a range\nGas burners heat fast.\nTwo burners\nFour burners\nA six-burner range');
    });

    it('counts words including apostrophes and hyphenated words', () => {
        expect(wordCount("The chef's six-burner range, 2 ovens.")).toBe(6);
        expect(wordCount('')).toBe(0);
        expect(wordCount(undefined)).toBe(0);
    });

    it('reports at least one minute of reading at 200 words a minute', () => {
        expect(readingTime(0)).toBe(1);
        expect(readingTime(450)).toBe(2);
        expect(readingTime(1000)).toBe(5);
    });

    it('finds the first non-empty top-level paragraph', () => {
        expect(firstParagraphText(doc(heading(2, 'Intro'), paragraph(), paragraph(text('Answer first.'))))).toBe('Answer first.');
        expect(firstParagraphText(doc(heading(2, 'Only a heading')))).toBe('');
    });
});

describe('headingsOf', () => {
    it('lists headings in document order with level, text and unique ids', () => {
        const body = doc(heading(2, 'Cleaning'), heading(3, 'Daily'), heading(2, 'Cleaning'), heading(4, '!!!'), heading(2, 'Cleaning'));
        expect(headingsOf(body)).toEqual([
            { level: 2, text: 'Cleaning', id: 'cleaning' },
            { level: 3, text: 'Daily', id: 'daily' },
            { level: 2, text: 'Cleaning', id: 'cleaning-2' },
            { level: 4, text: '!!!', id: 'section' },
            { level: 2, text: 'Cleaning', id: 'cleaning-3' },
        ]);
        expect(new Set(headingsOf(body).map((item) => item.id)).size).toBe(5);
    });
});

describe('search snippet', () => {
    const blog = { title: 'Choosing a Tandoor', excerpt: 'Pick clay for flavour.', content: [{ heading: 'Intro', text: 'First paragraph.' }] };

    it('uses the custom SEO title or the title with the brand suffix', () => {
        expect(blogSeoTitle({ ...blog, seoTitle: '  Tandoor Buying Guide  ' })).toBe('Tandoor Buying Guide');
        expect(blogSeoTitle(blog)).toBe('Choosing a Tandoor | AK Sales Surat');
    });

    it('prefers the meta description, then the excerpt, then the first paragraph', () => {
        expect(blogDescription({ ...blog, metaDescription: 'Custom meta.' })).toBe('Custom meta.');
        expect(blogDescription(blog)).toBe('Pick clay for flavour.');
        expect(blogDescription({ ...blog, excerpt: ' ' })).toBe('First paragraph.');
    });

    it('falls back to a generic AK Sales description when there is no text', () => {
        expect(blogDescription({ title: 'Empty' })).toBe('Empty: a commercial kitchen guide from AK Sales in Surat.');
    });
});

describe('Cloudinary images', () => {
    it('inserts resize and format transforms into Cloudinary upload URLs', () => {
        expect(cloudinaryUrl(CLOUDINARY, 800)).toBe('https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_800/v1/blog/tandoor.jpg');
    });

    it('builds a four-width srcset for Cloudinary URLs', () => {
        const srcSet = cloudinarySrcSet(CLOUDINARY);
        expect(srcSet.split(', ')).toHaveLength(4);
        expect(srcSet).toContain('/image/upload/f_auto,q_auto,c_limit,w_480/v1/blog/tandoor.jpg 480w');
        expect(srcSet).toContain('w_1600/v1/blog/tandoor.jpg 1600w');
    });

    it.each(['/blog/download.webp', 'https://example.com/image/upload/a.jpg', 'http://res.cloudinary.com/demo/image/upload/a.jpg', undefined])('leaves %s without a Cloudinary srcset', (url) => {
        expect(cloudinaryUrl(url, 800)).toBeUndefined();
        expect(cloudinarySrcSet(url)).toBeUndefined();
    });
});
