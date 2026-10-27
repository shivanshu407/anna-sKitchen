import { FaPhone, FaEnvelope, FaMapMarkerAlt, FaFacebookF, FaInstagram, FaYoutube, FaLinkedinIn } from 'react-icons/fa';

const TopBar = () => {
    return (
        <div className="bg-secondary text-white text-sm hidden md:block">
            <div className="max-w-7xl mx-auto px-4 flex justify-between items-center py-2">
                <div className="flex items-center gap-6">
                    <a href="tel:+919106780688" className="flex items-center gap-2 hover:text-accent transition-colors">
                        <FaPhone className="text-accent text-xs" />
                        <span>+91-91067 80688</span>
                    </a>
                    <a href="mailto:annaskitchenequipment@gmail.com" className="flex items-center gap-2 hover:text-accent transition-colors">
                        <FaEnvelope className="text-accent text-xs" />
                        <span>annaskitchenequipment@gmail.com</span>
                    </a>
                    <span className="flex items-center gap-2">
                        <FaMapMarkerAlt className="text-accent text-xs" />
                        <span>Bhatha, Surat, Gujarat 394510</span>
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <a href="#" aria-label="Facebook" className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-accent hover:text-secondary transition-all duration-300">
                        <FaFacebookF className="text-xs" />
                    </a>
                    <a href="https://www.instagram.com/annas_kitchen_equipments" aria-label="AK Sales on Instagram" target="_blank" rel="noopener noreferrer" className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-accent hover:text-secondary transition-all duration-300">
                        <FaInstagram className="text-xs" />
                    </a>

                </div>
            </div>
        </div>
    );
};

export default TopBar;
