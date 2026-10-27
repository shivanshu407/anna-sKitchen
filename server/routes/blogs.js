const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const { requireAuth } = require('../auth');
const { sanitizePost, validateDraft, validateForPublish, displayDate } = require('../blog-input');
const { singleImage, uploadImage } = require('../uploads');
const { loadFallbackData } = require('../web');

const PUBLISHED = { status: { $ne: 'draft' } };
const FOLDER = 'annas-kitchen/blogs';

async function attachFeaturedImage(post, file) {
    if (!file) return;
    const { url, width, height } = await uploadImage(file, post.imageAlt || post.title, FOLDER);
    Object.assign(post, { image: url, imageWidth: width, imageHeight: height });
}

// Legacy posts only carry a display date such as "Jan 15, 2025".
function legacyPublishedAt(date) {
    const parsed = typeof date === 'string' && date ? new Date(`${date} 12:00 UTC`) : null;
    return parsed && !Number.isNaN(parsed.getTime()) ? parsed : undefined;
}

function rejectInvalid(res, errors) {
    return res.status(400).json({ error: errors.join(' '), errors });
}

// GET /api/blogs - Fetch published blogs; ?drafts=1 (admin only) includes drafts
router.get('/', (req, res, next) => (req.query.drafts ? requireAuth(req, res, next) : next()), async (req, res) => {
    try {
        const blogs = await Blog.find(req.query.drafts ? {} : PUBLISHED).sort({ createdAt: -1 }); // Newest first
        res.json(blogs);
    } catch (err) {
        console.error('Error fetching blogs:', err);
        res.status(500).json({ error: 'Failed to fetch blogs', details: err.message });
    }
});

// GET /api/blogs/:slug - Fetch a single published blog
router.get('/:slug', async (req, res) => {
    try {
        const blog = await Blog.findOne({ slug: req.params.slug, ...PUBLISHED });
        if (!blog) {
            return res.status(404).json({ error: 'Blog not found' });
        }
        res.json(blog);
    } catch (err) {
        console.error('Error fetching blog:', err);
        res.status(500).json({ error: 'Failed to fetch blog', details: err.message });
    }
});

// POST /api/blogs/images - Upload an image for use inside an article body
router.post('/images', requireAuth, singleImage('image'), async (req, res) => {
    try {
        const alt = typeof req.body.alt === 'string' ? req.body.alt.trim() : '';
        if (!req.file) return res.status(400).json({ error: 'Choose an image to upload.' });
        if (!alt) return res.status(400).json({ error: 'Describe the image in its alt text.' });
        res.status(201).json(await uploadImage(req.file, alt, FOLDER));
    } catch (err) {
        console.error('Error uploading blog image:', err);
        res.status(500).json({ error: 'Failed to upload image', details: err.message });
    }
});

// POST /api/blogs/import-bundled - Copy the built-in posts into MongoDB. Once the
// database holds any post the site shows only database posts, so every missing
// one is imported in a single step.
router.post('/import-bundled', requireAuth, async (req, res) => {
    try {
        const bundled = (await loadFallbackData()).blogs || [];
        const existing = await Blog.find({ slug: { $in: bundled.map((post) => post.slug) } }, 'slug');
        const have = new Set(existing.map((post) => post.slug));
        const missing = bundled.filter((post) => !have.has(post.slug)).map((post) => ({
            ...post,
            status: 'published',
            imageAlt: post.imageAlt || post.title,
            publishedAt: legacyPublishedAt(post.date),
        }));
        if (missing.length) await Blog.insertMany(missing);
        const imported = missing.map((post) => post.slug);
        res.status(imported.length ? 201 : 200).json({
            message: imported.length ? `Imported ${imported.length} built-in post(s)` : 'Every built-in post is already in the database',
            imported,
        });
    } catch (err) {
        console.error('Error importing bundled blogs:', err);
        if (err.code === 11000) {
            return res.status(400).json({ error: 'A blog with one of these URL slugs already exists.' });
        }
        res.status(500).json({ error: 'Failed to import blogs', details: err.message });
    }
});

// POST /api/blogs - Create a blog post (draft or published)
router.post('/', requireAuth, singleImage('blogImage'), async (req, res) => {
    try {
        const { post, error } = sanitizePost(req.body);
        if (error) return res.status(400).json({ error });

        const pendingImage = req.file ? { ...post, image: 'pending upload' } : post;
        const errors = post.status === 'published' ? validateForPublish(pendingImage) : validateDraft(post);
        if (errors.length) return rejectInvalid(res, errors);

        await attachFeaturedImage(post, req.file);
        if (post.status === 'published') {
            post.publishedAt = post.publishedAt || new Date();
            post.date = displayDate(post.publishedAt);
        }

        const newBlog = await new Blog(post).save();
        res.status(201).json({ message: post.status === 'draft' ? 'Draft saved' : 'Blog published', blog: newBlog });
    } catch (err) {
        console.error('Error adding blog:', err);
        // Handle unique slug error
        if (err.code === 11000) {
            return res.status(400).json({ error: 'A blog with this URL slug already exists.' });
        }
        res.status(500).json({ error: 'Failed to add blog', details: err.message });
    }
});

// PUT /api/blogs/:slug - Update a blog post. A published post's URL never changes.
router.put('/:slug', requireAuth, singleImage('blogImage'), async (req, res) => {
    try {
        const { post, error } = sanitizePost(req.body);
        if (error) return res.status(400).json({ error });

        const existing = await Blog.findOne({ slug: req.params.slug });
        if (!existing) return res.status(404).json({ error: 'Blog not found' });

        const wasPublished = existing.status !== 'draft';
        if (wasPublished && post.slug !== existing.slug) {
            return rejectInvalid(res, ['The URL of a published post cannot change; it would break links to it.']);
        }

        const merged = {
            ...post,
            image: req.file ? 'pending upload' : existing.image,
            imageWidth: existing.imageWidth,
            imageHeight: existing.imageHeight,
            publishedAt: post.publishedAt || existing.publishedAt || legacyPublishedAt(existing.date),
        };
        const errors = post.status === 'published' ? validateForPublish(merged) : validateDraft(merged);
        if (errors.length) return rejectInvalid(res, errors);

        if (req.file) merged.image = '';
        await attachFeaturedImage(merged, req.file);
        if (merged.status === 'published') {
            merged.publishedAt = merged.publishedAt || new Date();
            merged.date = displayDate(merged.publishedAt);
        }
        // The editor converts legacy sections into the body, so they are retired on save.
        merged.content = [];

        existing.set(merged);
        await existing.save();
        res.json({ message: merged.status === 'draft' ? 'Draft saved' : 'Blog updated', blog: existing });
    } catch (err) {
        console.error('Error updating blog:', err);
        if (err.code === 11000) {
            return res.status(400).json({ error: 'A blog with this URL slug already exists.' });
        }
        res.status(500).json({ error: 'Failed to update blog', details: err.message });
    }
});

// DELETE /api/blogs/:slug - Delete a blog post
router.delete('/:slug', requireAuth, async (req, res) => {
    try {
        const deletedBlog = await Blog.findOneAndDelete({ slug: req.params.slug });
        if (!deletedBlog) {
            return res.status(404).json({ error: 'Blog not found' });
        }
        res.json({ message: `Deleted blog "${deletedBlog.title}" successfully` });
    } catch (err) {
        console.error('Error deleting blog:', err);
        res.status(500).json({ error: 'Failed to delete blog', details: err.message });
    }
});

module.exports = router;
