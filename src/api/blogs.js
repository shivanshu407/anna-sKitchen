const API_BASE = '/api';

// Default fallback data import
import defaultBlogsData from '../data/blogsData';
import { fetchWithTimeout } from './http';

/**
 * Fetch all blogs from the API, falls back to static data if API is unavailable
 */
export const fetchBlogs = async () => {
    try {
        const res = await fetchWithTimeout(`${API_BASE}/blogs`);
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`API error (${res.status}): ${errorText || res.statusText}`);
        }
        const data = await res.json();
        return data.length > 0 ? data : defaultBlogsData;
    } catch (err) {
        console.warn('⚠️ API unavailable, using fallback data:', err.message);
        return defaultBlogsData;
    }
};

/**
 * Fetch a single blog by slug
 */
export const fetchBlogBySlug = async (slug) => {
    try {
        const res = await fetchWithTimeout(`${API_BASE}/blogs/${slug}`);
        if (!res.ok) {
            throw new Error('Blog not found');
        }
        return await res.json();
    } catch (err) {
        console.warn('⚠️ API unavailable, falling back to static data:', err.message);
        return defaultBlogsData.find(blog => blog.slug === slug);
    }
};

// Turns a failed response into an Error. A 400 from validation carries every
// problem in `errors`, so all of them reach the writer at once.
const responseError = async (res, fallback) => {
    const contentType = res.headers.get('content-type');
    let message = fallback;
    let errors = [];
    if (contentType && contentType.includes('application/json')) {
        const err = await res.json().catch(() => ({}));
        errors = Array.isArray(err.errors) ? err.errors.filter(Boolean) : [];
        if (errors.length) message = errors.join(' ');
        else message = err.details ? `${err.error}: ${err.details}` : (err.error || fallback);
    } else {
        message = await res.text() || fallback;
    }
    const error = new Error(message);
    error.status = res.status;
    error.errors = errors.length ? errors : [message];
    return error;
};

const sendForm = async (url, method, formData, fallback) => {
    const res = await fetch(url, { method, body: formData, credentials: 'same-origin' });
    if (!res.ok) throw await responseError(res, fallback);
    const contentType = res.headers.get('content-type');
    return contentType && contentType.includes('application/json') ? res.json() : {};
};

const TEXT_FIELDS = [
    'title', 'slug', 'status', 'excerpt', 'seoTitle', 'metaDescription', 'focusKeyword',
    'imageAlt', 'category', 'author', 'authorBio', 'authorUrl', 'publishedAt',
];

/**
 * The multipart body the blog routes read (server/blog-input.js sanitizePost):
 * plain text fields, JSON strings for tags/faqs/body, and the featured image
 * under `blogImage` only when a new file was chosen.
 */
export const blogFormData = (post, imageFile) => {
    const formData = new FormData();
    TEXT_FIELDS.forEach((field) => formData.append(field, post[field] == null ? '' : String(post[field])));
    formData.append('tags', JSON.stringify(Array.isArray(post.tags) ? post.tags : []));
    formData.append('faqs', JSON.stringify(Array.isArray(post.faqs) ? post.faqs : []));
    formData.append('body', JSON.stringify(post.body || { type: 'doc', content: [] }));
    if (imageFile) formData.append('blogImage', imageFile);
    return formData;
};

/**
 * Every post including drafts, for the admin. Throws rather than falling back
 * to bundled data, so the admin never edits a stale copy.
 */
export const fetchAllBlogsAdmin = async () => {
    const res = await fetch(`${API_BASE}/blogs?drafts=1`, { credentials: 'same-origin' });
    if (!res.ok) throw await responseError(res, 'Failed to load blog posts');
    return res.json();
};

/**
 * Create a post (draft or published). Resolves to { message, blog }.
 */
export const addBlog = (post, imageFile) =>
    sendForm(`${API_BASE}/blogs`, 'POST', blogFormData(post, imageFile), 'Failed to save blog');

/**
 * Update the post currently stored at `originalSlug`. Resolves to { message, blog }.
 */
export const updateBlog = (originalSlug, post, imageFile) =>
    sendForm(`${API_BASE}/blogs/${encodeURIComponent(originalSlug)}`, 'PUT', blogFormData(post, imageFile), 'Failed to update blog');

/**
 * Upload an image for the article body. Resolves to { url, width, height }.
 */
export const uploadBlogImage = (file, alt) => {
    const formData = new FormData();
    formData.append('alt', alt || '');
    formData.append('image', file);
    return sendForm(`${API_BASE}/blogs/images`, 'POST', formData, 'Failed to upload image');
};

/**
 * Delete a blog via the API
 */
export const deleteBlog = async (slug) => {
    const res = await fetch(`${API_BASE}/blogs/${encodeURIComponent(slug)}`, {
        method: 'DELETE',
        credentials: 'same-origin'
    });
    if (!res.ok) throw await responseError(res, 'Failed to delete blog');

    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return await res.json();
    }
    return { message: 'Blog deleted successfully' };
};
