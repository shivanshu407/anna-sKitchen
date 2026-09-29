import { Link } from 'react-router-dom';
import { FaHome, FaChevronRight, FaTools, FaCogs, FaTruckMoving, FaClipboardCheck, FaHandshake, FaWrench } from 'react-icons/fa';
import CTA from '../components/CTA';
import ClientSlider from '../components/ClientSlider';
import PartnerSlider from '../components/PartnerSlider';
import QuoteBar from '../components/QuoteBar';

const productCategories = [
    { name: 'Bakery Products', slug: 'bakery-products' },
    { name: 'Refrigeration', slug: 'refrigeration' },
    { name: 'Heating Range', slug: 'heating-range' },
    { name: 'Chat & Fast Food Counter', slug: 'chat-and-fast-food-counter' },
    { name: 'Work & Profession Table', slug: 'work-and-profession-table' },
    { name: 'Rack Trolley', slug: 'rack-trolley' },
    { name: 'Processing', slug: 'processing' },
];

const serviceImages = [
    {
        src: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80',
        alt: 'Kitchen Planning & Design',
        span: 'col-span-1 row-span-1',
    },
    {
        src: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
        alt: 'Equipment Installation',
        span: 'col-span-1 row-span-1',
    },
    {
        src: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
        alt: 'Commercial Kitchen Setup',
        span: 'col-span-1 row-span-1',
    },
    {
        src: 'https://images.unsplash.com/photo-1571867424488-4565932edb41?w=600&q=80',
        alt: 'Kitchen Equipment Manufacturing',
        span: 'col-span-1 row-span-1',
    },
    {
        src: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80',
        alt: 'Professional Kitchen Setup',
        span: 'col-span-1 row-span-1',
    },
    {
        src: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600&q=80',
        alt: 'Kitchen Maintenance & Service',
        span: 'col-span-1 row-span-1',
    },
];

const services = [
    {
        icon: FaClipboardCheck,
        title: 'Kitchen Planning & Consulting',
        description: 'Expert kitchen layout design and consulting to maximize workflow efficiency, space utilization, and compliance with health & safety standards.',
    },
    {
        icon: FaCogs,
        title: 'Equipment Manufacturing',
        description: 'Custom manufacturing of high-quality stainless steel commercial kitchen equipment tailored to your specific requirements and kitchen dimensions.',
    },
    {
        icon: FaTruckMoving,
        title: 'Supply & Delivery',
        description: 'Reliable supply chain and timely delivery of all kitchen equipment and accessories to your location across India.',
    },
    {
        icon: FaTools,
        title: 'Installation & Setup',
        description: 'Professional installation and complete kitchen setup services ensuring all equipment is properly configured and ready to use.',
    },
    {
        icon: FaWrench,
        title: 'Maintenance & Repair',
        description: 'Comprehensive after-sales service including annual maintenance contracts, repairs, and spare parts supply for all kitchen equipment.',
    },
    {
        icon: FaHandshake,
        title: 'Turnkey Kitchen Solutions',
        description: 'Complete end-to-end commercial kitchen solutions — from concept to completion — for hotels, restaurants, cafes, and institutions.',
    },
];

const ServicesPage = () => {
    return (
        <div className="min-h-screen bg-gold-light">
            {/* Hero Banner */}
            <div className="relative h-[50vh] min-h-[350px] overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage: `url('/images/ab.webp')`,
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-secondary/80 via-secondary/60 to-secondary/40" />
                <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white font-heading">
                        Kitchen Equipment <span className="text-accent">Planning & Setup</span>
                    </h1>
                    <div className="flex items-center gap-2 text-sm text-white/70 mt-4">
                        <Link to="/" className="hover:text-accent transition-colors flex items-center gap-1">
                            <FaHome className="text-xs" /> Home
                        </Link>
                        <FaChevronRight className="text-xs text-white/40" />
                        <span className="text-accent">Services</span>
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
                            className="whitespace-nowrap text-white/70 text-xs font-medium px-4 py-3 hover:text-accent hover:bg-white/5 transition-all duration-300"
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

            {/* Services Heading */}
            <div className="max-w-5xl mx-auto px-4 pb-4">
                <span className="text-primary text-xs font-bold uppercase tracking-widest">
                    Commercial Kitchen Equipment Planning & Setup in Surat
                </span>
            </div>

            {/* Services Image Grid — masonry-like layout */}
            <div className="max-w-5xl mx-auto px-4 pb-12">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 auto-rows-[200px] md:auto-rows-[220px]">
                    {serviceImages.map((img, index) => (
                        <div
                            key={index}
                            className={`relative group overflow-hidden rounded-xl ${img.span} cursor-pointer`}
                        >
                            <img
                                src={img.src}
                                alt={img.alt}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-secondary/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                                <p className="text-white text-sm font-semibold">{img.alt}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Our Services List */}
            <div className="bg-gold-lighter py-16 md:py-20">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-14">
                        <span className="text-primary text-sm font-bold uppercase tracking-widest">What We Offer</span>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-secondary mt-3 font-heading">
                            Our <span className="text-primary">Services</span>
                        </h2>
                        <p className="text-gray-medium mt-4 max-w-2xl mx-auto">
                            End-to-end commercial kitchen solutions — from planning to maintenance
                        </p>
                        <div className="w-20 h-1 bg-gradient-to-r from-primary to-accent mx-auto mt-5 rounded-full" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {services.map((service, index) => (
                            <div
                                key={index}
                                className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 border border-gray-100 hover:border-primary/20"
                            >
                                <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl flex items-center justify-center mb-6 group-hover:from-primary group-hover:to-primary-dark transition-all duration-500">
                                    <service.icon className="text-2xl text-primary group-hover:text-white transition-colors duration-500" />
                                </div>
                                <h3 className="text-xl font-bold text-secondary font-heading mb-3 group-hover:text-primary transition-colors duration-300">
                                    {service.title}
                                </h3>
                                <p className="text-gray-medium text-sm leading-relaxed">
                                    {service.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Why Choose Us Section */}
            <div className="max-w-5xl mx-auto px-4 py-16">
                <div className="text-center mb-12">
                    <span className="text-primary text-xs font-bold uppercase tracking-widest">Why AK Sales?</span>
                    <h2 className="text-2xl md:text-3xl font-bold text-secondary mt-3 mb-6 font-heading">
                        Your Trusted Partner for <span className="text-primary">Commercial Kitchen Solutions</span>
                    </h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    {[
                        { number: '14+', label: 'Years Experience' },
                        { number: '1000+', label: 'Projects Completed' },
                        { number: '16+', label: 'States Covered' },
                        { number: '500+', label: 'Happy Clients' },
                    ].map((stat, index) => (
                        <div key={index} className="p-6">
                            <div className="text-4xl md:text-5xl font-bold text-primary font-heading">{stat.number}</div>
                            <p className="text-gray-medium text-sm mt-2 font-medium">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            <PartnerSlider />

            <div className="text-center py-8 flex flex-wrap justify-center gap-4">
                <Link
                    to="/collections"
                    className="text-primary text-sm font-semibold hover:underline"
                >
                    Explore AK Sales Products or Shop by Brand
                </Link>
                <span className="text-gray-300">|</span>
                <a href="/ak-sales-brochure.pdf" download className="text-primary text-sm font-semibold hover:underline">
                    Download Brochure
                </a>
            </div>

            {/* CTA - Follow Us + Let's Work Together */}
            <CTA />
        </div>
    );
};

export default ServicesPage;
