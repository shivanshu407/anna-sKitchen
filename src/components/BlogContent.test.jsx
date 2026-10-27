import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import BlogContent from './BlogContent.jsx';
import { headingsOf } from '../lib/blog-content.js';

const render = (body) => renderToString(<MemoryRouter><BlogContent body={body} /></MemoryRouter>);
const text = (value, marks) => (marks ? { type: 'text', text: value, marks } : { type: 'text', text: value });
const paragraph = (...content) => ({ type: 'paragraph', content });
const heading = (level, value) => ({ type: 'heading', attrs: { level }, content: [text(value)] });
const doc = (...content) => ({ type: 'doc', content });
const link = (href, rel = null) => [{ type: 'link', attrs: { href, rel } }];
const CLOUDINARY = 'https://res.cloudinary.com/demo/image/upload/v1/blog/range.jpg';

describe('BlogContent', () => {
    it('gives headings the same ids as headingsOf, in document order', () => {
        const body = doc(heading(2, 'Cleaning'), paragraph(text('Text')), heading(3, 'Daily checks'), heading(2, 'Cleaning'), heading(4, 'Weekly'));
        const html = render(body);
        const ids = [...html.matchAll(/<h([2-4]) id="([^"]+)"/g)].map((match) => ({ level: Number(match[1]), id: match[2] }));
        expect(ids).toEqual(headingsOf(body).map(({ level, id }) => ({ level, id })));
        expect(ids.map((item) => item.id)).toEqual(['cleaning', 'daily-checks', 'cleaning-2', 'weekly']);
    });

    it('skips empty paragraphs', () => {
        const html = render(doc(paragraph(), paragraph(text('   ')), paragraph(text('Kept'))));
        expect(html.match(/<p/g)).toHaveLength(1);
        expect(html).toContain('Kept');
    });

    it('renders images as figures with alt, dimensions, lazy loading, a Cloudinary srcset and a caption', () => {
        const html = render(doc({ type: 'image', attrs: { src: CLOUDINARY, alt: 'Six-burner gas range', caption: 'Our Surat workshop', width: 1200, height: 800 } }));
        expect(html).toContain('<figure');
        expect(html).toContain('alt="Six-burner gas range"');
        expect(html).toContain('width="1200"');
        expect(html).toContain('height="800"');
        expect(html).toContain('loading="lazy"');
        expect(html).toContain('w_480/v1/blog/range.jpg 480w');
        expect(html).toMatch(/<figcaption[^>]*>Our Surat workshop<\/figcaption>/);
    });

    it('omits the caption and invented dimensions when they are not set', () => {
        const html = render(doc({ type: 'image', attrs: { src: CLOUDINARY, alt: 'Range', caption: '' } }));
        expect(html).not.toContain('<figcaption');
        expect(html).not.toContain('width=');
    });

    it('renders site paths as router links and anchors as plain links, without new-tab attributes', () => {
        const html = render(doc(paragraph(text('Browse the ', null), text('catalogue', link('/collections')), text(' or '), text('jump', link('#faq')))));
        expect(html).toMatch(/<a [^>]*href="\/collections"[^>]*>catalogue<\/a>/);
        expect(html).toMatch(/<a [^>]*href="#faq"[^>]*>jump<\/a>/);
        expect(html).not.toContain('target="_blank"');
        expect(html).not.toContain('rel=');
    });

    it('opens external links in a new tab with noopener noreferrer, adding nofollow when flagged', () => {
        const html = render(doc(paragraph(text('FSSAI', link('https://fssai.gov.in/')), text(' and '), text('a shop', link('https://example.com/', 'nofollow')))));
        expect(html).toMatch(/<a [^>]*href="https:\/\/fssai.gov.in\/"[^>]*target="_blank"[^>]*rel="noopener noreferrer"[^>]*>FSSAI<\/a>/);
        expect(html).toMatch(/href="https:\/\/example.com\/"[^>]*rel="noopener noreferrer nofollow"/);
    });

    it('drops unsafe link targets but keeps their text', () => {
        const html = render(doc(paragraph(text('click', link('javascript:alert(1)')), text(' here', link('//evil.example/')))));
        expect(html).not.toContain('<a');
        expect(html).toContain('click');
        expect(html).toContain('here');
    });

    it('renders bold, italic, lists and blockquotes', () => {
        const html = render(doc(
            paragraph(text('Strong', [{ type: 'bold' }]), text('Soft', [{ type: 'italic' }])),
            { type: 'orderedList', attrs: { start: 3 }, content: [{ type: 'listItem', content: [paragraph(text('Third'))] }] },
            { type: 'bulletList', content: [{ type: 'listItem', content: [paragraph(text('Point'))] }] },
            { type: 'blockquote', content: [paragraph(text('Quoted'))] },
            { type: 'horizontalRule' },
        ));
        expect(html).toMatch(/<strong[^>]*>Strong<\/strong>/);
        expect(html).toContain('<em>Soft</em>');
        expect(html).toMatch(/<ol start="3"/);
        expect(html).toContain('<ul');
        expect(html).toMatch(/<blockquote[^>]*>.*Quoted.*<\/blockquote>/);
        expect(html).toContain('<hr');
    });

    it('puts header rows in thead with column-scoped th cells inside a horizontal scroller', () => {
        const cell = (type, value, attrs = { colspan: 1, rowspan: 1 }) => ({ type, attrs, content: [paragraph(text(value))] });
        const html = render(doc({ type: 'table', content: [
            { type: 'tableRow', content: [cell('tableHeader', 'Model'), cell('tableHeader', 'Burners')] },
            { type: 'tableRow', content: [cell('tableCell', 'AK-4'), cell('tableCell', '4')] },
            { type: 'tableRow', content: [cell('tableCell', 'Wide', { colspan: 2, rowspan: 1 })] },
        ] }));
        expect(html).toMatch(/<div class="overflow-x-auto[^"]*"><table/);
        expect(html).toMatch(/<thead[^>]*><tr[^>]*><th scope="col"[^>]*>.*Model.*<\/th><th scope="col"/);
        expect(html).toMatch(/<tbody><tr[^>]*><td[^>]*>.*AK-4/);
        expect(html).toContain('colSpan="2"');
        expect(html.indexOf('</thead>')).toBeLessThan(html.indexOf('AK-4'));
    });

    it('escapes hostile text, captions and alt text instead of rendering markup', () => {
        const html = render(doc(
            heading(2, '<img src=x onerror=alert(1)>'),
            paragraph(text('<script>alert(1)</script>')),
            { type: 'image', attrs: { src: CLOUDINARY, alt: '"><script>alert(2)</script>', caption: '<b>caption</b>' } },
            { type: 'unknownWidget', attrs: { html: '<script>alert(3)</script>' } },
        ));
        expect(html).not.toContain('<script');
        expect(html).not.toContain('<img src=x');
        expect(html).not.toContain('<b>');
        expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
        expect(html).not.toContain('alert(3)');
    });
});
