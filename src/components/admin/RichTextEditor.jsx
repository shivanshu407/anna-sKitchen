import React, { useEffect, useRef, useState } from 'react';
import { useEditor, useEditorState, EditorContent, mergeAttributes } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import {
    FaBold, FaItalic, FaLink, FaListUl, FaListOl, FaQuoteRight, FaMinus, FaTable,
    FaImage, FaUndo, FaRedo, FaRemoveFormat, FaParagraph,
} from 'react-icons/fa';

// The schema mirrors the server allowlist in server/blog-input.js: H2-H4,
// bold/italic/link, lists, quotes, tables, block images with alt + caption.
const BlogImage = Image.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            caption: {
                default: '',
                parseHTML: (element) => element.getAttribute('data-caption') || '',
                renderHTML: () => ({}),
            },
        };
    },
    renderHTML({ node, HTMLAttributes }) {
        const img = ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
        return node.attrs.caption ? ['figure', {}, img, ['figcaption', {}, node.attrs.caption]] : img;
    },
});

const EXTENSIONS = [
    StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        code: false,
        codeBlock: false,
        strike: false,
        underline: false,
        link: {
            openOnClick: false,
            autolink: true,
            HTMLAttributes: { target: null, rel: null },
        },
    }),
    BlogImage.configure({ inline: false, allowBase64: false }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader.extend({ content: 'paragraph+' }),
    TableCell.extend({ content: '(paragraph | bulletList | orderedList)+' }),
];

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALT_LIMIT = 125;
const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };

const inputClass = 'w-full px-3 py-2 border border-white/10 rounded-lg bg-secondary/60 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent';
const smallButton = 'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const primaryButton = `${smallButton} bg-accent text-secondary hover:bg-white`;
const ghostButton = `${smallButton} border border-white/15 text-gray-200 hover:bg-white/10`;

const CONTENT_CSS = `
.rte-content { min-height: 360px; padding: 1.25rem 1.5rem; outline: none; color: #e5e7eb; line-height: 1.7; }
.rte-content > * + * { margin-top: 0.85em; }
.rte-content h2 { font-size: 1.6rem; font-weight: 700; color: #fff; margin-top: 1.4em; border-left: 3px solid var(--color-accent); padding-left: 0.6rem; }
.rte-content h3 { font-size: 1.3rem; font-weight: 700; color: #fff; margin-top: 1.2em; }
.rte-content h4 { font-size: 1.1rem; font-weight: 600; color: #f3f4f6; margin-top: 1em; }
.rte-content h2::before, .rte-content h3::before, .rte-content h4::before { font-size: 0.65rem; font-weight: 700; color: var(--color-accent); margin-right: 0.5rem; vertical-align: middle; opacity: 0.8; }
.rte-content h2::before { content: 'H2'; }
.rte-content h3::before { content: 'H3'; }
.rte-content h4::before { content: 'H4'; }
.rte-content strong { color: #fff; }
.rte-content a { color: var(--color-accent); text-decoration: underline; }
.rte-content ul { list-style: disc; padding-left: 1.5rem; }
.rte-content ol { list-style: decimal; padding-left: 1.5rem; }
.rte-content li > * + * { margin-top: 0.35em; }
.rte-content blockquote { border-left: 4px solid var(--color-accent); padding: 0.25rem 0 0.25rem 1rem; color: #d1d5db; font-style: italic; }
.rte-content hr { border: 0; border-top: 2px dashed rgba(255,255,255,0.2); margin: 1.5rem 0; }
.rte-content hr.ProseMirror-selectednode { border-top-color: var(--color-accent); }
.rte-content table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.rte-content th, .rte-content td { border: 1px solid rgba(255,255,255,0.2); padding: 0.4rem 0.6rem; vertical-align: top; }
.rte-content th { background: rgba(255,255,255,0.08); color: #fff; font-weight: 700; text-align: left; }
.rte-content .selectedCell { background: rgba(212,175,55,0.15); }
.rte-content .tableWrapper { overflow-x: auto; }
.rte-content img { display: block; max-width: 100%; height: auto; border-radius: 0.75rem; }
.rte-content figure { margin: 0; }
.rte-content figcaption { font-size: 0.85rem; color: #9ca3af; margin-top: 0.4rem; text-align: center; }
.rte-content img.ProseMirror-selectednode, .rte-content figure.ProseMirror-selectednode img { outline: 3px solid var(--color-accent); outline-offset: 2px; }
`;

