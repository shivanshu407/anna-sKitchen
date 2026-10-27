import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaEye, FaTimes } from 'react-icons/fa';
import RichTextEditor from './RichTextEditor';
import SeoPanel from './SeoPanel';
import {
    inputClass, fileInputClass, labelClass, hintClass, primaryButton, ghostButton,
    Counter, FieldLabel, Section, FaqFields, ErrorList,
} from './FormParts';
import { IMAGE_TYPES, EMPTY_DOC, imageFileError, completeFaqs } from './form-helpers';
import BlogArticle from '../BlogArticle';
import { addBlog, updateBlog, uploadBlogImage } from '../../api/blogs';
import { bodyOf, blogDescription, blogSeoTitle, slugify, wordCount } from '../../lib/blog-content';
import { analyzePost, LIMITS, SLUG } from '../../lib/blog-seo-check';

const SITE = 'https://aksales.in';
const TIME_ZONE = 'Asia/Kolkata';
const MAX_SLUG = 80;

const autoSlug = (title) => slugify(title).slice(0, MAX_SLUG).replace(/-+$/, '');
const dayOf = (date) => date.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TIME_ZONE });
const today = () => dayOf(new Date());

// The date input shows the publish day in India time. Legacy posts only have
// a display string such as "Jan 15, 2025".
function initialDay(blog) {
    const iso = blog?.publishedAt ? new Date(blog.publishedAt) : null;
    if (iso && !Number.isNaN(iso.getTime())) return dayOf(iso);
    const legacy = blog?.date ? new Date(`${blog.date} 12:00 UTC`) : null;
    if (legacy && !Number.isNaN(legacy.getTime())) return dayOf(legacy);
    return today();
}

function initialForm(blog) {
    const body = bodyOf(blog);
    return {
        title: blog?.title || '',
        slug: blog?.slug || '',
        slugTouched: Boolean(blog?.slug) && blog.slug !== autoSlug(blog.title || ''),
        excerpt: blog?.excerpt || '',
        body: body.content?.length ? body : EMPTY_DOC,
        faqs: (blog?.faqs || []).map((faq) => ({ question: faq.question || '', answer: faq.answer || '' })),
        imageAlt: blog?.imageAlt || '',
        seoTitle: blog?.seoTitle || '',
        metaDescription: blog?.metaDescription || '',
        focusKeyword: blog?.focusKeyword || '',
        category: blog?.category || '',
        tags: (blog?.tags || []).join(', '),
        author: blog?.author || 'AK Sales Team',
        authorBio: blog?.authorBio || '',
        authorUrl: blog?.authorUrl || '',
        day: initialDay(blog),
        dayTouched: false,
    };
}

const PreviewModal = ({ blog, onClose }) => {
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        const overflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = overflow;
        };
    }, [onClose]);

    return (
        <div role="dialog" aria-modal="true" aria-label="Post preview" className="fixed inset-0 z-50 overflow-y-auto bg-gold-light">
            <div className="sticky top-0 z-20 flex items-center justify-between gap-4 bg-secondary px-4 sm:px-6 py-3 shadow-lg">
                <p className="text-sm text-gray-300">
                    <span className="font-bold text-accent">Preview</span> — this is how the post will look on the site. Nothing has been saved.
                </p>
                <button type="button" autoFocus onClick={onClose} className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-white hover:bg-white/10">
                    <FaTimes aria-hidden="true" /> Close
                </button>
            </div>
            <div className="min-h-full bg-gold-light">
                <BlogArticle blog={blog} />
            </div>
        </div>
    );
};

/**
 * Create or edit a blog post. `blog` is null for a new post. Calls
 * `onSaved(message)` after a successful save and `onCancel()` to leave.
 */
