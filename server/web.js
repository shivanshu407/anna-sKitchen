const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const mongoose = require('mongoose');
const Category = require('./models/Product');
const Blog = require('./models/Blog');
const { createContentLoader, toCatalogue } = require('./content');

const rendererPath = path.join(__dirname, '..', 'dist-server', 'entry-server.js');
let runtime;
let loader;

async function loadRuntime() {
    if (!runtime) runtime = import(pathToFileURL(rendererPath).href);
    const renderer = await runtime;
    if (!loader) {
        loader = createContentLoader({
            fallback: renderer.fallbackData,
            isConnected: () => mongoose.connection.readyState === 1,
            async read() {
                const [categories, blogs] = await Promise.all([
                    Category.find().sort({ createdAt: 1 }).maxTimeMS(3000).lean(),
                    Blog.find({ status: { $ne: 'draft' } }).sort({ createdAt: -1 }).maxTimeMS(3000).lean(),
                ]);
                const products = toCatalogue(categories);
                return { products, blogs: blogs.length ? blogs : renderer.fallbackData.blogs };
            },
        });
    }
    return renderer;
}

// The bundled catalogue and posts the renderer falls back to without a database.
async function loadFallbackData() {
    return (await loadRuntime()).fallbackData;
}

function invalidateContent(req, res, next) {
    res.on('finish', () => {
        if (loader && !['GET', 'HEAD'].includes(req.method) && res.statusCode < 400) loader.invalidate();
    });
    next();
}

function mountWeb(app, dist) {
    if (!fs.existsSync(rendererPath)) throw new Error('SSR build missing: run npm run build before starting the server.');
    const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
        .replace(/<title\b[^>]*data-rh="true"[^>]*>[\s\S]*?<\/title>/g, '')
        .replace(/<meta\b[^>]*data-rh="true"[^>]*>/g, '');

    app.get('/robots.txt', async (req, res, next) => {
        try {
            const renderer = await loadRuntime();
            res.set('Cache-Control', 'public, max-age=300').type('text/plain').send(renderer.robotsTxt());
        } catch (error) { next(error); }
    });
    app.get('/sitemap.xml', async (req, res, next) => {
        try {
            const renderer = await loadRuntime();
            const { data, degraded } = await loader.get();
            if (degraded && process.env.MONGODB_URI) {
                return res.status(503).set('Retry-After', '60').type('text/plain').send('Catalogue temporarily unavailable. Please retry.');
            }
            res.set('Cache-Control', 'public, max-age=60').type('application/xml').send(renderer.sitemapXml(data));
        } catch (error) { next(error); }
    });
    app.get('*', async (req, res, next) => {
        try {
            if (/\.(?:png|jpe?g|webp|gif|svg|ico|pdf|css|js|map|woff2?)$/i.test(req.path)) {
                return res.status(404).set('X-Robots-Tag', 'noindex').type('text/plain').send('File not found');
            }
            const renderer = await loadRuntime();
            const { data, degraded } = await loader.get();
            const page = renderer.getPageInfo(req.path, data);
            const canonicalPath = new URL(page.canonical).pathname;
            if (page.status === 200 && req.path !== canonicalPath) {
                const query = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
                return res.redirect(301, canonicalPath + query);
            }
            let status = page.status;
            if (status === 404 && degraded && process.env.MONGODB_URI && /^\/(collections|blog)\//.test(req.path)) {
                status = 503;
                res.set('Retry-After', '60');
            }
            if (page.noindex || status !== 200) res.set('X-Robots-Tag', 'noindex, follow');
            const { body, head } = renderer.render(req.originalUrl, data);
            const html = template.replace('<!--app-head-->', () => head)
                .replace('<div id="root"></div>', () => `<div id="root">${body}</div>`)
                .replace('<!--app-data-->', () => `<script id="site-data" type="application/json">${renderer.serializeJson(data)}</script>`);
            res.status(status).set('Cache-Control', 'no-cache').type('html').send(html);
        } catch (error) { next(error); }
    });
}

module.exports = { mountWeb, invalidateContent, loadFallbackData };
