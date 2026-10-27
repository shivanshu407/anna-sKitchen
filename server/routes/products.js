const express = require('express');
const router = express.Router();
const Category = require('../models/Product');
const { requireAuth } = require('../auth');
const { toCatalogue } = require('../content');
const { text } = require('../blog-input');
const { singleImage, formFields, uploadImage } = require('../uploads');
const {
    productSlug, sanitizeProduct, validateProduct, productSlugsInUse, nextOldSlugs,
    validateNewCategory, sanitizeCategory, validateCategory,
} = require('../catalogue-input');

const FOLDER = 'annas-kitchen/products';

function rejectInvalid(res, errors) {
    return res.status(400).json({ error: errors.join(' '), errors });
}

const plain = (item) => (typeof item?.toObject === 'function' ? item.toObject() : { ...item });
const indexOf = (category, slug) => category.products.findIndex((product) => productSlug(product) === slug.toLowerCase());

// The public shape of a category and one of its products, as GET /api/products serves them.
function shaped(category, slug) {
    const out = toCatalogue([category])[category.slug];
    return { category: out, product: out.products.find((product) => productSlug(product) === slug) };
}

// A slug that is taken stops redirecting from whichever product used to own it.
function releaseOldSlug(categories, slug, modified) {
    for (const category of categories) {
        for (const product of category.products) {
            if (!product.oldSlugs?.includes(slug)) continue;
            const rest = product.oldSlugs.filter((old) => old !== slug);
            product.oldSlugs = rest.length ? rest : undefined;
            modified.add(category);
        }
    }
}

async function saveAll(categories) {
    for (const category of categories) await category.save();
}

// GET /api/products - Fetch all categories with their products
router.get('/', async (req, res) => {
    try {
        const categories = await Category.find().sort({ createdAt: 1 });

        // Transform to the same format the frontend expects: { slug: { title, slug, description, products } }
        res.json(toCatalogue(categories));
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({
            error: 'Failed to fetch products',
            details: err.message
        });
    }
});

// POST /api/products/images - Upload an image for a product gallery or description
router.post('/images', requireAuth, singleImage('image'), async (req, res) => {
    try {
        const alt = typeof req.body.alt === 'string' ? req.body.alt.trim() : '';
        if (!req.file) return res.status(400).json({ error: 'Choose an image to upload.' });
        if (!alt) return res.status(400).json({ error: 'Describe the image in its alt text.' });
        res.status(201).json(await uploadImage(req.file, alt, FOLDER));
    } catch (err) {
        console.error('Error uploading product image:', err);
        res.status(500).json({ error: 'Failed to upload image', details: err.message });
    }
});

// POST /api/products - Add a product to a category (or create new category)
router.post('/', requireAuth, singleImage('productImage'), async (req, res) => {
    try {
        const { product, error } = sanitizeProduct(req.body);
        if (error) return rejectInvalid(res, [error]);

        const categorySlug = text(req.body.categorySlug, 100).toLowerCase();
        const categoryTitle = text(req.body.categoryTitle, 100);
        const categories = await Category.find();
        let category = categories.find((c) => c.slug === categorySlug);

        const errors = category ? [] : validateNewCategory({ slug: categorySlug, title: categoryTitle });
        const pending = { ...product, image: req.file ? 'pending upload' : '' };
        errors.push(...validateProduct(pending, { takenSlugs: productSlugsInUse(categories) }));
        if (errors.length) return rejectInvalid(res, errors);

        const { url, width, height } = await uploadImage(req.file, product.imageAlt || product.name, FOLDER);
        const item = { ...product, image: url, imageWidth: width, imageHeight: height, updatedAt: new Date() };

        const modified = new Set();
        releaseOldSlug(categories, item.slug, modified);
        if (!category) {
            category = new Category({
                slug: categorySlug,
                title: categoryTitle,
                description: text(req.body.categoryDescription, 1000),
                products: [],
            });
        }
        category.products.push(item);
        modified.add(category);
        await saveAll(modified);

        res.status(201).json({ message: `Added "${item.name}" to ${category.title}`, ...shaped(category, item.slug) });
    } catch (err) {
        console.error('Error adding product:', err);
        res.status(500).json({
            error: 'Failed to add product',
            details: err.message
        });
    }
});