const ToolButton = ({ label, onClick, active, disabled, children }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        title={label}
        aria-pressed={active === undefined ? undefined : active}
        className={`min-w-9 h-9 px-2 rounded-lg flex items-center justify-center text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${active ? 'bg-accent text-secondary' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}
    >
        {children}
    </button>
);

const Divider = () => <span className="w-px h-6 bg-white/10 mx-1" aria-hidden="true" />;

function selectToolbarState(e) {
    const image = e.isActive('image');
    const link = e.getAttributes('link');
    return {
        paragraph: e.isActive('paragraph'),
        h2: e.isActive('heading', { level: 2 }),
        h3: e.isActive('heading', { level: 3 }),
        h4: e.isActive('heading', { level: 4 }),
        bold: e.isActive('bold'),
        italic: e.isActive('italic'),
        link: e.isActive('link'),
        linkHref: link.href || '',
        linkNofollow: /nofollow/.test(link.rel || ''),
        bulletList: e.isActive('bulletList'),
        orderedList: e.isActive('orderedList'),
        blockquote: e.isActive('blockquote'),
        table: e.isActive('table'),
        image,
        imageAttrs: image ? e.getAttributes('image') : null,
        imagePos: image ? e.state.selection.from : -1,
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
    };
}

function normaliseHref(value) {
    const href = value.trim();
    if (!href) return '';
    if (/^(https?:|mailto:|tel:|\/|#)/i.test(href)) return href;
    if (/^[\w.-]+@[\w.-]+\.\w+$/.test(href)) return `mailto:${href}`;
    return `https://${href}`;
}

const LinkDialog = ({ initialHref, initialNofollow, onApply, onRemove, onCancel }) => {
    const [href, setHref] = useState(initialHref);
    const [nofollow, setNofollow] = useState(initialNofollow);
    const submit = () => onApply(normaliseHref(href), nofollow);

    return (
        <div role="dialog" aria-label="Link" className="border-b border-white/10 bg-secondary/80 p-4 space-y-3">
            <label className="block text-xs font-bold text-gray-300">
                Link address
                <input
                    type="text"
                    value={href}
                    autoFocus
                    onChange={(e) => setHref(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); submit(); }
                        if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
                    }}
                    placeholder="https://example.com or /collections"
                    className={`${inputClass} mt-1`}
                />
            </label>
            <p className="text-xs text-gray-400">
                Use a full address (https://…) for other websites, or a path such as /collections for pages on this site.
            </p>
            <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" checked={nofollow} onChange={(e) => setNofollow(e.target.checked)} className="accent-[var(--color-accent)]" />
                nofollow (sponsored/untrusted)
            </label>
            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={submit} disabled={!href.trim()} className={primaryButton}>Apply link</button>
                {initialHref && <button type="button" onClick={onRemove} className={ghostButton}>Remove link</button>}
                <button type="button" onClick={onCancel} className={ghostButton}>Cancel</button>
            </div>
        </div>
    );
};

const AltField = ({ value, onChange, autoFocus }) => (
    <label className="block text-xs font-bold text-gray-300">
        Alt text (required)
        <input
            type="text"
            value={value}
            autoFocus={autoFocus}
            maxLength={300}
            onChange={(e) => onChange(e.target.value)}
            className={`${inputClass} mt-1`}
            placeholder="e.g. Four-burner gas range with stainless steel splashback"
        />
        <span className="mt-1 flex justify-between gap-4 font-normal text-gray-400">
            <span>Describe what the image shows for someone who can't see it. Keep it under 125 characters and don't stuff keywords.</span>
            <span className={value.trim().length > ALT_LIMIT ? 'text-amber-300' : ''}>{value.trim().length}/{ALT_LIMIT}</span>
        </span>
    </label>
);

