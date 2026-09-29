import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const slides = [
    {
        title: 'Commercial Kitchen Equipment',
        subtitle: 'Manufacturer in Surat',
        description: 'Premium quality commercial kitchen setups for hotels, restaurants, cafes, bakeries, and cloud kitchens.',
        gradient: 'from-secondary/90 via-secondary/70 to-transparent',
    },
    {
        title: 'End-to-End Kitchen Solutions',
        subtitle: 'Design • Manufacturing • Installation',
        description: 'From conceptual design to installation, we manage every step with precision and excellence.',
        gradient: 'from-secondary/90 via-secondary/70 to-transparent',
    },
    {
        title: '14+ Years of Excellence',
        subtitle: 'Trusted by India\'s Top Brands',
        description: 'Oyo, Ircrt, La Pinoz, Amul, Haldiram, Subway — trusted by India\'s premier hospitality brands.',
        gradient: 'from-secondary/90 via-secondary/70 to-transparent',
    },
];

const categories = [
    { name: 'Hotel & Restaurant', slug: 'hotel-and-restaurant' },
    { name: 'Cafe & Bakery Kitchen', slug: 'cafe-and-bakery-kitchen' },
    { name: 'Bar & Food Court', slug: 'bar-and-food-court' },
    { name: 'Canteen & Cloud Kitchen', slug: 'canteen-and-cloud-kitchen' },
    { name: 'Hospital & Pantry Kitchen', slug: 'hospital-and-pantry-kitchen' },
];

const Hero = () => {
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    return (
        <section id="home" className="relative h-[90vh] min-h-[600px] overflow-hidden">
            {/* Background slides */}
            {slides.map((slide, index) => (
                <div
                    key={index}
                    className={`absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
                >
                    <div className={`absolute inset-0 bg-gradient-to-r ${slide.gradient} z-10`} />
                    <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-[8000ms]"
                        style={{
                            backgroundImage: `url('https://images.unsplash.com/photo-${index === 0 ? '1556909114-f6e7ad7d3136' : index === 1 ? '1571867424488-4565932edb41' : '1600585154340-be6161a56a0c'}?w=1920&q=80')`,
                            transform: index === currentSlide ? 'scale(1.1)' : 'scale(1)',
                        }}
                    />
                </div>
            ))}

            {/* Content overlay */}
            <div className="relative z-20 h-full flex items-center">
                <div className="max-w-7xl mx-auto px-4 w-full">
                    <div className="max-w-2xl">
                        {slides.map((slide, index) => (
                            <div
                                key={index}
                                className={`transition-all duration-700 ${index === currentSlide ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 absolute'}`}
                            >
                                {index === currentSlide && (
                                    <>
                                        <div className="inline-block bg-accent/90 text-secondary px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6 animate-fadeInUp">
                                            AK Sales
                                        </div>
                                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-3 font-heading" style={{ animationDelay: '0.2s' }}>
                                            {slide.title}
                                        </h2>
                                        <p className="text-xl md:text-2xl text-accent font-semibold mb-4 font-heading" style={{ animationDelay: '0.4s' }}>
                                            {slide.subtitle}
                                        </p>
                                        <p className="text-white/80 text-base md:text-lg mb-8 leading-relaxed max-w-lg" style={{ animationDelay: '0.6s' }}>
                                            {slide.description}
                                        </p>
                                        <div className="flex flex-wrap gap-3 mb-8" style={{ animationDelay: '0.8s' }}>
                                            <a href="#contact" className="bg-gradient-to-r from-primary to-primary-dark text-white px-7 py-3.5 rounded-full font-semibold hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-1 transition-all duration-300 text-sm">
                                                Get in Touch
                                            </a>
                                            <Link to="/projects" className="border-2 border-white/40 text-white px-7 py-3.5 rounded-full font-semibold hover:bg-white hover:text-secondary transition-all duration-300 text-sm">
                                                Our Projects
                                            </Link>
                                        </div>
                                    </>
                                )}
                            </div>
                        ))}

                        {/* Category pills */}
                        <div className="flex flex-wrap gap-2 mt-4 relative z-30">
                            {categories.map((cat) => (
                                <Link
                                    key={cat.slug}
                                    to={`/collections/${cat.slug}`}
                                    className="bg-white/10 backdrop-blur-sm text-white/90 px-4 py-2 rounded-full text-xs font-medium border border-white/10 hover:bg-white/20 hover:scale-105 transition-all duration-300 cursor-pointer"
                                >
                                    {cat.name}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Slide indicators */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex gap-3">
                {slides.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={`transition-all duration-300 rounded-full ${index === currentSlide ? 'w-10 h-3 bg-accent' : 'w-3 h-3 bg-white/40 hover:bg-white/70'}`}
                    />
                ))}
            </div>

            {/* Bottom gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent z-20 pointer-events-none" />
        </section>
    );
};

export default Hero;
