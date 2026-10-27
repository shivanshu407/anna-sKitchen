import Image from '../components/Image';
import { Link } from 'react-router-dom';
import { FaHome, FaChevronRight, FaCalendar, FaArrowRight } from 'react-icons/fa';
import { useSiteData } from '../lib/site-data';
import CTA from '../components/CTA';

const BlogsListPage = () => {
    const { blogs, loading } = useSiteData();

    if (loading) {
        return (
            <div className="min-h-screen bg-gold-light flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 text-lg">Loading blogs...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gold-light">
            {/* Hero Banner */}
            <div className="relative h-[40vh] min-h-[300px] overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage: `url('/images/ab.webp')`,
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-secondary/90 via-secondary/70 to-secondary/50" />
                <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white font-heading">
                        Our <span className="text-accent">Blogs</span>
                    </h1>
                    <div className="flex items-center gap-2 text-sm text-white/70 mt-4">
                        <Link to="/" className="hover:text-accent transition-colors flex items-center gap-1">
                            <FaHome className="text-xs" /> Home
                        </Link>
                        <FaChevronRight className="text-xs text-white/40" />
                        <span className="text-accent">Blogs</span>
                    </div>
                </div>
            </div>

            {/* Blogs Grid */}
            <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
                <div className="text-center mb-14">
                    <span className="text-primary text-sm font-bold uppercase tracking-widest">Latest Insights</span>
                    <h2 className="text-3xl md:text-4xl font-bold text-secondary mt-3 font-heading">
                        Insights, Trends & Guides
                    </h2>
                    <div className="w-20 h-1 bg-gradient-to-r from-primary to-accent mx-auto mt-5 rounded-full" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {blogs.map((blog) => (
                        <Link
                            key={blog.slug}
                            to={`/blog/${blog.slug}`}
                            className="block cursor-pointer group bg-white rounded-2xl overflow-hidden shadow-lg shadow-secondary/5 border border-gray-100 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 transition-all duration-500 flex flex-col h-full"
                        >
                            <div className="relative aspect-[16/10] overflow-hidden flex-shrink-0">
                                <Image
                                    loading="lazy"
                                    decoding="async"
                                    src={blog.image}
                                    alt={blog.imageAlt || blog.title}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-secondary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <span className="absolute top-4 left-4 bg-accent text-secondary text-xs font-bold px-3 py-1.5 rounded-full shadow-md">
                                    {blog.category}
                                </span>
                            </div>
                            <div className="p-6 flex flex-col flex-grow">
                                <div className="flex items-center gap-2 text-gray-400 text-xs mb-3 font-medium">
                                    <FaCalendar className="text-primary" />
                                    {blog.date}
                                </div>
                                <h3 className="text-[15px] font-bold text-secondary leading-snug mb-4 line-clamp-2 group-hover:text-primary transition-colors font-heading">
                                    {blog.title}
                                </h3>
                                {blog.excerpt && (
                                    <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-2">
                                        {blog.excerpt}
                                    </p>
                                )}

                                {/* Pushes the "Read More" link to the bottom so cards align nicely */}
                                <div className="mt-auto pt-4 border-t border-gray-100">
                                    <span className="inline-flex items-center gap-2 text-primary text-sm font-bold group-hover:gap-3 transition-all duration-300">
                                        Read Article <FaArrowRight className="text-xs" />
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Newsletter / CTA */}
            <CTA />
        </div>
    );
};

export default BlogsListPage;
