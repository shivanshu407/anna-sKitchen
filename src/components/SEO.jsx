import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { useSiteData } from '../lib/site-data';
import { getPageInfo, serializeJson } from '../lib/seo';

export default function SEO() {
    const { pathname } = useLocation();
    const data = useSiteData();
    const page = getPageInfo(pathname, data);
    return (
        <Helmet>
            <title>{page.title}</title>
            <meta name="description" content={page.description} />
            <meta name="robots" content={page.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'} />
            <link rel="canonical" href={page.canonical} />
            <meta property="og:site_name" content="AK Sales" />
            <meta property="og:locale" content="en_IN" />
            <meta property="og:type" content={page.type} />
            <meta property="og:title" content={page.title} />
            <meta property="og:description" content={page.description} />
            <meta property="og:url" content={page.canonical} />
            <meta property="og:image" content={page.image} />
            <meta property="og:image:alt" content={page.imageAlt ?? page.title} />
            {page.type === 'article' && page.publishedTime && <meta property="article:published_time" content={page.publishedTime} />}
            {page.type === 'article' && page.modifiedTime && <meta property="article:modified_time" content={page.modifiedTime} />}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={page.title} />
            <meta name="twitter:description" content={page.description} />
            <meta name="twitter:image" content={page.image} />
            {page.schemas.length > 0 && <script type="application/ld+json">{serializeJson({ '@context': 'https://schema.org', '@graph': page.schemas })}</script>}
        </Helmet>
    );
}
