const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
    question: { type: String, required: true },
    answer: { type: String, required: true }
}, { _id: false });

const gallerySchema = new mongoose.Schema({
    src: { type: String, required: true },
    alt: { type: String, default: '' },
    width: Number,
    height: Number
}, { _id: false });

const specSchema = new mongoose.Schema({
    label: { type: String, required: true },
    value: { type: String, required: true }
}, { _id: false });

// Legacy items only have name and image. Arrays default to undefined so those
// items keep that exact shape when read back, lean or not.
const productItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: String,
    oldSlugs: { type: [String], default: undefined },
    image: { type: String, required: true },
    imageAlt: String,
    imageWidth: Number,
    imageHeight: Number,
    gallery: { type: [gallerySchema], default: undefined },
    summary: String,
    body: mongoose.Schema.Types.Mixed, // sanitized TipTap JSON
    specs: { type: [specSchema], default: undefined },
    faqs: { type: [faqSchema], default: undefined },
    seoTitle: String,
    metaDescription: String,
    focusKeyword: String, // editor guidance only, never rendered
    modelNumber: String,
    updatedAt: Date
}, { _id: false });

const categorySchema = new mongoose.Schema({
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    seoTitle: String,
    metaDescription: String,
    body: mongoose.Schema.Types.Mixed, // buying-guide content shown below the product grid
    faqs: { type: [faqSchema], default: undefined },
    products: [productItemSchema]
}, { timestamps: true });

module.exports = mongoose.model('Category', categorySchema);
