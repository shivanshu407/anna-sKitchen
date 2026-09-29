import { FaQuoteLeft } from 'react-icons/fa';

const CompanyStory = () => {
    return (
        <section id="story" className="section-padding bg-gold-light">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                    {/* Image side */}
                    <div className="relative">
                        <div className="rounded-2xl overflow-hidden shadow-2xl">
                            <img
                                src="https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=800&q=80"
                                alt="AK Sales Factory"
                                className="w-full h-[400px] lg:h-[500px] object-cover"
                            />
                        </div>
                        {/* Accent box */}
                        <div className="absolute -bottom-6 -right-6 bg-gradient-to-br from-primary to-primary-dark text-white p-6 rounded-2xl shadow-xl hidden md:block">
                            <div className="text-3xl font-bold font-heading">14+</div>
                            <div className="text-sm text-white/80">Years of Excellence</div>
                        </div>
                        {/* Quote decoration */}
                        <div className="absolute -top-4 -left-4 w-16 h-16 bg-accent rounded-xl flex items-center justify-center text-secondary shadow-lg hidden md:flex">
                            <FaQuoteLeft className="text-2xl" />
                        </div>
                    </div>

                    {/* Content side */}
                    <div>
                        <span className="text-primary text-sm font-bold uppercase tracking-widest">Our Story</span>
                        <h2 className="text-3xl md:text-4xl font-bold text-secondary mt-3 mb-6 font-heading leading-tight">
                            We are one of the leading brands specializing in manufacturing of commercial kitchen setups
                        </h2>
                        <div className="space-y-4 text-gray-600 leading-relaxed">
                            <p>
                                We are one of the leading brands specializing in the manufacturing, service, and installation of commercial kitchen setups in Surat.
                            </p>
                            <p>
                                With a legacy spanning over <span className="text-primary font-semibold">14 years</span> in the Indian hospitality industry, the AK Sales family has been synonymous with quality, innovation, and trust. Building on decades of expertise, AK Sales was officially established in 2007 and is headquartered in Gujarat, India.
                            </p>
                            <p>
                                Today, we are proud to be one of India's foremost manufacturers and suppliers of <span className="text-primary font-semibold">commercial kitchen equipment</span>, refrigeration and bakery equipment in Surat.
                            </p>
                            <p>
                                Our founding vision was simple yet ambitious: to deliver durable, high-quality kitchen setup solutions tailored to the needs of restaurants, hotels, cloud kitchens, bakeries, catering services, and institutional messes. With more than <span className="text-primary font-semibold">100 successful projects</span> completed across 16+ states in India, we've earned the trust of prestigious names including Ramada, Radisson, Taj, and Bikanerwala.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CompanyStory;
