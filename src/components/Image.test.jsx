import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Image from './Image.jsx';
import imageManifest from '../data/image-manifest.json';

const render = (props) => renderToStaticMarkup(<Image {...props} />);

describe('responsive images', () => {
    it('renders known local images with intrinsic dimensions and responsive sources', () => {
        const src = '/images/ak-sales-logo.png';
        const info = imageManifest[src];
        const html = render({ src, alt: 'AK Sales', loading: 'lazy' });
        expect(html).toContain(`width="${info.width}"`);
        expect(html).toContain(`height="${info.height}"`);
        expect(html).toContain(`srcSet="${info.srcSet}"`);
        expect(html).toContain('sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"');
        expect(html).toContain('alt="AK Sales"');
        expect(html).toContain('loading="lazy"');
        expect(html).toContain('decoding="async"');
    });

    it('preserves remote sources without inventing dimensions or srcSet', () => {
        const html = render({ src: 'https://res.cloudinary.com/example/product.webp', alt: 'Equipment', loading: 'lazy' });
        expect(html).toContain('src="https://res.cloudinary.com/example/product.webp"');
        expect(html).not.toContain('width=');
        expect(html).not.toContain('height=');
        expect(html).not.toContain('srcSet=');
        expect(html).not.toContain('sizes=');
    });

    it('lets callers override intrinsic dimensions, source selection and sizes', () => {
        const html = render({ src: '/images/ak-sales-logo.png', width: 200, height: 72, sizes: '200px', srcSet: '/custom.webp 200w', decoding: 'sync', className: 'logo' });
        expect(html).toContain('width="200"');
        expect(html).toContain('height="72"');
        expect(html).toContain('sizes="200px"');
        expect(html).toContain('srcSet="/custom.webp 200w"');
        expect(html).toContain('decoding="sync"');
        expect(html).toContain('class="logo"');
    });

    it('sets SVG dimensions without converting vector graphics into a srcSet', () => {
        const src = '/partners/rational.svg';
        const html = render({ src, alt: 'Rational' });
        expect(html).toContain(`width="${imageManifest[src].width}"`);
        expect(html).toContain(`height="${imageManifest[src].height}"`);
        expect(html).not.toContain('srcSet=');
    });
});