const ImageDialog = ({ preview, onUpload, onCancel }) => {
    const [alt, setAlt] = useState('');
    const [caption, setCaption] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const submit = async () => {
        if (!alt.trim()) { setError('Add alt text before inserting the image.'); return; }
        setBusy(true);
        setError('');
        try {
            await onUpload(alt.trim(), caption.trim());
        } catch (err) {
            setError(err.message || 'The image could not be uploaded.');
            setBusy(false);
        }
    };

    return (
        <div role="dialog" aria-label="Insert image" className="border-b border-white/10 bg-secondary/80 p-4">
            <div className="flex flex-col sm:flex-row gap-4">
                {preview && <img src={preview} alt="" className="w-full sm:w-40 h-28 object-cover rounded-lg border border-white/10" />}
                <div className="flex-1 space-y-3">
                    <AltField value={alt} onChange={setAlt} autoFocus />
                    <label className="block text-xs font-bold text-gray-300">
                        Caption (optional, shown under the image)
                        <input type="text" value={caption} maxLength={500} onChange={(e) => setCaption(e.target.value)} className={`${inputClass} mt-1`} />
                    </label>
                    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
                    <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={submit} disabled={busy || !alt.trim()} className={primaryButton}>
                            {busy ? 'Uploading…' : 'Upload and insert'}
                        </button>
                        <button type="button" onClick={onCancel} disabled={busy} className={ghostButton}>Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ImageDetails = ({ attrs, onSave }) => {
    const [alt, setAlt] = useState(attrs.alt || '');
    const [caption, setCaption] = useState(attrs.caption || '');
    const changed = alt !== (attrs.alt || '') || caption !== (attrs.caption || '');

    return (
        <div aria-label="Selected image" role="group" className="border-b border-white/10 bg-white/5 p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-accent">Selected image</p>
            <AltField value={alt} onChange={setAlt} />
            <label className="block text-xs font-bold text-gray-300">
                Caption
                <input type="text" value={caption} maxLength={500} onChange={(e) => setCaption(e.target.value)} className={`${inputClass} mt-1`} />
            </label>
            <button type="button" disabled={!changed || !alt.trim()} onClick={() => onSave({ alt: alt.trim(), caption: caption.trim() })} className={primaryButton}>
                Save image details
            </button>
        </div>
    );
};

/**
 * TipTap editor for the blog body. `value` is the initial TipTap document; the
 * editor owns the content after mount, so remount it (with a key) to load another post.
 */
const RichTextEditor = ({ value, onChange, onUploadImage }) => {
    const onChangeRef = useRef(onChange);
    const fileInputRef = useRef(null);
    const [panel, setPanel] = useState(null);
    const [pending, setPending] = useState(null);
    const pendingUrlRef = useRef('');
    const [fileError, setFileError] = useState('');

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => () => {
        if (pendingUrlRef.current) URL.revokeObjectURL(pendingUrlRef.current);
    }, []);

    const editor = useEditor({
        extensions: EXTENSIONS,
        content: value?.type === 'doc' && value.content?.length ? value : EMPTY_DOC,
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: 'rte-content',
                'aria-label': 'Article body',
                'aria-multiline': 'true',
                role: 'textbox',
            },
        },
        onUpdate: ({ editor: current }) => onChangeRef.current?.(current.getJSON()),
    });

    const trackedState = useEditorState({
        editor,
        selector: ({ editor: e }) => (e ? selectToolbarState(e) : null),
    });

    if (!editor) {
        return <div className="min-h-[420px] rounded-xl border border-white/10 bg-secondary/40 animate-pulse" aria-label="Loading editor" />;
    }
    // useEditorState only refreshes on a transaction, and the editor is created
    // after the first render (immediatelyRender: false), so read it directly
    // until the first edit.
    const state = trackedState ?? selectToolbarState(editor);

    const chain = () => editor.chain().focus();
    const closePanel = () => {
        if (pendingUrlRef.current) URL.revokeObjectURL(pendingUrlRef.current);
        pendingUrlRef.current = '';
        setPanel(null);
        setPending(null);
    };

    const applyLink = (href, nofollow) => {
        const attrs = { href, rel: nofollow ? 'nofollow' : null };
        if (editor.state.selection.empty && !editor.isActive('link')) {
            chain().insertContent({ type: 'text', text: href, marks: [{ type: 'link', attrs }] }).run();
        } else {
            chain().extendMarkRange('link').setLink(attrs).run();
        }
        closePanel();
    };

    const removeLink = () => {
        chain().extendMarkRange('link').unsetLink().run();
        closePanel();
    };

    const chooseImage = (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;
        if (!IMAGE_TYPES.includes(file.type)) { setFileError('Images must be JPEG, PNG, WebP or AVIF files.'); return; }
        if (file.size > MAX_IMAGE_BYTES) { setFileError('Images must be 5 MB or smaller.'); return; }
        setFileError('');
        if (pendingUrlRef.current) URL.revokeObjectURL(pendingUrlRef.current);
        pendingUrlRef.current = URL.createObjectURL(file);
        setPending({ file, preview: pendingUrlRef.current });
        setPanel('image');
    };

    const uploadAndInsert = async (alt, caption) => {
        const { url, width, height } = await onUploadImage(pending.file, alt);
        chain().insertContent({ type: 'image', attrs: { src: url, alt, caption, width: width || null, height: height || null } }).run();
        closePanel();
    };

    return (
        <div className="rounded-xl border border-white/10 bg-secondary/40 focus-within:border-accent/50 transition-colors">
            <style>{CONTENT_CSS}</style>
            <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-1 border-b border-white/10 bg-secondary p-2 rounded-t-xl sticky top-0 z-10">
                <ToolButton label="Paragraph" active={state.paragraph} onClick={() => chain().setParagraph().run()}><FaParagraph /></ToolButton>
                <ToolButton label="Heading 2" active={state.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}>H2</ToolButton>
                <ToolButton label="Heading 3" active={state.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()}>H3</ToolButton>
                <ToolButton label="Heading 4" active={state.h4} onClick={() => chain().toggleHeading({ level: 4 }).run()}>H4</ToolButton>
                <Divider />
                <ToolButton label="Bold" active={state.bold} onClick={() => chain().toggleBold().run()}><FaBold /></ToolButton>
                <ToolButton label="Italic" active={state.italic} onClick={() => chain().toggleItalic().run()}><FaItalic /></ToolButton>
                <ToolButton label="Link" active={state.link || panel === 'link'} onClick={() => setPanel(panel === 'link' ? null : 'link')}><FaLink /></ToolButton>
                <Divider />
                <ToolButton label="Bullet list" active={state.bulletList} onClick={() => chain().toggleBulletList().run()}><FaListUl /></ToolButton>
                <ToolButton label="Numbered list" active={state.orderedList} onClick={() => chain().toggleOrderedList().run()}><FaListOl /></ToolButton>
                <ToolButton label="Quote" active={state.blockquote} onClick={() => chain().toggleBlockquote().run()}><FaQuoteRight /></ToolButton>
                <ToolButton label="Divider" onClick={() => chain().setHorizontalRule().run()}><FaMinus /></ToolButton>
                <Divider />
                <ToolButton label="Insert table (3×3 with header row)" active={state.table} disabled={state.table} onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><FaTable /></ToolButton>
                <ToolButton label="Insert image" onClick={() => fileInputRef.current?.click()}><FaImage /></ToolButton>
                <input ref={fileInputRef} type="file" accept={IMAGE_TYPES.join(',')} onChange={chooseImage} className="hidden" tabIndex={-1} aria-hidden="true" />
                <Divider />
                <ToolButton label="Undo" disabled={!state.canUndo} onClick={() => chain().undo().run()}><FaUndo /></ToolButton>
                <ToolButton label="Redo" disabled={!state.canRedo} onClick={() => chain().redo().run()}><FaRedo /></ToolButton>
                <ToolButton label="Clear formatting" onClick={() => chain().unsetAllMarks().clearNodes().run()}><FaRemoveFormat /></ToolButton>
            </div>

            {state.table && (
                <div role="toolbar" aria-label="Table" className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-white/5 px-3 py-2 text-xs">
                    <span className="font-bold text-accent uppercase tracking-wider mr-1">Table</span>
                    <button type="button" className={ghostButton} onClick={() => chain().addRowAfter().run()}>+ Row</button>
                    <button type="button" className={ghostButton} onClick={() => chain().deleteRow().run()}>− Row</button>
                    <button type="button" className={ghostButton} onClick={() => chain().addColumnAfter().run()}>+ Column</button>
                    <button type="button" className={ghostButton} onClick={() => chain().deleteColumn().run()}>− Column</button>
                    <button type="button" className={`${smallButton} border border-red-400/30 text-red-300 hover:bg-red-500/10`} onClick={() => chain().deleteTable().run()}>Delete table</button>
                </div>
            )}

            {fileError && <p role="alert" className="border-b border-white/10 bg-red-500/10 px-4 py-2 text-sm text-red-300">{fileError}</p>}

            {panel === 'link' && (
                <LinkDialog
                    initialHref={state.linkHref}
                    initialNofollow={state.linkNofollow}
                    onApply={applyLink}
                    onRemove={removeLink}
                    onCancel={closePanel}
                />
            )}
            {panel === 'image' && pending && (
                <ImageDialog preview={pending.preview} onUpload={uploadAndInsert} onCancel={closePanel} />
            )}
            {state.image && panel !== 'image' && (
                <ImageDetails
                    key={`${state.imagePos}:${state.imageAttrs.src}`}
                    attrs={state.imageAttrs}
                    onSave={(attrs) => chain().updateAttributes('image', attrs).run()}
                />
            )}

            <EditorContent editor={editor} />
        </div>
    );
};

export default RichTextEditor;
