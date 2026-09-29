import { Link } from 'react-router-dom';
import { FaHome, FaChevronRight, FaMapMarkerAlt } from 'react-icons/fa';
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

const projectsList = [
    { name: 'Deewan E Khaas', location: 'Surat, Gujarat' },
    { name: 'Mykonos', location: 'Surat, Gujarat' },
    { name: 'Coffee King', location: 'Surat, Gujarat' },
    { name: 'Aroma of Hyderabad', location: 'Surat, Gujarat' },
    { name: 'Mahal', location: 'Surat, Gujarat' },
    { name: 'Bar Stock Exchange', location: 'Surat, Gujarat' },
    { name: 'SLMG Beverages', location: 'Surat, Gujarat' },
    { name: 'Amul', location: 'Surat, Gujarat' },
    { name: 'Haldiram', location: 'Surat, Gujarat' },
    { name: 'Atul Bakery', location: 'Surat, Gujarat' },
    { name: 'Subway', location: 'Surat, Gujarat' },
    { name: 'Sumul Dairy', location: 'Surat, Gujarat' },
    { name: 'Oyo', location: 'Surat, Gujarat' },
    { name: 'La Pinoz', location: 'Surat, Gujarat' },
    { name: 'Butterfly High', location: 'Surat, Gujarat' },
    { name: 'ShivSagar', location: 'Surat, Gujarat' },
    { name: 'Maakhan Bhog', location: 'Surat, Gujarat' },
    { name: 'Sugar N Spice', location: 'Surat, Gujarat' },
];

const ProjectsPage = () => {

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
                        Our <span className="text-accent">Projects</span>
                    </h1>
                    <div className="flex items-center gap-2 text-sm text-white/70 mt-4">
                        <Link to="/" className="hover:text-accent transition-colors flex items-center gap-1">
                            <FaHome className="text-xs" /> Home
                        </Link>
                        <FaChevronRight className="text-xs text-white/40" />
                        <span className="text-accent">Projects</span>
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

            {/* Project Heading */}
            <div className="max-w-6xl mx-auto px-4 pb-6 pt-2">
                <span className="text-primary text-xs font-bold uppercase tracking-widest">
                    Our Projects
                </span>
            </div>

            {/* Projects Grid */}
            <div className="max-w-6xl mx-auto px-4 pb-16">
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {projectsList.map((project, index) => (
                        <div
                            key={index}
                            className="group flex items-center sm:items-start gap-2 sm:gap-4 bg-white rounded-lg sm:rounded-xl p-3 sm:p-5 border border-gray-100 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer"
                        >
                            {/* Index Circle */}
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center flex-shrink-0 group-hover:from-primary group-hover:to-primary-dark transition-all duration-500">
                                <span className="text-[10px] sm:text-xs font-bold text-primary group-hover:text-white transition-colors duration-500">
                                    {String(index + 1).padStart(2, '0')}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-[13px] sm:text-sm font-bold text-secondary font-heading group-hover:text-primary transition-colors duration-300 leading-tight sm:leading-snug line-clamp-2">
                                    {project.name}
                                </h3>
                                <div className="flex items-center gap-1 sm:gap-1.5 mt-1 sm:mt-1.5">
                                    <FaMapMarkerAlt className="text-[9px] sm:text-[10px] text-primary/60 flex-shrink-0" />
                                    <span className="text-[10px] sm:text-xs text-gray-400 font-medium truncate">{project.location}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Project Count */}
                <div className="text-center mt-8">
                    <p className="text-gray-400 text-sm">
                        <span className="text-primary font-bold">100+</span> completed projects
                    </p>
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

export default ProjectsPage;