// PUT /api/products/categories/:categorySlug - Update a category's text. Its slug never changes.
// Declared before /:categorySlug/:productSlug, which would otherwise match it.
router.put('/categories/:categorySlug', requireAuth, formFields(), async (req, res) => {
    try {
        const { category: input, error } = sanitizeCategory(req.body);
        if (error) return rejectInvalid(res, [error]);

        const category = await Category.findOne({ slug: req.params.categorySlug });
        if (!category) return res.status(404).json({ error: 'Category not found' });

        const errors = validateCategory({ title: category.title, body: category.body, ...input });
        if (errors.length) return rejectInvalid(res, errors);

        for (const [field, value] of Object.entries(input)) category.set(field, value);
        await category.save();
        res.json({ message: `Updated ${category.title}`, category: toCatalogue([category])[category.slug] });
    } catch (err) {
        console.error('Error updating category:', err);
        res.status(500).json({ error: 'Failed to update category', details: err.message });
    }
});

// PUT /api/products/:categorySlug/:productSlug - Update a product, optionally moving it to another category
router.put('/:categorySlug/:productSlug', requireAuth, singleImage('productImage'), async (req, res) => {
    try {
        const { product, error } = sanitizeProduct(req.body);
        if (error) return rejectInvalid(res, [error]);

        const categories = await Category.find();
        const source = categories.find((c) => c.slug === req.params.categorySlug);
        if (!source) return res.status(404).json({ error: 'Category not found' });
        const index = indexOf(source, req.params.productSlug);
        if (index < 0) return res.status(404).json({ error: 'Product not found' });

        const current = source.products[index];
        const existing = plain(current);
        const moveTo = text(req.body.categorySlug, 100).toLowerCase();
        const target = moveTo ? categories.find((c) => c.slug === moveTo) : source;

        const errors = target ? [] : ['Choose an existing category to move the product to.'];
        const merged = {
            ...product,
            image: req.file ? 'pending upload' : existing.image,
            imageWidth: existing.imageWidth,
            imageHeight: existing.imageHeight,
        };
        errors.push(...validateProduct(merged, { takenSlugs: productSlugsInUse(categories, current) }));
        if (errors.length) return rejectInvalid(res, errors);

        if (req.file) {
            const { url, width, height } = await uploadImage(req.file, merged.imageAlt || merged.name, FOLDER);
            Object.assign(merged, { image: url, imageWidth: width, imageHeight: height });
        }
        const oldSlugs = nextOldSlugs(productSlug(existing), existing.oldSlugs, merged.slug);
        if (oldSlugs.length) merged.oldSlugs = oldSlugs;
        merged.updatedAt = new Date();

        const modified = new Set([source, target]);
        source.products.splice(index, 1);
        releaseOldSlug(categories, merged.slug, modified);
        if (target === source) source.products.splice(index, 0, merged);
        else target.products.push(merged);
        await saveAll(modified);

        res.json({ message: `Updated "${merged.name}"`, ...shaped(target, merged.slug) });
    } catch (err) {
        console.error('Error updating product:', err);
        res.status(500).json({ error: 'Failed to update product', details: err.message });
    }
});

// DELETE /api/products/:categorySlug/:productSlug - Delete a product from a category
router.delete('/:categorySlug/:productSlug', requireAuth, async (req, res) => {
    try {
        const category = await Category.findOne({ slug: req.params.categorySlug });
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        const index = indexOf(category, req.params.productSlug);
        if (index < 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const [removedProduct] = category.products.splice(index, 1);
        await category.save();

        res.json({ message: `Deleted "${removedProduct.name}" from ${category.title}` });
    } catch (err) {
        console.error('Error deleting product:', err);
        res.status(500).json({
            error: 'Failed to delete product',
            details: err.message
        });
    }
});


module.exports = router;
