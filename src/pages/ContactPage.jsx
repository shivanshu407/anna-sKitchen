import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaHome, FaChevronRight, FaPhone, FaEnvelope, FaMapMarkerAlt, FaWhatsapp } from 'react-icons/fa';
import CTA from '../components/CTA';
import ClientSlider from '../components/ClientSlider';
import PartnerSlider from '../components/PartnerSlider';
import QuoteBar from '../components/QuoteBar';
import { openWhatsApp } from '../lib/whatsapp';

const productCategories = [
    { name: 'Bakery Products', slug: 'bakery-products' },
    { name: 'Refrigeration', slug: 'refrigeration' },
    { name: 'Heating Range', slug: 'heating-range' },
    { name: 'Chat & Fast Food Counter', slug: 'chat-and-fast-food-counter' },
    { name: 'Work & Profession Table', slug: 'work-and-profession-table' },
    { name: 'Rack Trolley', slug: 'rack-trolley' },
    { name: 'Processing', slug: 'processing' },
];

const ContactPage = () => {
    const EMPTY_ENQUIRY = { name: '', mobile: '', email: '', budget: '', address: '', message: '' };
    const [enquiry, setEnquiry] = useState(EMPTY_ENQUIRY);
    const [enquiryError, setEnquiryError] = useState('');

    const updateEnquiry = (field) => (e) => {
        setEnquiry((prev) => ({ ...prev, [field]: e.target.value }));
        if (enquiryError) setEnquiryError('');
    };

    // Hands off to WhatsApp with the details filled in. Previously this form had
    // no submit handler at all, so the browser reloaded the page and the enquiry
    // was lost without anyone being told.
    const handleEnquirySubmit = (e) => {
        e.preventDefault();

        if (!enquiry.name.trim() || !enquiry.mobile.trim()) {
            setEnquiryError('Please enter your name and mobile number.');
            return;
        }

        openWhatsApp({
            intro: 'Hi AK Sales, I have an enquiry.',
            fields: {
                Name: enquiry.name,
                Mobile: enquiry.mobile,
                Email: enquiry.email,
                Budget: enquiry.budget,
                Address: enquiry.address,
            },
            note: enquiry.message,
        });
    };

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
                        Contact <span className="text-accent">Us</span>
                    </h1>
                    <div className="flex items-center gap-2 text-sm text-white/70 mt-4">
                        <Link to="/" className="hover:text-accent transition-colors flex items-center gap-1">
                            <FaHome className="text-xs" /> Home
                        </Link>
                        <FaChevronRight className="text-xs text-white/40" />
                        <span className="text-accent">Contact Us</span>
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

            {/* Contact Section */}
            <div className="max-w-6xl mx-auto px-4 pb-16">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Left - Contact Info */}
                    <div>
                        <h2 className="text-3xl md:text-4xl font-bold text-secondary font-heading">
                            Get in <span className="text-primary">touch</span> with us
                        </h2>
                        <p className="text-gray-medium text-sm mt-2 mb-8">We'd love to hear from you</p>

                        {/* Phone & Email Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                            {/* Phone */}
                            <div className="bg-gold-lighter rounded-xl p-6 border border-primary/10 hover:border-primary/30 transition-colors duration-300">
                                <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl flex items-center justify-center mb-4">
                                    <FaPhone className="text-primary text-lg" />
                                </div>
                                <h3 className="font-bold text-secondary font-heading text-sm mb-2">Phone Number</h3>
                                <a href="tel:+919106780688" className="text-gray-medium text-sm hover:text-primary transition-colors block">
                                    +91 91067 80688
                                </a>
                            </div>

                            {/* Email */}
                            <div className="bg-gold-lighter rounded-xl p-6 border border-primary/10 hover:border-primary/30 transition-colors duration-300">
                                <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl flex items-center justify-center mb-4">
                                    <FaEnvelope className="text-primary text-lg" />
                                </div>
                                <h3 className="font-bold text-secondary font-heading text-sm mb-2">Email Address</h3>
                                <a href="mailto:annaskitchenequipment@gmail.com" className="text-gray-medium text-sm hover:text-primary transition-colors block break-all">
                                    annaskitchenequipment@gmail.com
                                </a>
                            </div>
                        </div>

                        {/* Address */}
                        <div className="bg-gold-lighter rounded-xl p-6 border border-primary/10 hover:border-primary/30 transition-colors duration-300 mb-6">
                            <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl flex items-center justify-center mb-4">
                                <FaMapMarkerAlt className="text-primary text-lg" />
                            </div>
                            <h3 className="font-bold text-secondary font-heading text-sm mb-2">Address</h3>
                            <p className="text-gray-medium text-sm leading-relaxed">
                                Near Nayara Petrol Pump, Bhatha, Surat, Gujarat 394510
                            </p>
                        </div>

                        {/* WhatsApp Button */}
                        <a
                            href="https://wa.me/919106780688"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-3 bg-green-500 text-white px-6 py-3 rounded-full font-semibold text-sm hover:bg-green-600 hover:shadow-lg hover:shadow-green-500/30 transition-all duration-300"
                        >
                            <FaWhatsapp className="text-lg" />
                            Chat on WhatsApp
                        </a>
                    </div>

                    {/* Right - Contact Form */}
                    <div>
                        <div className="bg-secondary rounded-2xl p-8 shadow-2xl">
                            <p className="text-accent text-xs font-bold uppercase tracking-widest mb-1">
                                Ready to upgrade your kitchen?
                            </p>
                            <h3 className="text-2xl md:text-3xl font-bold text-white font-heading mb-8">
                                Contact us today!
                            </h3>

                            <form className="space-y-4" onSubmit={handleEnquirySubmit}>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        placeholder="Your Name"
                                        aria-label="Your name"
                                        value={enquiry.name}
                                        onChange={updateEnquiry('name')}
                                        className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder:text-white/40 outline-none focus:border-accent/50 transition-colors"
                                    />
                                    <input
                                        type="tel"
                                        placeholder="Your Mobile"
                                        aria-label="Your mobile"
                                        value={enquiry.mobile}
                                        onChange={updateEnquiry('mobile')}
                                        className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder:text-white/40 outline-none focus:border-accent/50 transition-colors"
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <input
                                        type="email"
                                        placeholder="Your Email"
                                        aria-label="Your email"
                                        value={enquiry.email}
                                        onChange={updateEnquiry('email')}
                                        className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder:text-white/40 outline-none focus:border-accent/50 transition-colors"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Your Budget"
                                        aria-label="Your budget"
                                        value={enquiry.budget}
                                        onChange={updateEnquiry('budget')}
                                        className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder:text-white/40 outline-none focus:border-accent/50 transition-colors"
                                    />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Full Address"
                                    aria-label="Full address"
                                    value={enquiry.address}
                                    onChange={updateEnquiry('address')}
                                    className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder:text-white/40 outline-none focus:border-accent/50 transition-colors"
                                />
                                <textarea
                                    placeholder="Message"
                                    rows="4"
                                    aria-label="Message"
                                    value={enquiry.message}
                                    onChange={updateEnquiry('message')}
                                    className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-3 text-white text-sm placeholder:text-white/40 outline-none focus:border-accent/50 transition-colors resize-none"
                                />
                                <div className="flex items-center justify-between gap-4 pt-2">
                                    <div className="flex items-center gap-2 text-white/40 text-xs">
                                        {enquiryError
                                            ? <span role="alert" className="text-red-300">{enquiryError}</span>
                                            : <span>Opens WhatsApp with your details</span>}
                                    </div>
                                    <button
                                        type="submit"
                                        className="bg-gradient-to-r from-primary to-accent text-secondary px-8 py-3 rounded-lg font-bold text-sm hover:shadow-xl hover:shadow-accent/20 transition-all duration-300"
                                    >
                                        Send on WhatsApp
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* Google Map */}
            <div className="w-full h-[350px] bg-gray-200">
                <iframe
                    title="AK Sales Location"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3719.0!2d72.8!3d21.2!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sBhatha%2C%20Surat%2C%20Gujarat%20394510!5e0!3m2!1sen!2sin!4v1"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen=""
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                />
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

            {/* CTA */}
            <CTA />
        </div>
    );
};

export default ContactPage;
