import React, { useMemo, useState } from 'react';
import RichTextEditor from './RichTextEditor';
import { SnippetPreview } from './SeoPanel';
import {
    inputClass, labelClass, hintClass, primaryButton, ghostButton,
    Counter, FieldLabel, Section, FaqFields, ErrorList,
} from './FormParts';
import { EMPTY_DOC, completeFaqs } from './form-helpers';
import { updateCategory, uploadProductImage } from '../../api/products';
import { wordCount } from '../../lib/blog-content';

const SITE = 'https://aksales.in';
const LIMITS = { descriptionWords: [30, 80], seoTitle: [30, 60], metaDescription: [120, 160] };

// The fallbacks match the category page in src/lib/seo.js.
const defaultTitle = (title) => `${title} Equipment | AK Sales Surat`;
const defaultDescription = (title) => `Explore ${title.toLowerCase()} equipment from AK Sales in Surat. Compare commercial kitchen products and contact our team for specifications and a quote.`;

function initialForm(category) {
    const body = category?.body;
    return {
        title: category?.title || '',
        description: category?.description || '',
        seoTitle: category?.seoTitle || '',
        metaDescription: category?.metaDescription || '',
        body: body?.type === 'doc' && body.content?.length ? body : EMPTY_DOC,
        faqs: (category?.faqs || []).map((faq) => ({ question: faq.question || '', answer: faq.answer || '' })),
    };
}

/**
 * Edit a category page: its title, intro, search snippet, buying guide and
 * FAQs. The slug (address) never changes. Calls onSaved(message) after saving.
 */
const CategoryEditor = ({ categoryKey, category, onSaved, onCancel }) => {
    const [form, setForm] = useState(() => initialForm(category));
    const [serverErrors, setServerErrors] = useState([]);
    const [saving, setSaving] = useState(false);

    const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
    const title = form.title.trim();
    const faqs = useMemo(() => completeFaqs(form.faqs), [form.faqs]);
    const searchTitle = form.seoTitle.trim() || defaultTitle(title);
    const searchDescription = form.metaDescription.trim() || defaultDescription(title);

    const save = async () => {
        if (!title) { setServerErrors(['Add the category name.']); return; }
        setSaving(true);
        setServerErrors([]);
        try {
            const result = await updateCategory(categoryKey, {
                title,
                description: form.description.trim(),
                seoTitle: form.seoTitle.trim(),
                metaDescription: form.metaDescription.trim(),
                body: form.body,
                faqs,
            });
            onSaved(result?.message || `Updated the ${title} category.`);
        } catch (err) {
            setServerErrors(err.errors?.length ? err.errors : [err.message]);
            setSaving(false);
        }
    };

    return (
        <div className="animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-accent">Edit category</p>
                    <h3 className="text-2xl font-bold text-white">{title || 'Untitled category'}</h3>
                </div>
                <button type="button" onClick={onCancel} disabled={saving} className={ghostButton}>Cancel</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-8 items-start">
                <form className="space-y-8 min-w-0" onSubmit={(e) => e.preventDefault()} noValidate>
                    <Section title="Category page">
                        <div>
                            <FieldLabel htmlFor="category-title">Category name (main heading)</FieldLabel>
                            <input id="category-title" type="text" value={form.title} onChange={set('title')} maxLength={80} className={inputClass} placeholder="e.g. Heating Range" />
                        </div>
                        <div>
                            <p className={labelClass}>Web address</p>
                            <p className="text-sm text-gray-300 break-all rounded-xl border border-white/10 bg-secondary/40 px-4 py-3">
                                {SITE}/collections/<span className="text-accent">{categoryKey}</span>
                            </p>
                            <p className={hintClass}>The address of a category is fixed so existing links keep working.</p>
                        </div>
                        <div>
                            <FieldLabel htmlFor="category-description" counter={<Counter value={wordCount(form.description)} range={LIMITS.descriptionWords} unit=" words" />}>Intro text</FieldLabel>
                            <textarea id="category-description" rows={4} value={form.description} onChange={set('description')} maxLength={1000} className={`${inputClass} resize-y`} placeholder="What this range covers and who it is for." />
                            <p className={hintClass}>Shown at the top of the category page, above the products.</p>
                        </div>
                    </Section>

                    <Section title="Buying guide">
                        <div>
                            <RichTextEditor value={form.body} onChange={(body) => setForm((prev) => ({ ...prev, body }))} onUploadImage={uploadProductImage} />
                            <p className={hintClass}>Shown below the products. Help buyers choose: sizes, materials, fuel types and what suits which kitchen. Start sections with H2.</p>
                        </div>
                        <FaqFields
                            faqs={form.faqs}
                            onChange={(list) => setForm((prev) => ({ ...prev, faqs: list }))}
                            emptyHint="No FAQs yet. Short questions with direct answers help AI search tools quote the page."
                            questionPlaceholder="e.g. Which material is best for a commercial kitchen?"
                            answerPlaceholder="A direct answer in two or three sentences."
                        />
                    </Section>

                    <Section title="SEO">
                        <div>
                            <FieldLabel htmlFor="category-seo-title" counter={<Counter value={searchTitle.length} range={LIMITS.seoTitle} />}>SEO title</FieldLabel>
                            <input id="category-seo-title" type="text" value={form.seoTitle} onChange={set('seoTitle')} maxLength={120} className={inputClass} placeholder={defaultTitle(title)} />
                            <p className={hintClass}>Leave empty to use the title shown as the placeholder.</p>
                        </div>
                        <div>
                            <FieldLabel htmlFor="category-meta" counter={<Counter value={form.metaDescription.trim().length} range={LIMITS.metaDescription} />}>Meta description</FieldLabel>
                            <textarea id="category-meta" rows={3} value={form.metaDescription} onChange={set('metaDescription')} maxLength={300} className={`${inputClass} resize-y`} placeholder="Leave empty to use a standard description." />
                        </div>
                    </Section>

                    <ErrorList title="The category was not saved:" errors={serverErrors} />

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
                        <div className="flex flex-wrap gap-3">
                            <button type="button" onClick={save} disabled={saving || !title} className={primaryButton}>
                                {saving ? 'Saving…' : 'Save category'}
                            </button>
                            <button type="button" onClick={onCancel} disabled={saving} className={`${ghostButton} sm:ml-auto`}>Cancel</button>
                        </div>
                        {!title && <p className="text-sm text-amber-200">Add the category name to save.</p>}
                    </div>
                </form>

                <aside className="lg:sticky lg:top-6 bg-secondary/20 border border-white/5 rounded-2xl p-6" aria-label="Search preview">
                    <SnippetPreview title={searchTitle} url={`${SITE}/collections/${categoryKey}`} description={searchDescription} />
                </aside>
            </div>
        </div>
    );
};

export default CategoryEditor;
