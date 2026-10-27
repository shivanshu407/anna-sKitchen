import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaPlus, FaTrash, FaImage } from 'react-icons/fa';
import RichTextEditor from './RichTextEditor';
import SeoPanel from './SeoPanel';
import {
    inputClass, fileInputClass, labelClass, hintClass, primaryButton, ghostButton, smallGhostButton,
    Counter, FieldLabel, Section, FaqFields, ErrorList,
} from './FormParts';
import { IMAGE_TYPES, EMPTY_DOC, imageFileError, completeFaqs } from './form-helpers';
import { addProduct, updateProduct, uploadProductImage } from '../../api/products';
import { slugify, wordCount } from '../../lib/blog-content';
import { categoryProducts, productSlug } from '../../lib/catalogue';
import { analyzeProduct, LIMITS, productDescription, productSeoTitle } from '../../lib/product-seo-check';

const SITE = 'https://aksales.in';
const NEW_CATEGORY = '__new-category__';
const MAX_SPECS = 30;
const SPEC_EXAMPLES = [
    ['Material', 'SS 304'],
    ['Dimensions', '1200 × 600 × 850 mm'],
    ['Burners', '3'],
    ['Capacity', '40 litres'],
    ['Power / Fuel', 'LPG / PNG'],
];

const autoSlug = (name) => slugify(name).slice(0, LIMITS.slug).replace(/-+$/, '');
const blankSpecs = () => SPEC_EXAMPLES.slice(0, 3).map(() => ({ label: '', value: '' }));

function initialForm(product, categoryKey, catalogue) {
    const keys = Object.keys(catalogue);
    const body = product?.body;
    const specs = (product?.specs || []).map((spec) => ({ label: spec.label || '', value: spec.value || '' }));
    return {
        category: keys.includes(categoryKey) ? categoryKey : (keys[0] || NEW_CATEGORY),
        newCategoryTitle: '',
        name: product?.name || '',
        // An existing product keeps its address unless the owner changes it by hand.
        slug: product ? productSlug(product) : '',
        slugTouched: Boolean(product),
        summary: product?.summary || '',
        // Legacy products have no alt text; the name is a fair starting point.
        imageAlt: product?.imageAlt || product?.name || '',
        gallery: (product?.gallery || []).map((item) => ({ src: item.src, alt: item.alt || '', width: item.width, height: item.height })),
        specs: specs.length ? specs : blankSpecs(),
        body: body?.type === 'doc' && body.content?.length ? body : EMPTY_DOC,
        faqs: (product?.faqs || []).map((faq) => ({ question: faq.question || '', answer: faq.answer || '' })),
        seoTitle: product?.seoTitle || '',
        metaDescription: product?.metaDescription || '',
        focusKeyword: product?.focusKeyword || '',
        modelNumber: product?.modelNumber || '',
    };
}

