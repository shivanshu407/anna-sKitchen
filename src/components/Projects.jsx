import Image from './Image';
import { FaArrowRight } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const projects = [
    {
        name: 'Haldiram',
        category: 'snack and restaurant',
        image: '/images/haldiram.webp',
    },
    {
        name: 'Subway',
        category: 'restaurants',
        image: '/images/subway.webp',
    },
    {
        name: 'Amul',
        category: 'Dairy',
        image: '/images/amul.webp',
    },
    {
        name: 'Palsana',
        category: 'restaurant',
        image: '/images/palsana.webp',
    },
];

const Projects = () => {
    return (
        <section id="projects" className="section-padding bg-gold-light">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-14">
                    <span className="text-primary text-sm font-bold uppercase tracking-widest">Our Portfolio</span>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-secondary mt-3 font-heading">
                        Major Commercial Kitchen<br className="hidden md:block" /> Equipment Projects
                    </h2>
                    <p className="text-gray-medium mt-4 max-w-2xl mx-auto">
                        Hotel, Restaurant, Canteen, Bakery & more
                    </p>
                    <div className="w-20 h-1 bg-gradient-to-r from-primary to-accent mx-auto mt-5 rounded-full" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {projects.map((project, index) => (
                        <div
                            key={index}
                            className="group relative rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 cursor-pointer"
                        >
                            <div className="aspect-[4/5] overflow-hidden">
                                <Image
                                    loading="lazy"
                                    decoding="async"
                                    src={project.image}
                                    alt={project.name}
                                    className="w-full h-full object-cover  group-hover:scale-110 transition-transform duration-700"
                                />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/20 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-500" />
                            <div className="absolute bottom-0 left-0 right-0 p-6">
                                <span className="text-accent text-xs font-bold uppercase tracking-wider">{project.category}</span>
                                <h3 className="text-xl font-bold text-white mt-1 font-heading">{project.name}</h3>
                                <Link to="/projects" className="mt-3 flex items-center gap-2 text-white/70 text-sm group-hover:text-accent transition-colors">
                                    View Project <FaArrowRight className="text-xs" />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="text-center mt-10 flex flex-wrap justify-center gap-4">
                    <Link to="/projects" className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-primary-dark text-white px-7 py-3 rounded-full font-semibold hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300 text-sm">
                        Project Gallery
                    </Link>
                    <Link to="/projects" className="inline-flex items-center gap-2 border-2 border-primary text-primary px-7 py-3 rounded-full font-semibold hover:bg-primary hover:text-white transition-all duration-300 text-sm">
                        Completed Projects
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default Projects;
