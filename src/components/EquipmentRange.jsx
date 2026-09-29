import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import { fetchProducts } from '../api/products';

const getCategoryCoverImage = (categoryData) => {
    if (categoryData.products && categoryData.products.length > 0) {
        return categoryData.products[0].image;
    }
    return '/images/ak-sales-logo.png';
};

const ALLOWED_SLUGS = [
    'bakery-products',
    'refrigeration',
    'heating-range',
    'chat-and-fast-food-counter',
    'work-and-profession-table',
    'rack-trolley',
    'processing',
];

const EquipmentRange = () => {
    const [equipment, setEquipment] = useState([]);

    useEffect(() => {
        fetchProducts().then(data => {
            const items = ALLOWED_SLUGS
                .filter(slug => data[slug])
                .map(slug => ({
                    name: data[slug].title,
                    slug: slug,
                    image: getCategoryCoverImage(data[slug]),
                    description: data[slug].description || 'Explore our full range of products in this category.',
                }));
            setEquipment(items);
        });
    }, []);

    return (
        <section id="products" className="section-padding bg-gold-light">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-14">
                    <span className="text-primary text-sm font-bold uppercase tracking-widest">What We Offer</span>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-secondary mt-3 font-heading">
                        Equipment Range
                    </h2>
                    <div className="w-20 h-1 bg-gradient-to-r from-primary to-accent mx-auto mt-5 rounded-full" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {equipment.map((item, index) => (
                        <Link
                            to={`/collections/${item.slug}`}
                            key={index}
                            className="group bg-white rounded-2xl overflow-hidden shadow-md shadow-secondary/5 border border-gray-100 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 transition-all duration-500"
                        >
                            <div className="relative aspect-[4/3] overflow-hidden bg-white">
                                <img
                                    src={item.image}
                                    alt={item.name}
                                    className="w-full h-full object-contain p-6 group-hover:scale-110 transition-transform duration-700"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-secondary/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            </div>
                            <div className="p-5">
                                <h3 className="text-lg font-bold text-secondary mb-2 font-heading group-hover:text-primary transition-colors">
                                    {item.name}
                                </h3>
                                <p className="text-gray-medium text-sm mb-4 line-clamp-2">{item.description}</p>
                                <span className="inline-flex items-center gap-2 text-primary text-sm font-semibold group-hover:gap-3 transition-all duration-300">
                                    View Products <FaArrowRight className="text-xs" />
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* CTA */}
                <div className="mt-16 text-center">
                    <div className="flex flex-wrap justify-center gap-4">
                        <Link
                            to="/collections"
                            className="bg-gradient-to-r from-primary to-primary-dark text-white px-7 py-3 rounded-full font-semibold hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300 text-sm"
                        >
                            View All Collections
                        </Link>
                        <a href="/anna-kitchen-broucher.pdf" download className="border-2 border-primary text-primary px-7 py-3 rounded-full font-semibold hover:bg-primary hover:text-white transition-all duration-300 text-sm">
                            Download Brochure
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default EquipmentRange;
