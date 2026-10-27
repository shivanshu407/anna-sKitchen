import React from 'react';
import { Link } from 'react-router-dom';
import Image from './Image';
import { cloudinarySrcSet, headingsOf, nodeText, walkBody } from '../lib/blog-content';

// Renders a sanitized TipTap document (see server/blog-input.js) as React
// elements. Text is always passed as children, never as HTML, so stored content
// cannot inject markup.

const HEADINGS = {
    2: 'text-xl md:text-2xl font-bold text-secondary font-heading mt-10 scroll-mt-24',
    3: 'text-lg md:text-xl font-bold text-secondary font-heading mt-8 scroll-mt-24',
    4: 'text-base md:text-lg font-bold text-secondary font-heading mt-6 scroll-mt-24',
};
const LINK_CLASS = 'text-primary-dark font-semibold underline underline-offset-2 hover:text-primary transition-colors';
const IMAGE_SIZES = '(max-width: 896px) 100vw, 896px';

// Ids come from headingsOf, keyed by node, so the table of contents and the
// rendered headings always agree even if a node is skipped here.
function headingIds(body) {
    const nodes = [];
    walkBody(body, (node) => { if (node.type === 'heading') nodes.push(node); });
    const ids = new Map();
    headingsOf(body).forEach((heading, index) => ids.set(nodes[index], heading.id));
    return ids;
}

function renderLink(href, rel, children, key) {
    if (typeof href !== 'string') return children;
    if (/^\/(?![/\\])/.test(href)) return <Link key={key} to={href} className={LINK_CLASS}>{children}</Link>;
    if (href.startsWith('#')) return <a key={key} href={href} className={LINK_CLASS}>{children}</a>;
    if (/^(mailto|tel):/i.test(href)) return <a key={key} href={href} className={LINK_CLASS}>{children}</a>;
    if (!/^https?:\/\//i.test(href)) return children;
    return (
        <a key={key} href={href} target="_blank" rel={`noopener noreferrer${rel === 'nofollow' ? ' nofollow' : ''}`} className={LINK_CLASS}>
            {children}
        </a>
    );
}

function renderText(node, key) {
    let out = node.text;
    const marks = Array.isArray(node.marks) ? node.marks : [];
    if (marks.some((mark) => mark?.type === 'italic')) out = <em>{out}</em>;
    if (marks.some((mark) => mark?.type === 'bold')) out = <strong className="font-semibold text-secondary">{out}</strong>;
    const link = marks.find((mark) => mark?.type === 'link');
    if (link) return renderLink(link.attrs?.href, link.attrs?.rel, out, key);
    return <span key={key}>{out}</span>;
}

function renderInline(nodes) {
    return (Array.isArray(nodes) ? nodes : []).map((node, index) => {
        if (node?.type === 'text' && typeof node.text === 'string') return renderText(node, index);
        if (node?.type === 'hardBreak') return <br key={index} />;
        return null;
    });
}

function cellSpan(node) {
    const span = {};
    if (Number(node.attrs?.colspan) > 1) span.colSpan = Number(node.attrs.colspan);
    if (Number(node.attrs?.rowspan) > 1) span.rowSpan = Number(node.attrs.rowspan);
    return span;
}

function isHeaderRow(row) {
    const cells = Array.isArray(row?.content) ? row.content : [];
    return cells.length > 0 && cells.every((cell) => cell?.type === 'tableHeader');
}

export default function BlogContent({ body }) {
    const ids = headingIds(body);

    const children = (node, inside) => (Array.isArray(node?.content) ? node.content : [])
        .map((child, index) => block(child, index, inside));

    const row = (node, key, inHead) => (
        <tr key={key} className="border-b border-gray-100 last:border-b-0">
            {(Array.isArray(node.content) ? node.content : []).map((cell, index) => {
                if (cell?.type === 'tableHeader') {
                    return (
                        <th key={index} scope={inHead ? 'col' : 'row'} {...cellSpan(cell)} className="px-4 py-3 font-semibold text-secondary align-top">
                            {children(cell, 'cell')}
                        </th>
                    );
                }
                if (cell?.type === 'tableCell') {
                    return <td key={index} {...cellSpan(cell)} className="px-4 py-3 text-gray-600 align-top">{children(cell, 'cell')}</td>;
                }
                return null;
            })}
        </tr>
    );

    function block(node, key, inside) {
        if (!node || typeof node !== 'object') return null;
        switch (node.type) {
            case 'paragraph':
                if (!nodeText(node)) return null;
                return (
                    <p key={key} className={inside ? 'leading-relaxed' : 'text-gray-600 leading-relaxed text-base'}>
                        {renderInline(node.content)}
                    </p>
                );
            case 'heading': {
                const level = Math.min(4, Math.max(2, Number(node.attrs?.level) || 2));
                const Tag = `h${level}`;
                return <Tag key={key} id={ids.get(node)} className={HEADINGS[level]}>{renderInline(node.content)}</Tag>;
            }
            case 'bulletList':
                return <ul key={key} className="list-disc pl-6 space-y-2 text-gray-600 marker:text-primary">{children(node, 'list')}</ul>;
            case 'orderedList': {
                const start = Number(node.attrs?.start);
                return (
                    <ol key={key} start={start > 1 ? start : undefined} className="list-decimal pl-6 space-y-2 text-gray-600 marker:text-primary marker:font-semibold">
                        {children(node, 'list')}
                    </ol>
                );
            }
            case 'listItem':
                return <li key={key} className="pl-1 space-y-2">{children(node, 'list')}</li>;
            case 'blockquote':
                return (
                    <blockquote key={key} className="border-l-4 border-accent bg-white/60 rounded-r-xl pl-5 pr-4 py-3 italic text-gray-600 space-y-3">
                        {children(node, 'quote')}
                    </blockquote>
                );
            case 'table': {
                const rows = (Array.isArray(node.content) ? node.content : []).filter((item) => item?.type === 'tableRow');
                let headCount = 0;
                while (headCount < rows.length && isHeaderRow(rows[headCount])) headCount += 1;
                const head = rows.slice(0, headCount);
                const rest = rows.slice(headCount);
                return (
                    <div key={key} className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                        <table className="w-full text-sm text-left border-collapse">
                            {head.length > 0 && (
                                <thead className="bg-gold-lighter border-b border-primary/20">
                                    {head.map((item, index) => row(item, index, true))}
                                </thead>
                            )}
                            {rest.length > 0 && <tbody>{rest.map((item, index) => row(item, index, false))}</tbody>}
                        </table>
                    </div>
                );
            }
            case 'image': {
                const { src, alt, caption, width, height } = node.attrs || {};
                if (typeof src !== 'string' || !src) return null;
                return (
                    <figure key={key} className="my-8">
                        <Image
                            src={src}
                            alt={alt || ''}
                            width={width || undefined}
                            height={height || undefined}
                            loading="lazy"
                            srcSet={cloudinarySrcSet(src)}
                            sizes={IMAGE_SIZES}
                            className="w-full h-auto rounded-xl shadow-md"
                        />
                        {caption && <figcaption className="mt-3 text-center text-sm text-gray-medium">{caption}</figcaption>}
                    </figure>
                );
            }
            case 'horizontalRule':
                return <hr key={key} className="my-10 border-gray-200" />;
            default:
                return null;
        }
    }

    return <div className="space-y-5">{children(body)}</div>;
}
