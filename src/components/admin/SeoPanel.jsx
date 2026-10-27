import React, { useMemo } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaTimesCircle } from 'react-icons/fa';
import { blogSeoTitle, blogDescription } from '../../lib/blog-content';
import { analyzePost } from '../../lib/blog-seo-check';

const SITE = 'https://aksales.in';

const GROUPS = [
    { level: 'error', title: 'Must fix before publishing', Icon: FaTimesCircle, tone: 'text-red-400', box: 'border-red-400/20 bg-red-500/5' },
    { level: 'warn', title: 'Worth improving', Icon: FaExclamationTriangle, tone: 'text-amber-300', box: 'border-amber-300/20 bg-amber-400/5' },
    { level: 'ok', title: 'Looks good', Icon: FaCheckCircle, tone: 'text-emerald-400', box: 'border-emerald-400/15 bg-emerald-500/5' },
];

const CheckList = ({ items, icon, tone }) => {
    const Icon = icon;
    return (
        <ul className="space-y-2 mt-3">
            {items.map((item) => (
                <li key={item.id} className="flex gap-2 text-sm text-gray-300 leading-snug">
                    <Icon className={`${tone} mt-0.5 shrink-0`} aria-hidden="true" />
                    <span>{item.message}</span>
                </li>
            ))}
        </ul>
    );
};

/** Google-style snippet preview plus the live SEO/AEO checklist for a post. */
const SeoPanel = ({ post }) => {
    const checks = useMemo(() => analyzePost(post), [post]);
    const title = blogSeoTitle(post);
    const description = blogDescription(post);
    const slug = post.slug || 'your-post-url';

    return (
        <div className="space-y-6">
            <section aria-labelledby="snippet-heading">
                <h3 id="snippet-heading" className="text-sm font-bold uppercase tracking-wider text-accent mb-3">Google preview</h3>
                <div className="rounded-xl bg-white p-4 shadow-lg font-sans">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] font-bold text-secondary">AK</span>
                        <span className="min-w-0">
                            <span className="block text-sm text-gray-900 leading-tight">AK Sales</span>
                            <span className="block text-xs text-gray-600 leading-tight truncate">{`${SITE}/blog/${slug}`}</span>
                        </span>
                    </div>
                    <p className="text-[#1a0dab] text-lg leading-snug line-clamp-1" title={title}>{title}</p>
                    <p className="text-sm text-gray-700 leading-snug line-clamp-2 mt-1">{description}</p>
                </div>
                <p className="text-xs text-gray-500 mt-2">Google may rewrite or shorten these; this shows what the page asks for.</p>
            </section>

            <section aria-labelledby="checklist-heading" className="space-y-3">
                <h3 id="checklist-heading" className="text-sm font-bold uppercase tracking-wider text-accent">SEO checklist</h3>
                {GROUPS.map(({ level, title: groupTitle, Icon, tone, box }) => {
                    const items = checks.filter((item) => item.level === level);
                    if (!items.length) return null;
                    const heading = (
                        <span className={`flex items-center gap-2 text-sm font-bold ${tone}`}>
                            <Icon aria-hidden="true" />
                            {groupTitle} ({items.length})
                        </span>
                    );
                    return level === 'ok' ? (
                        <details key={level} className={`rounded-xl border p-4 ${box}`}>
                            <summary className="cursor-pointer list-none">{heading}</summary>
                            <CheckList items={items} icon={Icon} tone={tone} />
                        </details>
                    ) : (
                        <div key={level} className={`rounded-xl border p-4 ${box}`}>
                            {heading}
                            <CheckList items={items} icon={Icon} tone={tone} />
                        </div>
                    );
                })}
            </section>
        </div>
    );
};

export default SeoPanel;
