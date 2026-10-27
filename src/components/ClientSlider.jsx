import { startAutoScroll } from '../lib/auto-scroll';
import Image from './Image';
import { useEffect, useRef } from 'react';

const clientLogos = [
    { name: 'Mahal', image: '/clients/logo.webp' },
    { name: 'Bar Stock Exchange', image: '/clients/unnamed-2.webp' },
    { name: 'SLMG Beverages', image: '/clients/logo-1.webp' },
    { name: 'Amul', image: '/clients/amul-official-logo.svg' },
    { name: 'Haldiram', image: '/clients/haldiram-logo-9gn.webp' },
    { name: 'Atul Bakery', image: '/clients/atul-bakery-logo-new.svg' },
    { name: 'Subway', image: '/clients/subway-logo-e7b602efa8e0c7316077.webp' },
    { name: 'Sumul Dairy', image: '/clients/sumul-dairy-logo.webp' },
    { name: 'OYO', image: '/clients/download-1.webp' },
    { name: 'Client', image: '/clients/487824977-122233010432025315-6264959669572713421-n.webp' },
    // { name: 'Client', image: '/clients/whatsapp-image-2026-02-26-at-17-33-43.webp' },
    { name: 'Client', image: '/clients/whatsapp-image-2026-02-26-at-17-33-43-1.webp' },
    { name: 'Client', image: '/clients/unnamed.webp' },
    { name: 'IRCTC', image: '/clients/irctc.webp' },
];

const ClientSlider = () => {
    const scrollRef = useRef(null);

    useEffect(() => startAutoScroll(scrollRef.current), []);

    // Duplicate logos for seamless loop
    const allLogos = [...clientLogos, ...clientLogos];

    return (
        <section className="bg-gold-light py-6 md:py-8">
            <div className="max-w-7xl mx-auto px-4">
                <h2 className="text-center text-sm font-semibold text-secondary mb-8 tracking-wide uppercase">
                    Our Clients
                </h2>
                <div
                    ref={scrollRef}
                    className="flex items-center gap-8 overflow-hidden"
                    style={{ scrollBehavior: 'auto' }}
                >
                    {allLogos.map((client, index) => (
                        <div
                            key={index}
                            className="flex-shrink-0 bg-white rounded-xl px-6 py-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-primary/20 transition-all duration-300 flex items-center justify-center"
                            style={{ minWidth: '180px', height: '90px' }}
                        >
                            <Image
                                loading="lazy"
                                    sizes="150px"
                                decoding="async"
                                src={client.image}
                                alt={client.name}
                                className="max-h-14 max-w-[150px] object-contain transition-all duration-300"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ClientSlider;
