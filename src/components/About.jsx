import { FaArrowRight } from 'react-icons/fa';

const highlights = [
    {
        title: '3.5 Lakh Sq. Ft. of Infrastructure',
        image: '/images/a1.webp',
    },
    {
        title: 'Cutting-Edge Technology in Action',
        image: '/images/a2.webp',
    },
    {
        title: 'A team of 1,000+ people',
        image: '/images/a3.webp',
    },
];

const About = () => {
    return (
        <section id="about" className="section-padding bg-gold-light">
            <div className="max-w-7xl mx-auto">
                <div className="mb-10">
                    <span className="text-primary text-sm font-bold uppercase tracking-widest">Why Choose Us</span>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-secondary mt-3 font-heading">
                        AK Sales
                    </h2>
                    <p className="text-gray-600 text-sm leading-relaxed mt-4 max-w-3xl">
                        Leading brands and businesses choose AK Sales for our commitment to quality, performance, and customer satisfaction.
                    </p>
                </div>

                {/* Why Choose Us Points */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
                    {[
                        { title: 'Premium Quality & Durability', desc: 'We use only high-grade stainless steel and components, ensuring all our products are durable, hygienic, corrosion-resistant & built to withstand the demands of heavy usage.' },
                        { title: 'Customized Solutions', desc: 'No two kitchens are the same. We offer bespoke design, planning, and tailor-made equipment solutions to fit your specific space, menu, and operational requirements.' },
                        { title: '360-Degree Support', desc: "Our service doesn't end with a sale. We provide end-to-end support including consultation, installation, design, commissioning & prompt after-sales service and maintenance." },
                        { title: 'Innovation & Efficiency', desc: 'Our products incorporate advanced technology, focusing on energy efficiency and safety to reduce operational costs and environmental impact.' },
                        { title: 'Trusted Expertise', desc: 'With decades of experience, our team of skilled engineers, designers, and technicians ensures every product meets stringent quality control standards and international regulations.' },
                    ].map((item, i) => (
                        <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
                            <h4 className="text-primary font-bold text-base mb-2">{item.title}</h4>
                            <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                    {highlights.map((item, index) => (
                        <div
                            key={index}
                            className="group"
                        >
                            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-4 shadow-md">
                                <img
                                    src={item.image}
                                    alt={item.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                            </div>
                            <h3 className="text-base md:text-lg font-bold text-secondary font-heading">
                                {item.title}
                            </h3>
                        </div>
                    ))}
                </div>

                <div className="text-center mt-10">
                    <a href="/about" className="inline-flex items-center gap-2 text-primary font-semibold text-sm hover:gap-4 transition-all duration-300 group">
                        Read More
                        <FaArrowRight className="text-xs group-hover:translate-x-1 transition-transform" />
                    </a>
                </div>
            </div>
        </section>
    );
};

export default About;
