import React from 'react';
import imageManifest from '../data/image-manifest.json';

const DEFAULT_SIZES = '(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw';

export default function Image({ src, width, height, srcSet, sizes, decoding = 'async', ...props }) {
    const image = imageManifest[src];
    const responsive = srcSet ?? image?.srcSet;
    return <img {...props} src={src} width={width ?? image?.width} height={height ?? image?.height}
        srcSet={responsive} sizes={sizes ?? (responsive ? DEFAULT_SIZES : undefined)} decoding={decoding} />;
}
