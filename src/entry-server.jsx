import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import SiteDataProvider from './components/SiteDataProvider';
import { fallbackData } from './lib/site-data';

export { fallbackData };
export { getPageInfo, sitemapXml, robotsTxt, serializeJson } from './lib/seo';

export function render(url, data) {
    // React 19 hoists metadata to the document head. Helmet 3 no longer fills
    // a server context on React 19, so render a document to collect that head.
    const document = renderToString(
        <html lang="en">
            <head />
            <body><div id="root">
                <HelmetProvider>
                    <SiteDataProvider initialData={data}>
                        <StaticRouter location={url}><App /></StaticRouter>
                    </SiteDataProvider>
                </HelmetProvider>
            </div></body>
        </html>
    );
    const head = document.match(/<head>([\s\S]*?)<\/head>/)[1];
    const body = document.slice(document.indexOf('<div id="root">') + '<div id="root">'.length, document.lastIndexOf('</div></body>'));
    return { body, head };
}
