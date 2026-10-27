import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import ProductDetailPage from './ProductDetailPage.jsx';
import { SiteDataContext, fallbackData } from '../lib/site-data.js';
import { productPath } from '../lib/catalogue.js';

// Vitest compiles JSX with the classic runtime, and the sliders, CTA and quote
// bar on this page do not import React themselves.
globalThis.React = React;

const IMAGE = 'https://res.cloudinary.com/demo/image/upload/v1/tandoor.jpg';
const paragraph = (text) => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const tandoor = {
    name: 'Tank Tandoor', slug: 'clay-tank-tandoor', oldSlugs: ['tandoor-old'],
    image: IMAGE, imageAlt: 'Steel tank tandoor with clay pot', imageWidth: 1200, imageHeight: 900,
    gallery: [{ src: 'https://res.cloudinary.com/demo/image/upload/v1/side.jpg', alt: 'Side view of the tandoor' }],
    summary: 'A charcoal tank tandoor with a clay pot for hotel kitchens.',
    body: { type: 'doc', content: [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Why clay' }] }, paragraph('Clay holds heat for hours.')] },
    specs: [{ label: 'Material', value: 'SS 304' }, { label: 'Fuel', value: 'Charcoal' }, { label: 'Blank', value: '' }],
    faqs: [{ question: 'Does it use gas?', answer: 'No, it burns charcoal.' }],
};
const products = {
    'heating-range': { title: 'Heating Range', slug: 'heating-range', products: [tandoor, { name: 'Dosa Bhatti', image: '/images/heating-range/dosa-bhatti.webp' }] },
    bakery: { title: 'Bakery', slug: 'bakery', products: [{ name: 'Bread Oven', image: '/images/bakery-product/bread-oven.webp' }] },
};

const render = (path, data = { ...fallbackData, products }) => renderToString(
    <SiteDataContext.Provider value={{ ...data, loading: false }}>
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path="/collections/:category/:productName" element={<ProductDetailPage />} />
            </Routes>
        </MemoryRouter>
    </SiteDataContext.Provider>,
);

describe('ProductDetailPage', () => {
    it('finds a product by slug, legacy name, old slug and previous category', () => {
        for (const path of ['/collections/heating-range/clay-tank-tandoor', '/collections/heating-range/Tank%20Tandoor', '/collections/heating-range/tandoor-old', '/collections/bakery/clay-tank-tandoor']) {
            const html = render(path);
            expect(html, path).toContain('Steel tank tandoor with clay pot');
            expect(html, path).toMatch(/href="\/collections\/heating-range"[^>]*>Heating Range<\/a>/);
        }
    });

    it('shows not found for an unknown product', () => {
        expect(render('/collections/heating-range/unknown')).toContain('Product Not Found');
    });

    it('renders the main image with its alt, dimensions and Cloudinary srcset', () => {
        const html = render('/collections/heating-range/clay-tank-tandoor');
        expect(html).toContain('alt="Steel tank tandoor with clay pot"');
        expect(html).toContain('width="1200"');
        expect(html).toContain('height="900"');
        expect(html).toContain('w_800/v1/tandoor.jpg 800w');
    });

    it('renders the gallery, summary, specification table, body and FAQs', () => {
        const html = render('/collections/heating-range/clay-tank-tandoor');
        expect(html).toMatch(/<figure[^>]*><img[^>]*alt="Side view of the tandoor"/);
        expect(html).toContain(tandoor.summary);
        expect(html).toMatch(/<h2[^>]*>Specifications<\/h2>/);
        expect(html).toMatch(/<th scope="row"[^>]*>Material<\/th><td[^>]*>SS 304<\/td>/);
        expect(html).toMatch(/<th scope="row"[^>]*>Fuel<\/th>/);
        expect(html).not.toContain('>Blank<');
        expect(html).toMatch(/<h2[^>]*id="why-clay"[^>]*>/);
        expect(html).toContain('Clay holds heat for hours.');
        expect(html).toMatch(/<h2[^>]*>Frequently asked questions<\/h2>/);
        expect(html).toMatch(/<h3[^>]*>Does it use gas\?<\/h3>/);
        expect(html).not.toContain('Manufacturers in');
        expect(html).not.toContain('Read more');
    });

    it('keeps the templated description for products with no summary or body', () => {
        const html = render('/collections/heating-range/dosa-bhatti');
        expect(html).toContain('alt="Dosa Bhatti"');
        expect(html).toMatch(/Dosa Bhatti<!-- --> Manufacturers in/);
        expect(html).not.toContain('Specifications');
        expect(html).not.toContain('Frequently asked questions');
        expect(html).not.toContain('Read more');
    });

    it('drops the template once a summary exists, even without a body', () => {
        const data = { ...fallbackData, products: { bakery: { title: 'Bakery', slug: 'bakery', products: [{ name: 'Bread Oven', image: '/x.webp', summary: 'A deck oven for bread.' }] } } };
        const html = render('/collections/bakery/bread-oven', data);
        expect(html).toContain('A deck oven for bread.');
        expect(html).not.toContain('Manufacturers in');
    });

    it('renders every bundled product at its slug URL', () => {
        for (const [key, category] of Object.entries(fallbackData.products)) {
            category.products.forEach((product) => {
                const html = render(productPath(key, product), fallbackData);
                expect(html, product.name).not.toContain('Product Not Found');
            });
        }
    });
});
