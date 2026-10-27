require('dotenv').config();
// Legacy location kept working: dotenv never overrides already-set vars, so panel
// env vars on Hostinger still win over anything in server/.env.
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const path = require('path');
const fs = require('fs');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const productRoutes = require('./routes/products');
const blogRoutes = require('./routes/blogs');
const authRoutes = require('./routes/auth');
const { mountWeb, invalidateContent } = require('./web');

const app = express();
const DIST = path.join(__dirname, '..', 'dist');

app.disable('x-powered-by');
app.set('trust proxy', 1); // Hostinger terminates TLS in front of the Node process

// Middleware
app.use(compression());
// The SPA and API share an origin, so the browser never makes a cross-origin
// call. Reflecting arbitrary origins would only help someone else's page talk
// to this API, so CORS is opened up for local development only.
if (process.env.NODE_ENV !== 'production') {
    app.use(cors({ origin: true, credentials: true }));
}
app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (req.hostname === 'www.aksales.in' || (req.hostname === 'aksales.in' && !req.secure)) {
        return res.redirect(301, `https://aksales.in${req.originalUrl}`);
    }
    next();
});
app.use('/api', (req, res, next) => {
    res.setHeader('X-Robots-Tag', 'noindex');
    next();
});
app.use('/api/products', invalidateContent);
app.use('/api/blogs', invalidateContent);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/blogs', blogRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        version: '1.0.2-debug',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV,
        db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Unknown /api/* must 404 as JSON. Without this the SPA fallback below would
// answer a mistyped endpoint with index.html and a 200.
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found', path: req.originalUrl });
});

// Serve the built front-end. Absent during local API-only development.
if (fs.existsSync(DIST)) {
    app.get('/index.html', (req, res) => res.redirect(301, '/'));
    app.get(['/anna-kitchen-broucher.pdf', '/Anna%20Kitchen%20Broucher.pdf'], (req, res) => res.redirect(301, '/ak-sales-brochure.pdf'));
    app.use(express.static(DIST, {
        index: false,
        redirect: false,
        setHeaders(res, filePath) {
            if (filePath.endsWith('.pdf')) res.setHeader('X-Robots-Tag', 'noindex');
            if (filePath.endsWith('.html')) {
                res.setHeader('Cache-Control', 'no-cache');
                return;
            }
            const rel = path.relative(DIST, filePath).split(path.sep).join('/');
            // Vite fingerprints everything in assets/, so it can be cached forever.
            // Files copied from public/ keep stable names and get a shorter TTL.
            res.setHeader(
                'Cache-Control',
                rel.startsWith('assets/')
                    ? 'public, max-age=31536000, immutable'
                    : 'public, max-age=2592000'
            );
        }
    }));

    mountWeb(app, DIST);
} else {
    console.warn('⚠️  dist/ not found — run "npm run build" to serve the front-end.');
}

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled Exception:', err);
    res.status(500).json({
        error: 'Global Server Error',
        details: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// This module only builds the app; server.js at the project root owns listen().
// Connecting here (rather than gating startup on it) means the front-end falls back
// to its bundled static catalogue during a DB outage instead of the site going down.
// Fail fast instead of sitting on mongoose's 10s default buffer. A common
// first-deploy problem is Atlas not allow-listing the Hostinger server IP, and a
// quick 500 lets the front-end drop to its static catalogue straight away. This has
// to be set whether or not a URI is configured, since queries buffer either way.
mongoose.set('bufferTimeoutMS', 5000);

if (!process.env.MONGODB_URI) {
    console.warn('⚠️  MONGODB_URI is not set — API will serve no database-backed content.');
} else {
    mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 20000,
    })
        .then(() => console.log('✅ Connected to MongoDB Atlas'))
        .catch(err => console.error('❌ MongoDB connection error:', err.message));
}

module.exports = app;
