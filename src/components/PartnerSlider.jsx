import { startAutoScroll } from '../lib/auto-scroll';
import Image from './Image';
import { useEffect, useRef } from 'react';

const partnerLogos = [
    { name: 'Cellfrost', logo: '/partners/cellfrost.webp', bg: '#000' },
    { name: 'Rational', logo: '/partners/rational.svg' },
    { name: 'Vitamix', logo: '/partners/vitamix.webp' },
    { name: 'Rockwell', logo: '/partners/rockwell.webp' },
    { name: 'TRUFROST', logo: '/partners/trufrost.webp' },
    { name: 'Western', logo: '/partners/western.webp' },
    { name: 'EzyCoock', logo: '/partners/ezycoock.webp' },
    { name: 'Butler', logo: '/partners/butler.webp' },
];

const PartnerSlider = () => {
    const scrollRef = useRef(null);

    useEffect(() => startAutoScroll(scrollRef.current), []);

    const allPartners = [...partnerLogos, ...partnerLogos];

    return (
        <section className="bg-gold-light py-6 md:py-8">
            <div className="max-w-7xl mx-auto px-4">
                <h2 className="text-center text-sm font-semibold text-secondary mb-8 tracking-wide uppercase">
                    Business Partners
                </h2>
                <div
                    ref={scrollRef}
                    className="flex items-center gap-8 overflow-hidden"
                    style={{ scrollBehavior: 'auto' }}
                >
                    {allPartners.map((partner, index) => (
                        <div
                            key={index}
                            className={`flex-shrink-0 rounded-xl px-8 py-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-primary/20 transition-all duration-300 flex items-center justify-center ${partner.bg ? '' : 'bg-white'}`}
                            style={{ minWidth: '180px', height: '90px', backgroundColor: partner.bg || undefined }}
                        >
                            <Image
                                loading="lazy"
                                    sizes="150px"
                                decoding="async"
                                src={partner.logo}
                                alt={partner.name}
                                className="max-h-16 max-w-[140px] object-contain transition-all duration-300"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default PartnerSlider;

