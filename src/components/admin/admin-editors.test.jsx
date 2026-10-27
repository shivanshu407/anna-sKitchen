import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import ProductEditor from './ProductEditor';
import CategoryEditor from './CategoryEditor';
import BlogEditor from './BlogEditor';
import SeoPanel from './SeoPanel';

// No DOM here: render each editor to HTML with TipTap stubbed out, which is
// enough to catch crashes in the first render and check what the owner sees.
vi.mock('@tiptap/react', async (importOriginal) => ({
    ...(await importOriginal()),
    useEditor: () => null,
    useEditorState: () => null,
}));

const catalogue = {
    'heating-range': {
        title: 'HEATING RANGE',
        slug: 'heating-range',
        description: 'Ranges and burners.',
        products: [
            { name: 'Three Burner Range', image: '/images/heating/three-burner-range.webp' },
            { name: 'Chinese Range', image: '/images/heating/chinese-range.webp' },
        ],
    },
    refrigeration: { title: 'REFRIGERATION', slug: 'refrigeration', description: 'Cold storage.', products: [] },
};

const noop = () => {};
// React separates adjacent text with <!-- --> markers; drop them for matching.
const toHtml = (element) => renderToString(element).replace(/<!-- -->/g, '');
const render = (element) => toHtml(<MemoryRouter>{element}</MemoryRouter>);

describe('ProductEditor', () => {
    it('renders an empty new product with save blocked and the new-category option', () => {
        const html = render(<ProductEditor product={null} categoryKey="heating-range" catalogue={catalogue} onSaved={noop} onCancel={noop} />);

        expect(html).toContain('Add to catalogue');
        expect(html).toContain('+ New category');
        expect(html).toContain('Add the product name.');
        expect(html).toContain('Must fix before saving');
        expect(html).toContain('https://aksales.in/collections/heating-range/');
        expect(html).toContain('e.g. Material');
    });

    it('opens a legacy product with its derived slug and the name as alt text', () => {
        const product = catalogue['heating-range'].products[0];
        const html = render(<ProductEditor product={product} categoryKey="heating-range" catalogue={catalogue} onSaved={noop} onCancel={noop} />);

        expect(html).toContain('value="three-burner-range"');
        expect(html).toMatch(/id="product-image-alt"[^>]*value="Three Burner Range"/);
        expect(html).toContain('It was filled in with the product name');
        expect(html).toContain('>Update<');
        expect(html).not.toContain('+ New category');
        // Its own slug is not reported as taken by another product.
        expect(html).not.toContain('Another product already uses');
    });

    it('blocks a slug another product already uses, even in another category', () => {
        const clash = { name: 'Chinese Range', image: '/images/refrigeration/chinese-range.webp' };
        const withClash = { ...catalogue, refrigeration: { ...catalogue.refrigeration, products: [clash] } };
        const product = withClash['heating-range'].products[1];
        const html = render(<ProductEditor product={product} categoryKey="heating-range" catalogue={withClash} onSaved={noop} onCancel={noop} />);

        expect(html).toContain('Another product already uses the web address &quot;chinese-range&quot;');
        expect(html).toMatch(/disabled=""[^>]*>Update</);
    });
});

describe('CategoryEditor', () => {
    it('shows the fixed address and a snippet preview', () => {
        const html = render(<CategoryEditor categoryKey="heating-range" category={catalogue['heating-range']} onSaved={noop} onCancel={noop} />);

        expect(html).toContain('https://aksales.in/collections/<span class="text-accent">heating-range</span>');
        expect(html).toContain('HEATING RANGE Equipment | AK Sales Surat');
        expect(html).toContain('Save category');
    });
});

describe('SeoPanel and BlogEditor', () => {
    it('SeoPanel renders what it is given', () => {
        const html = render(<SeoPanel title="T" url="https://aksales.in/x" description="D" checks={[{ id: 'a', level: 'warn', message: 'Fix me' }]} />);

        expect(html).toContain('https://aksales.in/x');
        expect(html).toContain('Fix me');
        expect(html).toContain('Worth improving (1)');
    });

    it('the blog editor still shows its snippet and publish blockers', () => {
        const html = render(<BlogEditor blog={null} categories={[]} onSaved={noop} onCancel={noop} />);

        expect(html).toContain('https://aksales.in/blog/your-post-url');
        expect(html).toContain('Must fix before publishing');
        expect(html).toContain('Add a title.');
    });
});
