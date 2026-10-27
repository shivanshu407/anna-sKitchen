import Image from './Image';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaCalendar } from 'react-icons/fa';
import { useSiteData } from '../lib/site-data';

const BlogSection = () => {
    const { blogs: allBlogs, loading } = useSiteData();
    const blogs = allBlogs.slice(0, 4);

    return (
        <section id="blog" className="section-padding bg-gold-light">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-14">
                    <span className="text-primary text-sm font-bold uppercase tracking-widest">Latest News</span>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-secondary mt-3 font-heading">
                        Read Our Blogs
                    </h2>
                    <div className="w-20 h-1 bg-gradient-to-r from-primary to-accent mx-auto mt-5 rounded-full" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {loading ? (
                        <div className="col-span-full flex justify-center py-10">
                            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        blogs.map((blog) => (
                            <Link
                                key={blog.slug}
                                to={`/blog/${blog.slug}`}
                                className="block cursor-pointer group bg-white rounded-2xl overflow-hidden shadow-md shadow-secondary/5 border border-gray-100 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 transition-all duration-500"
                                style={{ textDecoration: 'none' }}
                            >
                                <div className="relative aspect-[16/10] overflow-hidden">
                                    <Image
                                        loading="lazy"
                                        decoding="async"
                                        src={blog.image}
                                        alt={blog.imageAlt || blog.title}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                    <span className="absolute top-4 left-4 bg-accent text-secondary text-xs font-bold px-3 py-1 rounded-full">
                                        {blog.category}
                                    </span>
                                </div>
                                <div className="p-5">
                                    <div className="flex items-center gap-2 text-gray-medium text-xs mb-3">
                                        <FaCalendar className="text-primary" />
                                        {blog.date}
                                    </div>
                                    <h3 className="text-sm font-bold text-secondary leading-snug mb-4 line-clamp-2 group-hover:text-primary transition-colors font-heading">
                                        {blog.title}
                                    </h3>
                                    <span className="inline-flex items-center gap-2 text-primary text-sm font-semibold group-hover:gap-3 transition-all duration-300">
                                        Read More <FaArrowRight className="text-xs" />
                                    </span>
                                </div>
                            </Link>
                        )))}
                </div>
            </div>
        </section>
    );
};

export default BlogSection;
