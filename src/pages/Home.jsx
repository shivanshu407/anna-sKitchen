import TopBar from '../components/TopBar';
import Header from '../components/Header';
import Hero from '../components/Hero';
import ClientSlider from '../components/ClientSlider';
import About from '../components/About';
import Projects from '../components/Projects';
import Stats from '../components/Stats';
import EquipmentRange from '../components/EquipmentRange';
import CompanyStory from '../components/CompanyStory';
import Features from '../components/Features';
import Testimonials from '../components/Testimonials';
import BlogSection from '../components/BlogSection';
import FAQ from '../components/FAQ';
import CTA from '../components/CTA';
import Footer from '../components/Footer';
import PartnerSlider from '../components/PartnerSlider';

const Home = () => {
    return (
        <>
            <Hero />
            <ClientSlider />
            <About />
            <Projects />
            <Stats />
            <EquipmentRange />
            <PartnerSlider />
            <CompanyStory />
            {/* <Features /> */}
            <Testimonials />
            <BlogSection />
            <FAQ />
            <CTA />
        </>
    );
};

export default Home;