/** Asks for alt text, then uploads a gallery image. */
const GalleryUpload = ({ pending, onDone, onCancel }) => {
    const [alt, setAlt] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const submit = async () => {
        if (!alt.trim()) { setError('Add alt text before uploading the image.'); return; }
        setBusy(true);
        setError('');
        try {
            const { url, width, height } = await uploadProductImage(pending.file, alt.trim());
            onDone({ src: url, alt: alt.trim(), width, height });
        } catch (err) {
            setError(err.message || 'The image could not be uploaded.');
            setBusy(false);
        }
    };

    return (
        <div role="dialog" aria-label="Add gallery image" className="rounded-xl border border-accent/30 bg-secondary/60 p-4">
            <div className="flex flex-col sm:flex-row gap-4">
                <img src={pending.preview} alt="" className="w-full sm:w-40 h-28 object-contain bg-white rounded-lg border border-white/10" />
                <div className="flex-1 space-y-3">
                    <div>
                        <FieldLabel htmlFor="gallery-alt" counter={<Counter value={alt.trim().length} max={LIMITS.imageAlt} />}>Alt text (required)</FieldLabel>
                        <input
                            id="gallery-alt"
                            type="text"
                            value={alt}
                            autoFocus
                            maxLength={200}
                            onChange={(e) => setAlt(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
                            className={inputClass}
                            placeholder="e.g. Side view of the range showing the burner knobs"
                        />
                        <p className={hintClass}>Describe what this photo shows for someone who can't see it.</p>
                    </div>
                    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={submit} disabled={busy || !alt.trim()} className={primaryButton}>
                            {busy ? 'Uploading…' : 'Upload and add'}
                        </button>
                        <button type="button" onClick={onCancel} disabled={busy} className={ghostButton}>Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * Add (product = null) or edit a catalogue product. `catalogue` is the whole
 * { [categorySlug]: category } map, used for the category list and to keep
 * slugs unique. Calls onSaved(message, categorySlug) after a successful save.
 */
const ProductEditor = ({ product, categoryKey, catalogue = {}, onSaved, onCancel }) => {
    const [form, setForm] = useState(() => initialForm(product, categoryKey, catalogue));
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const previewRef = useRef('');
    const [imageError, setImageError] = useState('');
    const [pendingGallery, setPendingGallery] = useState(null);
    const pendingRef = useRef('');
    const galleryInputRef = useRef(null);
    const [serverErrors, setServerErrors] = useState([]);
    const [saving, setSaving] = useState(false);

    const isNew = !product;
    const originalSlug = product ? productSlug(product) : '';

    useEffect(() => () => {
        if (previewRef.current) URL.revokeObjectURL(previewRef.current);
        if (pendingRef.current) URL.revokeObjectURL(pendingRef.current);
    }, []);

    const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
    const setName = (e) => {
        const name = e.target.value;
        setForm((prev) => ({ ...prev, name, slug: prev.slugTouched ? prev.slug : autoSlug(name) }));
    };
    const setSlug = (e) => {
        const slug = e.target.value.toLowerCase().replace(/\s+/g, '-');
        setForm((prev) => ({ ...prev, slug, slugTouched: slug !== '' }));
    };
    const setBody = (body) => setForm((prev) => ({ ...prev, body }));
    const setList = (field, list) => setForm((prev) => ({ ...prev, [field]: list }));
    const setSpec = (index, key, value) => setList('specs', form.specs.map((spec, i) => (i === index ? { ...spec, [key]: value } : spec)));
    const setGalleryAlt = (index, alt) => setList('gallery', form.gallery.map((item, i) => (i === index ? { ...item, alt } : item)));

    const chooseImage = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const problem = imageFileError(file);
        if (problem) { setImageError(problem); e.target.value = ''; return; }
        if (previewRef.current) URL.revokeObjectURL(previewRef.current);
        previewRef.current = URL.createObjectURL(file);
        setImageError('');
        setImageFile(file);
        setImagePreview(previewRef.current);
    };

    const clearPending = () => {
        if (pendingRef.current) URL.revokeObjectURL(pendingRef.current);
        pendingRef.current = '';
        setPendingGallery(null);
    };

    const chooseGalleryImage = (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        const problem = imageFileError(file);
        if (problem) { setImageError(problem); return; }
        setImageError('');
        clearPending();
        pendingRef.current = URL.createObjectURL(file);
        setPendingGallery({ file, preview: pendingRef.current });
    };

    const addGalleryImage = (item) => {
        setForm((prev) => ({ ...prev, gallery: [...prev.gallery, item].slice(0, LIMITS.gallery) }));
        clearPending();
    };

    const isNewCategory = form.category === NEW_CATEGORY;
    const categorySlug = isNewCategory ? slugify(form.newCategoryTitle) : form.category;
    const categoryTitle = isNewCategory ? form.newCategoryTitle.trim() : (catalogue[form.category]?.title || '');
    const moved = !isNew && form.category !== categoryKey;
    const image = imagePreview || product?.image || '';

    // Every other product's current slug. Old slugs can be reused; the server
    // removes them from the product that held them.
    const takenSlugs = useMemo(() => {
        const all = Object.values(catalogue).flatMap(categoryProducts);
        const own = categoryProducts(catalogue[categoryKey]);
        const self = product && (all.find((item) => item === product) || own.find((item) => productSlug(item) === originalSlug));
        return all.filter((item) => item !== self).map(productSlug);
    }, [catalogue, product, categoryKey, originalSlug]);

    const draft = useMemo(() => ({
        name: form.name.trim(),
        slug: form.slug.trim(),
        summary: form.summary.trim(),
        image,
        imageAlt: form.imageAlt.trim(),
        gallery: form.gallery.map((item) => ({ ...item, alt: item.alt.trim() })),
        specs: form.specs
            .map((spec) => ({ label: spec.label.trim(), value: spec.value.trim() }))
            .filter((spec) => spec.label && spec.value),
        body: form.body,
        faqs: completeFaqs(form.faqs),
        seoTitle: form.seoTitle.trim(),
        metaDescription: form.metaDescription.trim(),
        focusKeyword: form.focusKeyword.trim(),
        modelNumber: form.modelNumber.trim(),
    }), [form, image]);

    const checks = useMemo(() => analyzeProduct(draft, takenSlugs), [draft, takenSlugs]);
    const blockers = [
        ...(isNewCategory && !categorySlug ? [{ id: 'category', message: 'Name the new category.' }] : []),
        ...checks.filter((item) => item.level === 'error'),
    ];

    const save = async () => {
        if (blockers.length) { setServerErrors(blockers.map((item) => item.message)); return; }
        setSaving(true);
        setServerErrors([]);
        const payload = { ...draft, categorySlug, categoryTitle: isNewCategory ? categoryTitle : '' };
        try {
            const result = isNew
                ? await addProduct(payload, imageFile)
                : await updateProduct(categoryKey, originalSlug, payload, imageFile);
            onSaved(result?.message || (isNew ? `Added "${draft.name}" to the catalogue.` : `Updated "${draft.name}".`), categorySlug);
        } catch (err) {
            setServerErrors(err.errors?.length ? err.errors : [err.message]);
            setSaving(false);
        }
    };

    const url = `${SITE}/collections/${categorySlug || '…'}/${draft.slug || '…'}`;
    const slugValid = !checks.some((item) => item.id === 'slug' && item.level === 'error');
    const sameCategoryExists = isNewCategory && categorySlug && Object.hasOwn(catalogue, categorySlug);

    return (
        <div className="animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-accent">{isNew ? 'New product' : 'Edit product'}</p>
                    <h3 className="text-2xl font-bold text-white">{draft.name || 'Untitled product'}</h3>
                </div>
                <button type="button" onClick={onCancel} disabled={saving} className={ghostButton}>Cancel</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-8 items-start">
                <form className="space-y-8 min-w-0" onSubmit={(e) => e.preventDefault()} noValidate>
                    <Section title="Basics">
                        <div>
                            <label htmlFor="product-category" className={labelClass}>Category</label>
                            <select id="product-category" value={form.category} onChange={set('category')} className={`${inputClass} uppercase`}>
                                {Object.entries(catalogue).map(([key, category]) => (
                                    <option key={key} value={key}>{category.title}</option>
                                ))}
                                {isNew && <option value={NEW_CATEGORY}>+ New category</option>}
                            </select>
                            {moved && (
                                <p className="text-xs text-amber-200 mt-2">
                                    This product will move to {categoryTitle}. Its old address will redirect to the new one automatically.
                                </p>
                            )}
                        </div>

                        {isNewCategory && (
                            <div>
                                <label htmlFor="product-new-category" className="block text-sm font-medium text-accent mb-2">New category name</label>
                                <input id="product-new-category" type="text" value={form.newCategoryTitle} onChange={set('newCategoryTitle')} maxLength={80} className={inputClass} placeholder="e.g. Ovens & Grills" />
                                <p className={hintClass}>
                                    {sameCategoryExists
                                        ? 'A category with this address already exists, so the product will be added to it.'
                                        : `The category page will be ${SITE}/collections/${categorySlug || '…'}. You can add its description from Manage Products afterwards.`}
                                </p>
                            </div>
                        )}

                        <div>
                            <FieldLabel htmlFor="product-name" counter={<Counter value={form.name.trim().length} max={150} />}>Product name (main heading)</FieldLabel>
                            <input id="product-name" type="text" value={form.name} onChange={setName} maxLength={150} className={inputClass} placeholder="e.g. Three Burner Gas Range" />
                        </div>

                        <div>
                            <FieldLabel htmlFor="product-slug">URL slug</FieldLabel>
                            <input id="product-slug" type="text" value={form.slug} onChange={setSlug} maxLength={LIMITS.slug} className={inputClass} placeholder="three-burner-gas-range" aria-invalid={form.slug !== '' && !slugValid} />
                            <p className={hintClass}>
                                {isNew ? 'Made from the name until you edit it. ' : ''}Lowercase letters, numbers and hyphens only.
                            </p>
                            <p className="text-xs text-gray-300 mt-1 break-all">
                                {SITE}/collections/{categorySlug || '…'}/<span className={slugValid ? 'text-accent' : 'text-amber-300'}>{draft.slug || '…'}</span>
                            </p>
                            {!isNew && draft.slug && draft.slug !== originalSlug && (
                                <p className="text-xs text-amber-200 mt-1">The old address will redirect automatically.</p>
                            )}
                        </div>

                        <div>
                            <FieldLabel htmlFor="product-summary" counter={<Counter value={wordCount(form.summary)} range={LIMITS.summaryWords} unit=" words" />}>Short summary</FieldLabel>
                            <textarea id="product-summary" rows={3} value={form.summary} onChange={set('summary')} maxLength={320} className={`${inputClass} resize-y`} placeholder="e.g. A heavy-duty three burner gas range in SS 304 for restaurants, hotels and canteens." />
                            <p className={hintClass}>Answer what it is and who it's for in 1–2 sentences. Shown on the product page and used by Google when the meta description is empty.</p>
                        </div>
                    </Section>

                    <Section title="Images">
                        <div className="flex flex-col sm:flex-row gap-6">
                            <div className="sm:w-56 shrink-0 aspect-[4/3] rounded-xl overflow-hidden border border-white/10 bg-white flex items-center justify-center p-3">
                                {image ? <img src={image} alt="" className="w-full h-full object-contain" /> : <span className="text-xs text-gray-500">No image yet</span>}
                            </div>
                            <div className="flex-1">
                                <label htmlFor="product-image" className={labelClass}>{image ? 'Replace main image' : 'Main image'}</label>
                                <input id="product-image" type="file" accept={IMAGE_TYPES.join(',')} onChange={chooseImage} className={fileInputClass} />
                                <p className={hintClass}>JPEG, PNG, WebP or AVIF, up to 5 MB. A clear photo on a plain background works best.</p>
                            </div>
                        </div>
                        <div>
                            <FieldLabel htmlFor="product-image-alt" counter={<Counter value={form.imageAlt.trim().length} max={LIMITS.imageAlt} />}>Main image alt text (required)</FieldLabel>
                            <input id="product-image-alt" type="text" value={form.imageAlt} onChange={set('imageAlt')} maxLength={200} className={inputClass} placeholder="e.g. Three burner stainless steel gas range with pan supports" />
                            <p className={hintClass}>
                                Describe what the photo shows for someone who can't see it, in under 125 characters.
                                {!isNew && !product?.imageAlt ? ' It was filled in with the product name; a more specific description is better.' : ''}
                            </p>
                        </div>

                        <div>
                            <div className="flex items-center justify-between gap-4 mb-3">
                                <p className="text-sm font-medium text-gray-300">Gallery ({form.gallery.length}/{LIMITS.gallery})</p>
                                <button type="button" onClick={() => galleryInputRef.current?.click()} disabled={form.gallery.length >= LIMITS.gallery || Boolean(pendingGallery)} className={smallGhostButton}>
                                    <FaImage aria-hidden="true" /> Add photo
                                </button>
                                <input ref={galleryInputRef} type="file" accept={IMAGE_TYPES.join(',')} onChange={chooseGalleryImage} className="hidden" tabIndex={-1} aria-hidden="true" />
                            </div>
                            {imageError && <p role="alert" className="text-sm text-red-300 mb-3">{imageError}</p>}
                            {pendingGallery && <div className="mb-4"><GalleryUpload pending={pendingGallery} onDone={addGalleryImage} onCancel={clearPending} /></div>}
                            {form.gallery.length === 0 && !pendingGallery && <p className="text-sm text-gray-500 italic">No extra photos. Other angles, close-ups and the product in use help buyers decide.</p>}
                            <ul className="space-y-3">
                                {form.gallery.map((item, index) => (
                                    <li key={`${item.src}-${index}`} className="flex gap-3 items-center rounded-xl border border-white/10 bg-white/5 p-3">
                                        <img src={item.src} alt="" className="w-20 h-16 object-contain bg-white rounded-lg shrink-0" />
                                        <input type="text" aria-label={`Alt text for photo ${index + 1}`} value={item.alt} maxLength={200} onChange={(e) => setGalleryAlt(index, e.target.value)} className={inputClass} placeholder="Alt text (required)" />
                                        <button type="button" onClick={() => setList('gallery', form.gallery.filter((_, i) => i !== index))} aria-label={`Remove photo ${index + 1}`} title="Remove photo" className="text-gray-400 hover:text-red-300 p-2 shrink-0">
                                            <FaTrash className="text-xs" aria-hidden="true" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </Section>

                    <Section title="Specifications">
                        <p className="text-sm text-gray-400">Facts buyers compare, one per row. Empty rows are ignored.</p>
                        <div className="space-y-3">
                            {form.specs.map((spec, index) => {
                                const [labelExample, valueExample] = SPEC_EXAMPLES[index % SPEC_EXAMPLES.length];
                                return (
                                    <div key={index} className="flex gap-3 items-center">
                                        <input type="text" aria-label={`Specification ${index + 1} name`} value={spec.label} maxLength={60} onChange={(e) => setSpec(index, 'label', e.target.value)} className={`${inputClass} sm:w-2/5`} placeholder={`e.g. ${labelExample}`} />
                                        <input type="text" aria-label={`Specification ${index + 1} value`} value={spec.value} maxLength={200} onChange={(e) => setSpec(index, 'value', e.target.value)} className={inputClass} placeholder={`e.g. ${valueExample}`} />
                                        <button type="button" onClick={() => setList('specs', form.specs.filter((_, i) => i !== index))} aria-label={`Remove specification ${index + 1}`} title="Remove specification" className="text-gray-400 hover:text-red-300 p-2 shrink-0">
                                            <FaTrash className="text-xs" aria-hidden="true" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                        <button type="button" onClick={() => setList('specs', [...form.specs, { label: '', value: '' }])} disabled={form.specs.length >= MAX_SPECS} className={smallGhostButton}>
                            <FaPlus aria-hidden="true" /> Add specification
                        </button>
                    </Section>

                    <Section title="Description">
                        <div>
                            <RichTextEditor value={form.body} onChange={setBody} onUploadImage={uploadProductImage} />
                            <p className={hintClass}>The product name is the page's main heading, so start sections with H2. Cover uses, build quality, sizes and care.</p>
                        </div>
                        <FaqFields
                            faqs={form.faqs}
                            onChange={(list) => setList('faqs', list)}
                            emptyHint="No FAQs yet. Answer what buyers often ask, such as fuel type, installation or cleaning."
                            questionPlaceholder="e.g. Can this range run on PNG?"
                            answerPlaceholder="A direct answer in one or two sentences."
                        />
                    </Section>

                    <Section title="SEO">
                        <div>
                            <FieldLabel htmlFor="product-seo-title" counter={<Counter value={productSeoTitle(draft).length} range={LIMITS.seoTitle} />}>SEO title</FieldLabel>
                            <input id="product-seo-title" type="text" value={form.seoTitle} onChange={set('seoTitle')} maxLength={120} className={inputClass} placeholder={productSeoTitle({ name: form.name })} />
                            <p className={hintClass}>The blue headline in Google results. Leave empty to use the title shown as the placeholder.</p>
                        </div>
                        <div>
                            <FieldLabel htmlFor="product-meta" counter={<Counter value={form.metaDescription.trim().length} range={LIMITS.metaDescription} />}>Meta description</FieldLabel>
                            <textarea id="product-meta" rows={3} value={form.metaDescription} onChange={set('metaDescription')} maxLength={300} className={`${inputClass} resize-y`} placeholder="Leave empty to use the short summary." />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <FieldLabel htmlFor="product-keyword">Focus keyword</FieldLabel>
                                <input id="product-keyword" type="text" value={form.focusKeyword} onChange={set('focusKeyword')} maxLength={80} className={inputClass} placeholder="e.g. gas range" />
                                <p className={hintClass}>Only used for the checklist on this page. It is never published.</p>
                            </div>
                            <div>
                                <FieldLabel htmlFor="product-model">Model number (optional)</FieldLabel>
                                <input id="product-model" type="text" value={form.modelNumber} onChange={set('modelNumber')} maxLength={60} className={inputClass} placeholder="e.g. AKS-GR3" />
                                <p className={hintClass}>Leave empty if the product has no model number.</p>
                            </div>
                        </div>
                    </Section>

                    <ErrorList title="The product was not saved:" errors={serverErrors} />

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
                        <div className="flex flex-wrap gap-3">
                            <button type="button" onClick={save} disabled={saving || blockers.length > 0} className={primaryButton} aria-describedby={blockers.length ? 'product-blockers' : undefined}>
                                {saving ? 'Saving…' : isNew ? 'Add to catalogue' : 'Update'}
                            </button>
                            <button type="button" onClick={onCancel} disabled={saving} className={`${ghostButton} sm:ml-auto`}>Cancel</button>
                        </div>
                        {blockers.length > 0 && (
                            <div id="product-blockers" className="text-sm text-amber-200">
                                <p className="font-medium">{isNew ? 'Add to catalogue' : 'Update'} is unavailable until you:</p>
                                <ul className="list-disc pl-5 mt-1 space-y-0.5 text-amber-100/90">
                                    {blockers.map((item) => <li key={item.id}>{item.message}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                </form>

                <aside className="lg:sticky lg:top-6 bg-secondary/20 border border-white/5 rounded-2xl p-6" aria-label="SEO">
                    <SeoPanel
                        title={productSeoTitle(draft)}
                        url={url}
                        description={productDescription(draft, categoryTitle)}
                        checks={checks}
                        errorHeading="Must fix before saving"
                    />
                </aside>
            </div>
        </div>
    );
};

export default ProductEditor;