const BlogEditor = ({ blog, categories = [], onSaved, onCancel }) => {
    const [form, setForm] = useState(() => initialForm(blog));
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const imagePreviewRef = useRef('');
    const [imageError, setImageError] = useState('');
    const [serverErrors, setServerErrors] = useState([]);
    const [saving, setSaving] = useState('');
    const [previewBlog, setPreviewBlog] = useState(null);

    const isNew = !blog;
    const isPublished = Boolean(blog) && blog.status !== 'draft';
    const slugLocked = isPublished;

    useEffect(() => () => {
        if (imagePreviewRef.current) URL.revokeObjectURL(imagePreviewRef.current);
    }, []);

    const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

    const setTitle = (e) => {
        const title = e.target.value;
        setForm((prev) => ({
            ...prev,
            title,
            slug: prev.slugTouched || slugLocked ? prev.slug : autoSlug(title),
        }));
    };

    const setSlug = (e) => {
        const slug = e.target.value.toLowerCase().replace(/\s+/g, '-');
        setForm((prev) => ({ ...prev, slug, slugTouched: slug !== '' }));
    };

    const setBody = (body) => setForm((prev) => ({ ...prev, body }));

    const setFaqs = (list) => setForm((prev) => ({ ...prev, faqs: list }));

    const chooseImage = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const problem = imageFileError(file);
        if (problem) { setImageError(problem); e.target.value = ''; return; }
        if (imagePreviewRef.current) URL.revokeObjectURL(imagePreviewRef.current);
        imagePreviewRef.current = URL.createObjectURL(file);
        setImageError('');
        setImageFile(file);
        setImagePreview(imagePreviewRef.current);
    };

    const tags = useMemo(() => [...new Set(form.tags.split(',').map((tag) => tag.trim()).filter(Boolean))], [form.tags]);
    const faqs = useMemo(() => completeFaqs(form.faqs), [form.faqs]);
    const image = imagePreview || blog?.image || '';

    const post = useMemo(() => ({
        title: form.title.trim(),
        slug: form.slug.trim(),
        excerpt: form.excerpt.trim(),
        seoTitle: form.seoTitle.trim(),
        metaDescription: form.metaDescription.trim(),
        focusKeyword: form.focusKeyword.trim(),
        image,
        imageAlt: form.imageAlt.trim(),
        body: form.body,
        faqs,
    }), [form, image, faqs]);

    const checks = useMemo(() => analyzePost(post), [post]);
    const blockers = checks.filter((item) => item.level === 'error');

    // An untouched date keeps the stored timestamp (or lets the server stamp the
    // publish time); a chosen day is sent as noon India time so it never shifts.
    const publishedAt = () => {
        if (!form.dayTouched) return blog?.publishedAt || '';
        return form.day === today() ? new Date().toISOString() : `${form.day}T12:00:00+05:30`;
    };

    const payload = (status) => ({
        ...post,
        status,
        category: form.category.trim(),
        tags,
        author: form.author.trim(),
        authorBio: form.authorBio.trim(),
        authorUrl: form.authorUrl.trim(),
        publishedAt: publishedAt(),
    });

    const save = async (status) => {
        // Drafts need only what the server checks for drafts: a title and a valid slug.
        const errors = blockers
            .filter((item) => status === 'published' || item.id === 'title' || item.id === 'slug')
            .map((item) => item.message);
        if (errors.length) { setServerErrors(errors); return; }

        setSaving(status);
        setServerErrors([]);
        try {
            const data = payload(status);
            const result = isNew ? await addBlog(data, imageFile) : await updateBlog(blog.slug, data, imageFile);
            onSaved(result?.message || (status === 'draft' ? 'Draft saved' : 'Blog published'));
        } catch (err) {
            setServerErrors(err.errors?.length ? err.errors : [err.message]);
            setSaving('');
        }
    };

    const unpublish = () => {
        if (window.confirm('Unpublish this post? It will disappear from the website until you publish it again.')) save('draft');
    };

    // Built when Preview is clicked: the post as the public page would receive it.
    const openPreview = () => {
        const data = payload(isPublished ? 'published' : 'draft');
        const now = new Date().toISOString();
        setPreviewBlog({
            ...blog,
            ...data,
            image,
            imageWidth: imagePreview ? undefined : blog?.imageWidth,
            imageHeight: imagePreview ? undefined : blog?.imageHeight,
            category: data.category || 'General',
            author: data.author || 'AK Sales Team',
            publishedAt: data.publishedAt || blog?.publishedAt || now,
            updatedAt: now,
            content: [],
        });
    };
    const closePreview = useCallback(() => setPreviewBlog(null), []);

    const titleLength = form.title.trim().length;
    const excerptWords = wordCount(form.excerpt);
    const slugValid = SLUG.test(form.slug) && form.slug.length <= MAX_SLUG;
    const busy = Boolean(saving);

    return (
        <div className="animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-accent">
                        {isNew ? 'New post' : isPublished ? 'Published post' : 'Draft'}
                    </p>
                    <h3 className="text-2xl font-bold text-white">{form.title.trim() || 'Untitled post'}</h3>
                </div>
                <button type="button" onClick={onCancel} disabled={busy} className={ghostButton}>Cancel</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-8 items-start">
                <form className="space-y-8 min-w-0" onSubmit={(e) => e.preventDefault()} noValidate>
                    <Section title="Content">
                        <div>
                            <FieldLabel htmlFor="blog-title" counter={<Counter value={titleLength} range={LIMITS.title} />}>Title (H1)</FieldLabel>
                            <input id="blog-title" type="text" value={form.title} onChange={setTitle} maxLength={150} className={inputClass} placeholder="e.g. How to Choose a Commercial Fryer for Your Restaurant" />
                        </div>

                        <div>
                            <FieldLabel htmlFor="blog-slug">URL slug</FieldLabel>
                            {slugLocked ? (
                                <>
                                    <input id="blog-slug" type="text" value={form.slug} readOnly className={`${inputClass} opacity-70 cursor-not-allowed`} />
                                    <p className={hintClass}>This post is published, so its address is fixed. Changing it would break links and lose its search ranking.</p>
                                </>
                            ) : (
                                <>
                                    <input id="blog-slug" type="text" value={form.slug} onChange={setSlug} maxLength={MAX_SLUG} className={inputClass} placeholder="how-to-choose-a-commercial-fryer" aria-invalid={form.slug !== '' && !slugValid} />
                                    <p className={hintClass}>
                                        Made from the title until you edit it. Lowercase letters, numbers and hyphens only. It can't change after publishing.
                                    </p>
                                </>
                            )}
                            <p className="text-xs text-gray-300 mt-1 break-all">
                                {SITE}/blog/<span className={slugValid ? 'text-accent' : 'text-amber-300'}>{form.slug || '…'}</span>
                            </p>
                        </div>

                        <div>
                            <FieldLabel htmlFor="blog-excerpt" counter={<Counter value={excerptWords} range={LIMITS.excerptWords} unit=" words" />}>Summary / quick answer</FieldLabel>
                            <textarea id="blog-excerpt" rows={4} value={form.excerpt} onChange={set('excerpt')} maxLength={600} className={`${inputClass} resize-y`} placeholder="Answer the main question of the post in 40–60 words." />
                            <p className={hintClass}>Shown at the top of the post. Answer the reader's main question in 40–60 words, in a way that makes sense on its own; search engines and AI tools often quote it.</p>
                        </div>

                        <div>
                            <p className={labelClass}>Article body</p>
                            <RichTextEditor value={form.body} onChange={setBody} onUploadImage={uploadBlogImage} />
                            <p className={hintClass}>The title is the page's only H1, so start sections with H2 and use H3/H4 inside them. Question-style headings work well.</p>
                        </div>

                        <FaqFields
                            faqs={form.faqs}
                            onChange={setFaqs}
                            emptyHint="No FAQs yet. Short questions with direct answers help AI search tools quote the post."
                            questionPlaceholder="e.g. How much gas does a commercial fryer use?"
                            answerPlaceholder="A direct answer in two or three sentences."
                        />
                    </Section>

                    <Section title="Featured image">
                        <div className="flex flex-col sm:flex-row gap-6">
                            <div className="sm:w-56 shrink-0 aspect-video rounded-xl overflow-hidden border border-white/10 bg-secondary/50 flex items-center justify-center">
                                {image ? <img src={image} alt="" className="w-full h-full object-cover" /> : <span className="text-xs text-gray-500">No image yet</span>}
                            </div>
                            <div className="flex-1 space-y-4">
                                <div>
                                    <label htmlFor="blog-image" className={labelClass}>{image ? 'Replace image' : 'Image file'}</label>
                                    <input id="blog-image" type="file" accept={IMAGE_TYPES.join(',')} onChange={chooseImage} className={fileInputClass} />
                                    <p className={hintClass}>JPEG, PNG, WebP or AVIF, up to 5 MB. Landscape images around 1600 px wide work best.</p>
                                    {imageError && <p role="alert" className="text-sm text-red-300 mt-2">{imageError}</p>}
                                </div>
                            </div>
                        </div>
                        <div>
                            <FieldLabel htmlFor="blog-image-alt" counter={<Counter value={form.imageAlt.trim().length} max={LIMITS.imageAlt} />}>Alt text (required to publish)</FieldLabel>
                            <input id="blog-image-alt" type="text" value={form.imageAlt} onChange={set('imageAlt')} maxLength={200} className={inputClass} placeholder="e.g. Stainless steel commercial kitchen with a six-burner range" />
                            <p className={hintClass}>Describe what the image shows for someone who can't see it. Keep it under 125 characters and don't stuff keywords.</p>
                        </div>
                    </Section>

                    <Section title="SEO">
                        <div>
                            <FieldLabel htmlFor="blog-seo-title" counter={<Counter value={blogSeoTitle(post).length} range={LIMITS.seoTitle} />}>SEO title</FieldLabel>
                            <input id="blog-seo-title" type="text" value={form.seoTitle} onChange={set('seoTitle')} maxLength={120} className={inputClass} placeholder={blogSeoTitle({ title: form.title })} />
                            <p className={hintClass}>The blue headline in Google results. Leave empty to use the title shown as the placeholder.</p>
                        </div>
                        <div>
                            <FieldLabel htmlFor="blog-meta" counter={<Counter value={form.metaDescription.trim().length} range={LIMITS.metaDescription} />}>Meta description</FieldLabel>
                            <textarea id="blog-meta" rows={3} value={form.metaDescription} onChange={set('metaDescription')} maxLength={300} className={`${inputClass} resize-y`} placeholder="Leave empty to use the summary." />
                        </div>
                        <div>
                            <FieldLabel htmlFor="blog-keyword">Focus keyword</FieldLabel>
                            <input id="blog-keyword" type="text" value={form.focusKeyword} onChange={set('focusKeyword')} maxLength={80} className={inputClass} placeholder="e.g. commercial fryer" />
                            <p className={hintClass}>Only used for the checklist on this page. It is never published.</p>
                        </div>
                    </Section>

                    <Section title="Details">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="blog-category" className={labelClass}>Category</label>
                                <input id="blog-category" type="text" list="blog-category-options" value={form.category} onChange={set('category')} maxLength={60} className={inputClass} placeholder="e.g. Guide" />
                                <datalist id="blog-category-options">
                                    {categories.map((category) => <option key={category} value={category} />)}
                                </datalist>
                            </div>
                            <div>
                                <label htmlFor="blog-tags" className={labelClass}>Tags</label>
                                <input id="blog-tags" type="text" value={form.tags} onChange={set('tags')} className={inputClass} placeholder="fryers, restaurant kitchens" />
                                <p className={hintClass}>Separate tags with commas (up to 10).</p>
                            </div>
                            <div>
                                <label htmlFor="blog-author" className={labelClass}>Author</label>
                                <input id="blog-author" type="text" value={form.author} onChange={set('author')} maxLength={80} className={inputClass} />
                            </div>
                            <div>
                                <label htmlFor="blog-author-url" className={labelClass}>Author profile URL</label>
                                <input id="blog-author-url" type="url" value={form.authorUrl} onChange={set('authorUrl')} className={inputClass} placeholder="https://aksales.in/about" />
                            </div>
                            <div className="md:col-span-2">
                                <label htmlFor="blog-author-bio" className={labelClass}>Author bio</label>
                                <textarea id="blog-author-bio" rows={3} value={form.authorBio} onChange={set('authorBio')} maxLength={500} className={`${inputClass} resize-y`} placeholder="One or two sentences on the author's experience with commercial kitchens." />
                            </div>
                            <div>
                                <label htmlFor="blog-date" className={labelClass}>Publish date</label>
                                <input id="blog-date" type="date" value={form.day} max={today()} onChange={(e) => setForm((prev) => ({ ...prev, day: e.target.value || today(), dayTouched: true }))} className={`${inputClass} [color-scheme:dark]`} />
                                {!form.dayTouched && !blog?.publishedAt && !blog?.date && <p className={hintClass}>Set when the post is first published unless you choose a date.</p>}
                            </div>
                        </div>
                    </Section>

                    <ErrorList title="The post was not saved:" errors={serverErrors} />

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
                        <div className="flex flex-wrap gap-3">
                            {isPublished ? (
                                <button type="button" onClick={unpublish} disabled={busy} className={ghostButton}>
                                    {saving === 'draft' ? 'Unpublishing…' : 'Unpublish to draft'}
                                </button>
                            ) : (
                                <button type="button" onClick={() => save('draft')} disabled={busy} className={ghostButton}>
                                    {saving === 'draft' ? 'Saving…' : 'Save draft'}
                                </button>
                            )}
                            <button type="button" onClick={openPreview} disabled={busy} className={ghostButton}>
                                <FaEye aria-hidden="true" /> Preview
                            </button>
                            <button type="button" onClick={() => save('published')} disabled={busy || blockers.length > 0} className={primaryButton} aria-describedby={blockers.length ? 'publish-blockers' : undefined}>
                                {saving === 'published' ? 'Saving…' : isPublished ? 'Update' : 'Publish'}
                            </button>
                            <button type="button" onClick={onCancel} disabled={busy} className={`${ghostButton} sm:ml-auto`}>Cancel</button>
                        </div>
                        {blockers.length > 0 && (
                            <div id="publish-blockers" className="text-sm text-amber-200">
                                <p className="font-medium">{isPublished ? 'Update' : 'Publish'} is unavailable until you:</p>
                                <ul className="list-disc pl-5 mt-1 space-y-0.5 text-amber-100/90">
                                    {blockers.map((item) => <li key={item.id}>{item.message}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                </form>

                <aside className="lg:sticky lg:top-6 bg-secondary/20 border border-white/5 rounded-2xl p-6" aria-label="SEO">
                    <SeoPanel title={blogSeoTitle(post)} url={`${SITE}/blog/${post.slug || 'your-post-url'}`} description={blogDescription(post)} checks={checks} />
                </aside>
            </div>

            {previewBlog && <PreviewModal blog={previewBlog} onClose={closePreview} />}
        </div>
    );
};

export default BlogEditor;
