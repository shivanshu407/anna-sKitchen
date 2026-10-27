import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import CollectionPage from './CollectionPage.jsx';
import { SiteDataContext, fallbackData } from '../lib/site-data.js';

const products = {
    'heating-range': {
        title: 'Heating Range', slug: 'heating-range', description: 'Burners and tandoors.',
        body: { type: 'doc', content: [
            { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Choosing a gas range' }] },
            { type: 'paragraph', content: [{ type: 'text', text: 'Match burner count to your menu.' }] },
        ] },
        faqs: [{ question: 'Do you build custom burners?', answer: 'Yes, to your kitchen layout.' }, { question: 'Blank', answer: ' ' }],
        products: [
            { name: 'Tank Tandoor', slug: 'clay-tank-tandoor', image: '/images/heating-range/tank-tandoor.webp', imageAlt: 'Steel tank tandoor', summary: 'A charcoal tandoor for hotels.' },
            { name: "Chef's & Baker's Range", image: '/images/heating-range/dosa-bhatti.webp' },
        ],
    },
};

const render = (path, data = { ...fallbackData, products }) => renderToString(
    <SiteDataContext.Provider value={{ ...data, loading: false }}>
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path="/collections/:category" element={<CollectionPage />} />
            </Routes>
        </MemoryRouter>
    </SiteDataContext.Provider>,
);

describe('CollectionPage', () => {
    it('links each product to its slug URL', () => {
        const html = render('/collections/heating-range');
        expect(html).toContain('href="/collections/heating-range/clay-tank-tandoor"');
        expect(html).toContain('href="/collections/heating-range/chef-s-baker-s-range"');
        expect(html).not.toContain('%20');
    });

    it('uses the image alt, falling back to the product name, and shows the summary', () => {
        const html = render('/collections/heating-range');
        expect(html).toContain('alt="Steel tank tandoor"');
        expect(html).toContain('alt="Chef&#x27;s &amp; Baker&#x27;s Range"');
        expect(html).toMatch(/<p class="[^"]*line-clamp-2[^"]*">A charcoal tandoor for hotels\.<\/p>/);
    });

    it('renders the buying guide and complete FAQs below the grid', () => {
        const html = render('/collections/heating-range');
        expect(html).toMatch(/<h2 id="choosing-a-gas-range"[^>]*><span>Choosing a gas range<\/span><\/h2>/);
        expect(html).toContain('Match burner count to your menu.');
        expect(html).toMatch(/<h2[^>]*>Frequently asked questions<\/h2>/);
        expect(html).toMatch(/<h3[^>]*>Do you build custom burners\?<\/h3>/);
        expect(html).not.toContain('>Blank<');
        expect(html.indexOf('clay-tank-tandoor')).toBeLessThan(html.indexOf('Choosing a gas range'));
    });

    it('leaves out the guide and FAQ section for a legacy category', () => {
        const html = render('/collections/heating-range', fallbackData);
        expect(html).toContain('href="/collections/heating-range/dosa-bhatti"');
        expect(html).not.toContain('Frequently asked questions');
    });
});
