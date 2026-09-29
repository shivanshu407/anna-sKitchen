import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaHome, FaChevronRight, FaArrowRight } from 'react-icons/fa';
import CTA from '../components/CTA';
import ClientSlider from '../components/ClientSlider';
import PartnerSlider from '../components/PartnerSlider';
import { fetchProducts } from '../api/products';
import QuoteBar from '../components/QuoteBar';

const ProductDetailPage = () => {
    const { category, productName } = useParams();
    const [productsData, setProductsData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProducts().then(data => {
            setProductsData(data);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-secondary">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400 text-lg">Loading product...</p>
                </div>
            </div>
        );
    }

    const categoryData = productsData?.[category];
    const decodedProductName = decodeURIComponent(productName);
    const product = categoryData?.products.find(
        p => p.name.toLowerCase() === decodedProductName.toLowerCase()
    );

    const productCategories = Object.keys(productsData).map(key => ({
        name: productsData[key].title,
        slug: productsData[key].slug
    }));

    if (!categoryData || !product) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-secondary">
                <div className="text-center">
                    <h2 className="text-4xl font-bold text-white font-heading mb-4">Product Not Found</h2>
                    <Link
                        to="/collections"
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-accent text-secondary px-7 py-3 rounded-full font-bold hover:shadow-lg transition-all"
                    >
                        View All Collections
                    </Link>
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
                    <h1 className="text-3xl md:text-5xl lg:text-5xl font-bold text-white font-heading">
                        {product.name.split(' ').map((word, i, arr) => (
                            <span key={i} className={i === arr.length - 1 ? "text-primary" : ""}>
                                {word}{' '}
                            </span>
                        ))}
                    </h1>
                    <div className="flex items-center gap-2 text-sm text-white/70 mt-4">
                        <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1">
                            <FaHome className="text-xs" /> Home
                        </Link>
                        <FaChevronRight className="text-xs text-white/40" />
                        <Link to="/collections" className="hover:text-primary transition-colors">
                            Collections
                        </Link>
                        <FaChevronRight className="text-xs text-white/40" />
                        <Link to={`/collections/${categoryData.slug}`} className="hover:text-primary transition-colors">
                            {categoryData.title}
                        </Link>
                        <FaChevronRight className="text-xs text-white/40" />
                        <span className="text-primary">{product.name}</span>
                    </div>
                </div>
            </div>

            {/* Product Category Nav */}
            <div className="bg-secondary/90 backdrop-blur-sm overflow-x-auto border-b border-white/5">
                <div className="max-w-7xl mx-auto px-2 md:px-4 flex justify-around items-center min-w-max md:min-w-0">
                    {productCategories.map((cat) => (
                        <Link
                            key={cat.name}
                            to={`/collections/${cat.slug}`}
                            className="whitespace-nowrap text-white/70 text-xs font-medium px-4 py-3 hover:text-primary hover:bg-white/5 transition-all duration-300"
                        >
                            {cat.name}
                        </Link>
                    ))}
                </div>
            </div>

            <ClientSlider />

            {/* Quote Form */}
            <div className="max-w-4xl mx-auto px-4 py-10">
                <QuoteBar />
            </div>

            {/* Product Details Section */}
            <div className="max-w-6xl mx-auto px-4 pb-16">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

                    {/* Left - Product Info (Takes up 2 cols) */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Product Image Box */}
                        <div className="bg-white border text-center border-gray-100 p-8 rounded-lg outline outline-1 outline-gray-200 shadow-sm flex items-center justify-center">
                            <img
                                src={product.image}
                                alt={product.name}
                                className="max-h-[300px] w-auto object-contain drop-shadow-lg"
                            />
                        </div>

                        {/* Product Description */}
                        <div>
                            <h2 className="text-xl md:text-2xl font-bold text-secondary mb-3">
                                {product.name} Manufacturers in <span className="text-gray-600 font-normal">Surat</span>
                            </h2>
                            <p className="text-gray-500 text-sm leading-relaxed mb-4">
                                AK Sales is a well-known company in Surat that makes and sells kitchen equipment. One of their top products is the {product.name}. This equipment is special because it combines advanced engineering with high-quality materials, making it a favorite for restaurants, hotels, and catering services.
                            </p>
                            <button className="text-[#3b82f6] text-sm font-medium hover:underline">
                                Read more
                            </button>
                        </div>
                    </div>

                    {/* Right - Category Sidebar (Takes up 1 col) */}
                    <div className="lg:col-span-1">
                        <div className="bg-secondary rounded-lg overflow-hidden shadow-xl">
                            <div className="p-6">
                                <h3 className="text-primary font-bold text-lg mb-6 tracking-wide">
                                    Category Range
                                </h3>
                                <div className="space-y-4">
                                    {productCategories.map((cat, index) => (
                                        <Link
                                            key={index}
                                            to={`/collections/${cat.slug}`}
                                            className="flex items-center justify-between group"
                                        >
                                            <span className="text-white text-xs font-semibold tracking-wide uppercase group-hover:text-primary transition-colors">
                                                {cat.name}
                                            </span>
                                            <div className="w-4 h-4 rounded-sm bg-primary/20 flex items-center justify-center group-hover:bg-primary transition-colors">
                                                <svg className="w-2 h-2 text-primary group-hover:text-secondary" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <PartnerSlider />

            <div className="text-center py-8 flex flex-wrap justify-center gap-4">
                <Link
                    to="/collections"
                    className="text-secondary text-sm font-semibold hover:text-primary transition-colors"
                >
                    Explore AK Sales Products or <span className="border-b border-secondary">Shop By Brand</span>
                </Link>
                <span className="text-gray-300">|</span>
                <a href="/ak-sales-brochure.pdf" download className="text-secondary text-sm font-semibold hover:text-primary transition-colors border-b border-secondary">
                    Download Brochure
                </a>
            </div>

            <CTA />
        </div>
    );
};

export default ProductDetailPage;
