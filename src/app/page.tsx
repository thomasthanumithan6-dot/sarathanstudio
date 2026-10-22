import Hero from "@/components/Hero";
import About from "@/components/About";
import Services from "@/components/Services";
import PortfolioGallery from "@/components/PortfolioGallery";
import Packages from "@/components/Packages";
import ContactSection from "@/components/ContactSection";

export default function HomePage() {
  return (
    <>
      <Hero />
      <About />
      <Services />
      <PortfolioGallery />
      <Packages />
      <ContactSection />
    </>
  );
}
