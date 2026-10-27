import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import BlogArticle from './BlogArticle.jsx';
import blogsData from '../data/blogsData.js';

const render = (blog) => renderToString(<MemoryRouter><BlogArticle blog={blog} /></MemoryRouter>);
const heading = (level, value) => ({ type: 'heading', attrs: { level }, content: [{ type: 'text', text: value }] });
const paragraph = (value) => ({ type: 'paragraph', content: [{ type: 'text', text: value }] });
const IMAGE = 'https://res.cloudinary.com/demo/image/upload/v1/tandoor.jpg';
const rich = {
    slug: 'tandoor-guide', title: 'Choosing a Tandoor', image: IMAGE, imageAlt: 'Clay tandoor in a hotel kitchen', imageWidth: 1600, imageHeight: 900,
    date: 'Mar 03, 2026', publishedAt: '2026-03-03T04:30:00.000Z', updatedAt: '2026-04-10T09:15:00.000Z',
    category: 'Buying Guide', author: 'Ravi Shah', authorBio: 'Kitchen planner in Surat.', authorUrl: 'https://www.linkedin.com/in/ravi',
    excerpt: 'Pick clay for flavour and steel for durability.',
    body: { type: 'doc', content: [heading(2, 'Clay or steel'), paragraph('Clay holds heat.'), heading(3, 'Fuel'), heading(2, 'Cleaning')] },
    faqs: [{ question: 'How hot does it get?', answer: 'Around 480°C.' }],
};

describe('BlogArticle', () => {
    it('renders the hero image with its alt, dimensions, priority and Cloudinary srcset', () => {
        const html = render(rich);
        expect(html).toContain('alt="Clay tandoor in a hotel kitchen"');
        expect(html).toContain('width="1600"');
        expect(html).toContain('height="900"');
        expect(html).toContain('fetchPriority="high"');
        expect(html).toContain('w_800/v1/tandoor.jpg 800w');
    });

    it('shows one H1, the published and later updated dates as time elements, and reading time', () => {
        const html = render(rich);
        expect(html.match(/<h1/g)).toHaveLength(1);
        expect(html).toContain('<time dateTime="2026-03-03T04:30:00.000Z">Mar 3, 2026</time>');
        expect(html).toContain('<time dateTime="2026-04-10T09:15:00.000Z">Apr 10, 2026</time>');
        expect(html).toContain('1<!-- --> min read');
    });

    it('hides the updated line when the update is on the published day', () => {
        expect(render({ ...rich, updatedAt: '2026-03-03T12:00:00.000Z' })).not.toContain('Updated');
        expect(render({ ...rich, updatedAt: undefined })).not.toContain('Updated');
    });

    it('links the breadcrumb to the blog list and shows the summary, contents and FAQ', () => {
        const html = render(rich);
        expect(html).toMatch(/<nav aria-label="Breadcrumb".*href="\/blogs"/);
        expect(html).toContain('In short');
        expect(html).toContain('Pick clay for flavour and steel for durability.');
        expect(html).toMatch(/<nav aria-label="Table of contents".*href="#clay-or-steel".*href="#fuel".*href="#cleaning"/);
        expect(html).toContain('id="clay-or-steel"');
        expect(html).toMatch(/<h2[^>]*>Frequently asked questions<\/h2>/);
        expect(html).toMatch(/<h3[^>]*>How hot does it get\?<\/h3>/);
    });

    it('shows the author bio and an external author link with noopener', () => {
        const html = render(rich);
        expect(html).toContain('Kitchen planner in Surat.');
        expect(html).toMatch(/href="https:\/\/www.linkedin.com\/in\/ravi" target="_blank" rel="noopener noreferrer"/);
    });

    it('renders a bundled legacy post with its display date and no summary, contents or FAQ', () => {
        const legacy = blogsData[0];
        const html = render(legacy);
        expect(html).toContain(`alt="${legacy.title.replace(/&/g, '&amp;')}"`);
        expect(html).toContain(`<time dateTime="2025-01-15">${legacy.date}</time>`);
        expect(html).toContain('id="why-choosing-the-right-kitchen-equipment-matters"');
        expect(html).not.toContain('In short');
        expect(html).not.toContain('Frequently asked questions');
        expect(html).toContain('Table of contents');
    });

    it('leaves out the contents list when there are fewer than three headings', () => {
        expect(render({ ...rich, body: { type: 'doc', content: [heading(2, 'Only'), paragraph('Text')] } })).not.toContain('Table of contents');
    });
});
