import React from 'react';
import { Link } from 'react-router-dom';
import { FaHome, FaChevronRight, FaCalendar, FaUser, FaClock, FaSyncAlt } from 'react-icons/fa';
import Image from './Image';
import BlogContent from './BlogContent';
import { bodyOf, bodyToText, cloudinarySrcSet, headingsOf, readingTime, wordCount } from '../lib/blog-content';
import { isoDate, publicationDate } from '../lib/seo';

// The article part of a blog page: hero, breadcrumb, summary, contents, body,
// FAQ and author. The public page and the admin preview both render it, so it
// takes everything from `blog` and uses no route params or site data.

const TIME_ZONE = 'Asia/Kolkata';
// Same "Jan 15, 2025" format the server writes into `date` on publish.
const displayDate = (iso) => new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: TIME_ZONE });
const calendarDay = (iso) => new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TIME_ZONE });

function publishedInfo(blog) {
    const iso = isoDate(blog.publishedAt);
    if (iso) return { dateTime: iso, text: displayDate(iso), day: calendarDay(iso) };
    const legacy = String(blog.date ?? '').trim();
    if (!legacy) return null;
    const day = publicationDate(legacy);
    return { dateTime: day, text: legacy, day };
}

function AuthorLink({ href, name }) {
    if (typeof href !== 'string' || !href.trim()) return null;
    const className = 'inline-flex items-center gap-1 text-primary-dark font-semibold text-sm hover:text-primary transition-colors mt-3';
    if (/^\/(?![/\\])/.test(href)) return <Link to={href} className={className}>More about {name}</Link>;
    if (!/^https?:\/\//i.test(href)) return null;
    return <a href={href} target="_blank" rel="noopener noreferrer" className={className}>More about {name}</a>;
}

export default function BlogArticle({ blog }) {
    const body = bodyOf(blog);
    const headings = headingsOf(body);
    const minutes = readingTime(wordCount(bodyToText(body)));
    const published = publishedInfo(blog);
    const updated = isoDate(blog.updatedAt);
    const showUpdated = Boolean(updated && published?.day && calendarDay(updated) > published.day);
    const faqs = (Array.isArray(blog.faqs) ? blog.faqs : []).filter((faq) => faq?.question?.trim() && faq?.answer?.trim());
    const excerpt = String(blog.excerpt ?? '').trim();
    const author = String(blog.author ?? '').trim();
    const authorBio = String(blog.authorBio ?? '').trim();

    return (
        <article>
            {/* Hero Banner */}
            <div className="relative h-[45vh] min-h-[300px] overflow-hidden">
                {blog.image && (
                    <Image
                        fetchPriority="high"
                        sizes="100vw"
                        decoding="async"
                        src={blog.image}
                        srcSet={cloudinarySrcSet(blog.image)}
                        width={blog.imageWidth || undefined}
                        height={blog.imageHeight || undefined}
                        alt={blog.imageAlt || blog.title}
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/60 to-secondary/30" />
                <div className="relative z-10 h-full flex flex-col justify-end pb-10 px-4">
                    <div className="max-w-4xl mx-auto w-full">
                        {blog.category && (
                            <span className="bg-accent text-secondary text-xs font-bold px-3 py-1 rounded-full">
                                {blog.category}
                            </span>
                        )}
                        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mt-4 font-heading leading-tight">
                            {blog.title}
                        </h1>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 text-white/70 text-sm">
                            {published && (
                                <span className="flex items-center gap-2">
                                    <FaCalendar className="text-accent text-xs" />
                                    <time dateTime={published.dateTime}>{published.text}</time>
                                </span>
                            )}
                            {showUpdated && (
                                <span className="flex items-center gap-2">
                                    <FaSyncAlt className="text-accent text-xs" />
                                    <span>Updated <time dateTime={updated}>{displayDate(updated)}</time></span>
                                </span>
                            )}
                            {author && (
                                <span className="flex items-center gap-2">
                                    <FaUser className="text-accent text-xs" /> {author}
                                </span>
                            )}
                            <span className="flex items-center gap-2">
                                <FaClock className="text-accent text-xs" /> {minutes} min read
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="bg-gold-lighter border-b border-primary/10">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-2 text-sm text-gray-medium min-w-0">
                    <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1 flex-shrink-0">
                        <FaHome className="text-xs" /> Home
                    </Link>
                    <FaChevronRight className="text-xs text-gray-300 flex-shrink-0" />
                    <Link to="/blogs" className="hover:text-primary transition-colors flex-shrink-0">Blogs</Link>
                    <FaChevronRight className="text-xs text-gray-300 flex-shrink-0" />
                    <span className="text-primary truncate" aria-current="page">{blog.title}</span>
                </div>
            </nav>

            <div className="max-w-4xl mx-auto px-4 pt-12 space-y-10">
                {excerpt && (
                    <div className="bg-white border-l-4 border-accent rounded-r-2xl shadow-sm p-6">
                        <p className="text-primary text-xs font-bold uppercase tracking-widest mb-2">In short</p>
                        <p className="text-secondary text-base md:text-lg leading-relaxed">{excerpt}</p>
                    </div>
                )}

                {headings.length >= 3 && (
                    <nav aria-label="Table of contents" className="bg-gold-lighter border border-primary/10 rounded-2xl p-6">
                        <p className="text-secondary font-bold font-heading mb-3">On this page</p>
                        <ol className="space-y-2 text-sm">
                            {headings.map((heading) => (
                                <li key={heading.id} className={heading.level === 3 ? 'pl-4' : heading.level === 4 ? 'pl-8' : undefined}>
                                    <a href={`#${heading.id}`} className="text-gray-600 hover:text-primary transition-colors">
                                        {heading.text}
                                    </a>
                                </li>
                            ))}
                        </ol>
                    </nav>
                )}

                <BlogContent body={body} />

                {faqs.length > 0 && (
                    <section className="pt-4">
                        <h2 className="text-xl md:text-2xl font-bold text-secondary font-heading mb-6">Frequently asked questions</h2>
                        <div className="space-y-4">
                            {faqs.map((faq, index) => (
                                <div key={index} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                    <h3 className="text-base md:text-lg font-bold text-secondary font-heading mb-2">{faq.question}</h3>
                                    <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {author && (
                    <aside aria-label="About the author" className="flex items-start gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent text-white flex items-center justify-center flex-shrink-0">
                            <FaUser />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-primary">Written by</p>
                            <p className="text-secondary font-bold font-heading text-lg">{author}</p>
                            {authorBio && <p className="text-gray-600 text-sm leading-relaxed mt-2">{authorBio}</p>}
                            <AuthorLink href={blog.authorUrl} name={author} />
                        </div>
                    </aside>
                )}
            </div>
        </article>
    );
}
