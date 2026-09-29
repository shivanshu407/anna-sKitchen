import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaPhone, FaEnvelope, FaMapMarkerAlt, FaFacebookF, FaInstagram, FaArrowUp } from 'react-icons/fa';
import { fetchProducts } from '../api/products';

const quickLinks = [
    { name: 'Home', href: '/' },
    { name: 'About Us', href: '/about' },
    { name: 'Services', href: '/services' },
    { name: 'Projects', href: '/projects' },
    { name: 'Blog', href: '/blogs' },
    { name: 'Contact', href: '/contact' },
];

const FOOTER_CATEGORY_SLUGS = [
    'bakery-products',
    'refrigeration',
    'heating-range',
    'chat-and-fast-food-counter',
    'work-and-profession-table',
    'rack-trolley',
    'processing',
];

const Footer = () => {
    const [productCategories, setProductCategories] = useState([]);

    useEffect(() => {
        fetchProducts().then(data => {
            const cats = FOOTER_CATEGORY_SLUGS
                .filter(slug => data[slug])
                .map(slug => ({
                    name: data[slug].title,
                    href: `/collections/${slug}`,
                }));
            setProductCategories(cats);
        });
    }, []);
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <footer className="bg-secondary text-white">
            {/* Main footer */}
            <div className="max-w-7xl mx-auto px-4 py-10 md:py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                    {/* Company Info */}
                    <div>
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                A
                            </div>
                            <div>
                                <h3 className="text-lg font-bold font-heading">AK Sales</h3>
                                <p className="text-[10px] text-white/50 uppercase tracking-wider">Equipments</p>
                            </div>
                        </div>
                        <p className="text-white/60 text-sm leading-relaxed mb-6">
                            AK Sales — a leading Commercial Kitchen Equipment Manufacturer Company in Surat with Commercial Kitchen Planning & Setup for hotel, restaurant, cafe, food court etc.
                        </p>
                        <div className="space-y-3">
                            <a href="tel:+919106780688" className="flex items-center gap-3 text-white/60 text-sm hover:text-accent transition-colors">
                                <FaPhone className="text-accent text-xs" />
                                +91-91067 80688
                            </a>
                            <a href="tel:+919510770343" className="flex items-center gap-3 text-white/60 text-sm hover:text-accent transition-colors">
                                <FaPhone className="text-accent text-xs" />
                                +91-95107 70343
                            </a>
                            <a href="tel:+9429768135" className="flex items-center gap-3 text-white/60 text-sm hover:text-accent transition-colors">
                                <FaPhone className="text-accent text-xs" />
                                +91-94297 68135
                            </a>
                            <a href="mailto:annaskitchenequipment@gmail.com" className="flex items-center gap-3 text-white/60 text-sm hover:text-accent transition-colors">
                                <FaEnvelope className="text-accent text-xs" />
                                annaskitchenequipment@gmail.com
                            </a>
                            <div className="flex items-start gap-3 text-white/60 text-sm">
                                <FaMapMarkerAlt className="text-accent text-xs mt-1 flex-shrink-0" />
                                <span>Near Nayara Petrol Pump, Bhatha, Surat, Gujarat 394510</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-lg font-bold mb-6 font-heading relative">
                            Quick Links
                            <span className="absolute bottom-0 left-0 w-10 h-0.5 bg-accent -mb-2 rounded-full" />
                        </h3>
                        <ul className="space-y-2.5 mt-4">
                            {quickLinks.map((link) => (
                                <li key={link.name}>
                                    <Link to={link.href} className="text-white/60 text-sm hover:text-accent hover:pl-2 transition-all duration-300">
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Our Products */}
                    <div>
                        <h3 className="text-lg font-bold mb-6 font-heading relative">
                            Our Products
                            <span className="absolute bottom-0 left-0 w-10 h-0.5 bg-accent -mb-2 rounded-full" />
                        </h3>
                        <ul className="space-y-2.5 mt-4">
                            {productCategories.map((product) => (
                                <li key={product.name}>
                                    <Link to={product.href} className="text-white/60 text-sm hover:text-accent hover:pl-2 transition-all duration-300">
                                        {product.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Social Links */}
                    <div>
                        <h3 className="text-lg font-bold mb-6 font-heading relative">
                            Connect With Us
                            <span className="absolute bottom-0 left-0 w-10 h-0.5 bg-accent -mb-2 rounded-full" />
                        </h3>
                        <p className="text-white/60 text-sm leading-relaxed mb-6">
                            Follow us on social media for updates, culinary insights, and new product announcements.
                        </p>
                        <div className="flex gap-2">
                            {[FaFacebookF, FaInstagram].map((Icon, i) => (
                                <a
                                    key={i}
                                    href={i === 1 ? 'https://www.instagram.com/annas_kitchen_equipments' : '#'}
                                    target={i === 1 ? '_blank' : undefined}
                                    rel={i === 1 ? 'noopener noreferrer' : undefined}
                                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-accent hover:text-secondary hover:scale-110 transition-all duration-300"
                                >
                                    <Icon className="text-sm" />
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom bar */}
            <div className="border-t border-white/10">
                <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col md:flex-row items-center justify-between gap-3">
                    <p className="text-white/40 text-sm">
                        © {new Date().getFullYear()} AK Sales. All rights reserved.
                    </p>
                    <div className="flex items-center gap-4 text-white/40 text-sm">
                        <a href="#" className="hover:text-accent transition-colors">Privacy Policy</a>
                        <span>|</span>
                        <a href="#" className="hover:text-accent transition-colors">Terms of Service</a>
                    </div>
                </div>
            </div>

            {/* Scroll to top */}
            <button
                onClick={scrollToTop}
                className="fixed bottom-6 right-6 w-12 h-12 bg-gradient-to-br from-primary to-primary-dark text-white rounded-full flex items-center justify-center shadow-xl hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300 z-50"
                aria-label="Scroll to top"
            >
                <FaArrowUp />
            </button>
        </footer>
    );
};

export default Footer;
