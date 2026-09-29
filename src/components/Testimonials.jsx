import { useState } from 'react';
import { FaStar, FaStarHalfAlt, FaGoogle, FaChevronLeft, FaChevronRight, FaQuoteRight } from 'react-icons/fa';

const testimonials = [
    {
        name: 'Mishra Power',
        text: 'Working with AK Sales was a seamless experience from start to finish. The team\'s professionalism and attention to detail really impressed us. Highly recommend them for anyone looking for reliable kitchen solutions.',
        rating: 5,
    },
    {
        name: 'Shagufta Siddiqui',
        text: 'We partnered with AK Sales for our hotel\'s commercial kitchen setup, and the results exceeded expectations. Their industrial kitchen equipment is top-notch and built to handle heavy usage.',
        rating: 5,
    },
    {
        name: 'Amit Singh',
        text: 'AK Sales offers excellent kitchen equipment with top-notch quality and reliability. Their products are perfect for both small and large-scale operations, delivering durability and efficient performance.',
        rating: 5,
    },
    {
        name: 'Vibha Pandey',
        text: 'AK Sales delivered exactly what we were looking for — a modern, well-organized, and elegant kitchen. The build quality and attention to detail are truly impressive. Great choice for a reliable kitchen provider.',
        rating: 5,
    },
];

const Testimonials = () => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const next = () => setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    const prev = () => setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);

    return (
        <section className="section-padding bg-gradient-to-br from-secondary via-dark to-secondary relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-10 right-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-10 left-10 w-48 h-48 bg-accent/10 rounded-full blur-3xl" />

            <div className="relative max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                    {/* Left - Rating overview */}
                    <div className="lg:col-span-4 text-center lg:text-left">
                        <span className="text-accent text-sm font-bold uppercase tracking-widest">Testimonials</span>
                        <h2 className="text-3xl md:text-4xl font-bold text-white mt-3 mb-6 font-heading">
                            Customer experiences that speak for themselves
                        </h2>
                        <div className="flex items-center gap-4 justify-center lg:justify-start mb-4">
                            <span className="text-6xl font-bold text-white font-heading">4.8</span>
                            <div>
                                <div className="flex text-accent text-xl gap-0.5">
                                    <FaStar /><FaStar /><FaStar /><FaStar /><FaStarHalfAlt />
                                </div>
                                <p className="text-white/50 text-sm mt-1">(1k+ Reviews)</p>
                            </div>
                        </div>
                        <a
                            href="#"
                            className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-white/20 transition-all duration-300 mt-2"
                        >
                            <FaGoogle className="text-accent" />
                            Google Testimonials
                        </a>
                    </div>

                    {/* Right - Testimonial cards */}
                    <div className="lg:col-span-8">
                        <div className="relative">
                            {/* Cards row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {[0, 1].map((offset) => {
                                    const idx = (currentIndex + offset) % testimonials.length;
                                    const t = testimonials[idx];
                                    return (
                                        <div
                                            key={idx}
                                            className="bg-white/5 backdrop-blur-sm rounded-2xl p-7 border border-white/10 hover:bg-white/10 transition-all duration-500 relative"
                                        >
                                            <FaQuoteRight className="absolute top-6 right-6 text-3xl text-white/5" />
                                            <div className="flex text-accent text-sm gap-0.5 mb-4">
                                                {Array.from({ length: t.rating }).map((_, i) => (
                                                    <FaStar key={i} />
                                                ))}
                                            </div>
                                            <p className="text-white/80 text-sm leading-relaxed mb-6 line-clamp-4">
                                                "{t.text}"
                                            </p>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-sm">
                                                    {t.name[0]}
                                                </div>
                                                <div>
                                                    <h4 className="text-white font-semibold text-sm">{t.name}</h4>
                                                    <p className="text-white/40 text-xs">Verified Customer</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Navigation */}
                            <div className="flex justify-center gap-3 mt-8">
                                <button
                                    onClick={prev}
                                    className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-accent hover:text-secondary hover:border-accent transition-all duration-300"
                                >
                                    <FaChevronLeft className="text-sm" />
                                </button>
                                <button
                                    onClick={next}
                                    className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-accent hover:text-secondary hover:border-accent transition-all duration-300"
                                >
                                    <FaChevronRight className="text-sm" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Testimonials;
