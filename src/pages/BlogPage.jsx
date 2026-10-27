import Image from '../components/Image';
import BlogArticle from '../components/BlogArticle';
import { useParams, Link } from 'react-router-dom';
import { FaCalendar, FaArrowLeft } from 'react-icons/fa';
import { useSiteData } from '../lib/site-data';
import { isoDate, publicationDate } from '../lib/seo';

const postTime = (post) => Date.parse(isoDate(post.publishedAt) ?? publicationDate(post.date) ?? isoDate(post.createdAt) ?? '') || 0;

// Posts sharing the category or a tag come first, then the newest; at most three.
function relatedPosts(blog, blogs) {
    if (!blog) return [];
    const tags = new Set(Array.isArray(blog.tags) ? blog.tags : []);
    const related = (post) => post.category === blog.category || (Array.isArray(post.tags) && post.tags.some((tag) => tags.has(tag)));
    return blogs
        .filter((post) => post.slug !== blog.slug && post.status !== 'draft')
        .map((post) => ({ post, related: related(post), time: postTime(post) }))
        .sort((a, b) => Number(b.related) - Number(a.related) || b.time - a.time)
        .slice(0, 3)
        .map(({ post }) => post);
}

const BlogPage = () => {
    const { slug } = useParams();
    const { blogs, loading } = useSiteData();
    const blog = blogs.find(item => item.slug === slug && item.status !== 'draft');
    const relatedBlogs = relatedPosts(blog, blogs);

    if (loading) {
        return (
            <div className="min-h-screen bg-gold-light flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 text-lg">Loading blog...</p>
                </div>
            </div>
        );
    }

    if (!blog) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gold-lighter">
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-secondary font-heading mb-4">Blog Not Found</h2>
                    <p className="text-gray-medium mb-8">The blog post you're looking for doesn't exist.</p>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-primary-dark text-white px-7 py-3 rounded-full font-semibold hover:shadow-lg transition-all"
                    >
                        <FaArrowLeft className="text-sm" />
                        Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gold-light">
            <BlogArticle blog={blog} />

            <div className="max-w-4xl mx-auto px-4 pb-12">
                {/* Back Button */}
                <div className="mt-12 pt-8 border-t border-gray-100">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all duration-300"
                    >
                        <FaArrowLeft className="text-sm" /> Back to Home
                    </Link>
                </div>
            </div>

            {/* Related Blogs */}
            <div className="bg-gold-lighter py-14">
                <div className="max-w-7xl mx-auto px-4">
                    <h2 className="text-2xl font-bold text-secondary mb-8 font-heading text-center">
                        Related Articles
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {relatedBlogs.map((b) => (
                            <Link
                                key={b.slug}
                                to={`/blog/${b.slug}`}
                                className="group bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100 hover:shadow-2xl hover:-translate-y-2 transition-all duration-500"
                            >
                                <div className="relative aspect-[16/10] overflow-hidden">
                                    <Image
                                        loading="lazy"
                                        decoding="async"
                                        src={b.image}
                                        alt={b.imageAlt || b.title}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                    <span className="absolute top-4 left-4 bg-accent text-secondary text-xs font-bold px-3 py-1 rounded-full">
                                        {b.category}
                                    </span>
                                </div>
                                <div className="p-5">
                                    <div className="flex items-center gap-2 text-gray-medium text-xs mb-3">
                                        <FaCalendar className="text-primary" />
                                        {b.date}
                                    </div>
                                    <h3 className="text-sm font-bold text-secondary leading-snug line-clamp-2 group-hover:text-primary transition-colors font-heading">
                                        {b.title}
                                    </h3>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BlogPage;
