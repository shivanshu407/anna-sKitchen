import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaBars, FaTimes, FaChevronDown, FaPhone } from 'react-icons/fa';
import { fetchProducts } from '../api/products';

const Header = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [productCategories, setProductCategories] = useState([]);
    const location = useLocation();

    // Only these 7 categories should appear in the header dropdown
    const HEADER_CATEGORY_SLUGS = [
        'bakery-products',
        'refrigeration',
        'heating-range',
        'chat-and-fast-food-counter',
        'work-and-profession-table',
        'rack-trolley',
        'processing',
    ];

    useEffect(() => {
        fetchProducts().then(data => {
            const cats = HEADER_CATEGORY_SLUGS
                .filter(slug => data[slug])
                .map(slug => ({
                    name: data[slug].title,
                    slug: slug,
                }));
            setProductCategories(cats);
        });
    }, []);

    const navLinks = [
        { name: 'Home', href: '/' },
        { name: 'About', href: '/about' },
        {
            name: 'Products',
            href: '/collections',
            dropdown: productCategories,
        },
        { name: 'Services', href: '/services' },
        { name: 'Projects', href: '/projects' },
        {
            name: 'Media',
            href: '#',
            dropdownSimple: ['Videos', 'Photo Gallery'],
        },
        { name: 'Blog', href: '/blogs' },
        { name: 'Contact', href: '/contact' },
    ];

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        setMobileOpen(false);
    }, [location]);

    return (
        <header className={`sticky top-0 z-50 transition-all duration-500 ${isScrolled ? 'bg-secondary shadow-xl shadow-secondary/20' : 'bg-secondary/95 backdrop-blur-md'}`}>
            <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-18 lg:h-20">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2 group">
                    <img
                        src="/images/ak-sales-logo.png"
                        alt="Anna Kitchen Equipments"
                        className="h-14 lg:h-16 w-auto object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden lg:flex items-center gap-1">
                    {navLinks.map((link) => (
                        <div
                            key={link.name}
                            className="relative group"
                            onMouseEnter={() => (link.dropdown || link.dropdownSimple) && setActiveDropdown(link.name)}
                            onMouseLeave={() => setActiveDropdown(null)}
                        >
                            <Link
                                to={link.href}
                                className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-white/80 hover:text-accent transition-colors duration-300 relative after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-0 after:h-0.5 after:bg-accent after:transition-all after:duration-300 hover:after:w-full"
                            >
                                {link.name}
                                {(link.dropdown || link.dropdownSimple) && <FaChevronDown className="text-[10px] transition-transform duration-300 group-hover:rotate-180" />}
                            </Link>

                            {/* Product categories dropdown */}
                            {link.dropdown && activeDropdown === link.name && (
                                <div className="absolute top-full left-0 bg-white rounded-xl shadow-2xl shadow-secondary/10 border border-gray-100 py-2 min-w-56 animate-fadeIn z-50">
                                    {link.dropdown.map((item) => (
                                        <Link
                                            key={item.slug}
                                            to={`/collections/${item.slug}`}
                                            className="block px-4 py-2.5 text-sm text-gray-600 hover:text-primary hover:bg-primary/5 hover:pl-6 transition-all duration-300"
                                        >
                                            {item.name}
                                        </Link>
                                    ))}
                                    <div className="border-t border-gray-100 mt-1 pt-1">
                                        <Link
                                            to="/collections"
                                            className="block px-4 py-2.5 text-sm text-primary font-semibold hover:bg-primary/5 hover:pl-6 transition-all duration-300"
                                        >
                                            View All Collections →
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {/* Simple dropdown (Media) */}
                            {link.dropdownSimple && activeDropdown === link.name && (
                                <div className="absolute top-full left-0 bg-white rounded-xl shadow-2xl shadow-secondary/10 border border-gray-100 py-2 min-w-48 animate-fadeIn z-50">
                                    {link.dropdownSimple.map((item) => (
                                        <a
                                            key={item}
                                            href="#"
                                            className="block px-4 py-2.5 text-sm text-gray-600 hover:text-primary hover:bg-primary/5 hover:pl-6 transition-all duration-300"
                                        >
                                            {item}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </nav>

                {/* CTA + Mobile Toggle */}
                <div className="flex items-center gap-3">
                    <Link
                        to="/#contact"
                        className="hidden md:flex items-center gap-2 bg-gradient-to-r from-primary to-primary-dark text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300"
                    >
                        <FaPhone className="text-xs" />
                        Get Quote
                    </Link>
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="lg:hidden w-10 h-10 flex items-center justify-center text-white hover:text-accent transition-colors"
                    >
                        {mobileOpen ? <FaTimes className="text-xl" /> : <FaBars className="text-xl" />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileOpen && (
                <div className="lg:hidden bg-secondary border-t border-white/10 shadow-xl animate-fadeIn">
                    <div className="max-w-7xl mx-auto px-4 py-4">
                        {navLinks.map((link) => (
                            <div key={link.name}>
                                <Link
                                    to={link.href}
                                    className="block py-3 text-white/80 hover:text-accent font-medium border-b border-white/10 transition-colors"
                                >
                                    {link.name}
                                </Link>
                                {link.dropdown && (
                                    <div className="pl-4 pb-2">
                                        {link.dropdown.map((item) => (
                                            <Link
                                                key={item.slug}
                                                to={`/collections/${item.slug}`}
                                                className="block py-2 text-sm text-white/50 hover:text-accent transition-colors"
                                            >
                                                {item.name}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                                {link.dropdownSimple && (
                                    <div className="pl-4 pb-2">
                                        {link.dropdownSimple.map((item) => (
                                            <a
                                                key={item}
                                                href="#"
                                                className="block py-2 text-sm text-white/50 hover:text-accent transition-colors"
                                            >
                                                {item}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        <Link
                            to="/#contact"
                            className="block mt-4 text-center bg-gradient-to-r from-primary to-primary-dark text-white px-5 py-3 rounded-full text-sm font-semibold"
                        >
                            Get Quote
                        </Link>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Header;
