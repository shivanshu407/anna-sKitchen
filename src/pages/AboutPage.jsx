import { Link } from 'react-router-dom';
import { FaHome, FaChevronRight } from 'react-icons/fa';
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

const AboutPage = () => {
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
                        About <span className="text-accent">Us</span>
                    </h1>
                    <div className="flex items-center gap-2 text-sm text-white/70 mt-4">
                        <Link to="/" className="hover:text-accent transition-colors flex items-center gap-1">
                            <FaHome className="text-xs" /> Home
                        </Link>
                        <FaChevronRight className="text-xs text-white/40" />
                        <span className="text-accent">About Us</span>
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

            {/* About Us */}
            <div className="max-w-5xl mx-auto px-4 py-12">
                <h2 className="text-2xl md:text-3xl font-bold text-primary mt-3 mb-6 font-heading">
                    About Us
                </h2>
                <div className="space-y-4 text-gray-600 text-sm leading-relaxed">
                    <p>
                        <strong className="text-secondary">AK Sales</strong> is a premier provider of high-quality commercial and industrial kitchen equipment, dedicated to delivering innovative, durable, and cost-effective solutions for the food service industry with 14+ years of industry expertise, we have established ourselves as a trusted name in manufacturing and supplying a comprehensive range of kitchen machinery for hotels, restaurants, canteens, hospitals, and more.
                    </p>
                </div>

                {/* Our Vision */}
                <h2 className="text-2xl md:text-3xl font-bold text-primary mt-10 mb-6 font-heading">
                    Our Vision
                </h2>
                <div className="space-y-4 text-gray-600 text-sm leading-relaxed">
                    <p>
                        We envision transforming the culinary landscape by providing intelligent kitchen systems that blend functionality with modern design, optimizing space, improving efficiency, and elevating the food preparation experience for our clients worldwide.
                    </p>
                </div>

                {/* Why Choose Us */}
                <h2 className="text-2xl md:text-3xl font-bold text-primary mt-10 mb-4 font-heading">
                    Why Choose Us ?
                </h2>
                <p className="text-gray-600 text-sm leading-relaxed mb-6">
                    Leading brands and businesses choose AK Sales for our commitment to quality, performance, and customer satisfaction.
                </p>
                <div className="space-y-5 text-gray-600 text-sm leading-relaxed">
                    <div>
                        <h4 className="text-primary font-bold text-base inline">Premium Quality & Durability </h4>
                        <span>We use only high-grade stainless steel and components, ensuring all our products are durable, hygienic, corrosion-resistant & built to withstand the demands of heavy usage.</span>
                    </div>
                    <div>
                        <h4 className="text-primary font-bold text-base inline">Customized Solutions </h4>
                        <span>No two kitchens are the same. We offer bespoke design, planning, and tailor-made equipment solutions to fit your specific space, menu, and operational requirements.</span>
                    </div>
                    <div>
                        <h4 className="text-primary font-bold text-base inline">360-Degree Support </h4>
                        <span>Our service doesn't end with a sale. We provide end-to-end support including consultation, installation, design, commissioning & prompt after-sales service and maintenance.</span>
                    </div>
                    <div>
                        <h4 className="text-primary font-bold text-base inline">Innovation & Efficiency </h4>
                        <span>Our products incorporate advanced technology, focusing on energy efficiency and safety to reduce operational costs and environmental impact.</span>
                    </div>
                    <div>
                        <h4 className="text-primary font-bold text-base inline">Trusted Expertise </h4>
                        <span>With decades of experience, our team of skilled engineers, designers, and technicians ensures every product meets stringent quality control standards and international regulations.</span>
                    </div>
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

export default AboutPage;
