import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaHome, FaChevronRight, FaArrowRight } from 'react-icons/fa';
import { fetchProducts } from '../api/products';
import SEO from '../components/SEO';


const ALLOWED_SLUGS = [
    'bakery-products',
    'refrigeration',
    'heating-range',
    'chat-and-fast-food-counter',
    'work-and-profession-table',
    'rack-trolley',
    'processing',
];

const Collections = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProducts().then(data => {
            const filtered = ALLOWED_SLUGS
                .filter(slug => data[slug])
                .map(slug => data[slug]);
            setCategories(filtered);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-secondary flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400 text-lg">Loading collections...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-secondary">
            <SEO title="Collections" description="Browse our premium commercial kitchen equipment collections." />
            {/* Hero Banner */}
            <div className="relative py-24 md:py-32 overflow-hidden">
                {/* Animated gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-secondary via-dark-light to-secondary" />
                <div className="absolute inset-0 opacity-5" style={{
                    backgroundImage: `radial-gradient(circle at 25% 25%, rgba(197,160,78,0.3) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(212,175,55,0.2) 0%, transparent 50%)`,
                }} />
                {/* Decorative gold lines */}
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
                <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

                <div className="relative max-w-7xl mx-auto px-4 text-center">
                    {/* Breadcrumb */}
                    <div className="flex items-center justify-center gap-2 text-sm text-white/50 mb-8">
                        <Link to="/" className="hover:text-accent transition-colors flex items-center gap-1">
                            <FaHome className="text-xs" /> Home
                        </Link>
                        <FaChevronRight className="text-xs text-white/30" />
                        <span className="text-accent">Collections</span>
                    </div>

                    <div className="inline-block bg-accent/10 border border-accent/20 text-accent px-5 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.2em] mb-6">
                        Browse Our Range
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-white font-heading tracking-tight">
                        Our Product <span className="text-gradient">Collections</span>
                    </h1>
                    <p className="text-white/40 mt-5 max-w-2xl mx-auto text-lg font-light">
                        Explore our comprehensive range of premium commercial kitchen equipment
                    </p>
                    <div className="flex items-center justify-center gap-3 mt-8">
                        <div className="w-12 h-px bg-accent/40" />
                        <div className="w-2 h-2 rounded-full bg-accent" />
                        <div className="w-12 h-px bg-accent/40" />
                    </div>
                </div>
            </div>

            {/* Categories Grid */}
            <div className="relative">
                {/* Subtle top gradient blend */}
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-secondary to-transparent z-10 pointer-events-none" />

                <div className="max-w-7xl mx-auto px-4 py-16 relative z-20">
                    {/* Category count */}
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-3">
                            <div className="w-1 h-8 bg-gradient-to-b from-accent to-primary rounded-full" />
                            <span className="text-white/60 text-sm font-medium">{categories.length} Categories Available</span>
                        </div>
                        <Link to="/#contact" className="text-accent text-sm font-semibold hover:text-white transition-colors flex items-center gap-2">
                            Need Help Choosing? <FaArrowRight className="text-xs" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {categories.map((cat) => (
                            <Link
                                key={cat.slug}
                                to={`/collections/${cat.slug}`}
                                className="group relative rounded-2xl overflow-hidden transition-all duration-700 hover:-translate-y-3"
                            >
                                {/* Card background */}
                                <div className="absolute inset-0 bg-gradient-to-br from-dark-light to-secondary rounded-2xl" />
                                <div className="absolute inset-[1px] bg-gradient-to-br from-secondary to-dark rounded-2xl" />

                                {/* Gold border glow on hover */}
                                <div className="absolute inset-0 rounded-2xl border border-white/5 group-hover:border-accent/30 transition-colors duration-700" />

                                <div className="relative">
                                    {/* Image container */}
                                    <div className="relative overflow-hidden aspect-[4/3] bg-white rounded-t-2xl">
                                        <img
                                            src={cat.products[0]?.image || '/images/ak-sales-logo.png'}
                                            alt={cat.title}
                                            className="w-full h-full object-contain p-6 group-hover:scale-110 transition-transform duration-1000 ease-out"
                                        />
                                        {/* Multi-layer gradient overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/60 to-transparent" />
                                        <div className="absolute inset-0 bg-gradient-to-r from-secondary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                                        {/* Product count badge */}
                                        <div className="absolute top-4 right-4 bg-dark/40 backdrop-blur-md border border-white/10 text-white/80 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                            {cat.products.length} Products
                                        </div>

                                        {/* Bottom content overlay */}
                                        <div className="absolute bottom-0 left-0 right-0 p-6">
                                            <h3 className="font-bold text-white font-heading uppercase tracking-wide group-hover:text-accent transition-colors duration-500 text-xl">
                                                {cat.title}
                                            </h3>
                                            <p className="text-white/40 text-sm mt-2 line-clamp-2 max-w-md">
                                                {cat.description}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Bottom action bar */}
                                    <div className="p-5 flex items-center justify-between">
                                        <span className="inline-flex items-center gap-2 text-accent/70 text-sm font-semibold group-hover:text-accent group-hover:gap-3 transition-all duration-500">
                                            Explore Collection <FaArrowRight className="text-xs" />
                                        </span>
                                        <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center group-hover:border-accent/40 group-hover:bg-accent/10 transition-all duration-500">
                                            <FaArrowRight className="text-xs text-white/30 group-hover:text-accent -rotate-45 transition-colors duration-500" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom CTA */}
            <div className="border-t border-white/5">
                <div className="max-w-7xl mx-auto px-4 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h3 className="text-white text-xl font-bold font-heading">Can't find what you're looking for?</h3>
                        <p className="text-white/40 text-sm mt-1">Contact us for custom kitchen equipment solutions</p>
                    </div>
                    <Link
                        to="/#contact"
                        className="bg-gradient-to-r from-primary to-accent text-secondary px-8 py-3.5 rounded-full font-bold text-sm hover:shadow-xl hover:shadow-accent/20 hover:-translate-y-0.5 transition-all duration-300"
                    >
                        Get Custom Quote
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Collections;
