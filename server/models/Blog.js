const mongoose = require('mongoose');

// Legacy posts store their text as heading/text sections. Posts written in the
// rich-text editor store `body` (sanitized TipTap JSON) instead.
const blogContentSchema = new mongoose.Schema({
    heading: { type: String, required: true },
    text: { type: String, required: true }
}, { _id: false });

const faqSchema = new mongoose.Schema({
    question: { type: String, required: true },
    answer: { type: String, required: true }
}, { _id: false });

const blogSchema = new mongoose.Schema({
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    // Missing on documents created before drafts existed; those count as published.
    status: { type: String, enum: ['draft', 'published'], default: 'published' },
    image: { type: String, default: '' }, // Cloudinary URL; required to publish
    imageAlt: { type: String, default: '' },
    imageWidth: Number,
    imageHeight: Number,
    date: { type: String, default: '' }, // display date, e.g. "Jan 15, 2025"
    publishedAt: Date,
    category: { type: String, default: 'General' },
    tags: [String],
    author: { type: String, default: 'Admin' },
    authorUrl: { type: String, default: '' },
    authorBio: { type: String, default: '' },
    excerpt: { type: String, default: '' },
    seoTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    focusKeyword: { type: String, default: '' }, // editor guidance only, never rendered
    body: mongoose.Schema.Types.Mixed,
    faqs: [faqSchema],
    content: [blogContentSchema]
}, { timestamps: true, minimize: false });

module.exports = mongoose.model('Blog', blogSchema);
