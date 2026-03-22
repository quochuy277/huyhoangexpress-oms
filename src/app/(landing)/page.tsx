import { Header } from "./components/Header";
import { HeroSection } from "./components/HeroSection";
import { StatsSection } from "./components/StatsSection";
import { AboutSection } from "./components/AboutSection";
import { ServicesSection } from "./components/ServicesSection";
import { PartnersSection } from "./components/PartnersSection";
import { BenefitsSection } from "./components/BenefitsSection";
import { ProcessSection } from "./components/ProcessSection";
import { TestimonialsSection } from "./components/TestimonialsSection";
import { FAQSection } from "./components/FAQSection";
import { RegisterForm } from "./components/RegisterForm";
import { Footer } from "./components/Footer";
import { ZaloChatWidget } from "./components/ZaloChatWidget";
import { ScrollToTop } from "./components/ScrollToTop";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <Header />
      <HeroSection />
      <StatsSection />
      <AboutSection />
      <ServicesSection />
      <PartnersSection />
      <BenefitsSection />
      <ProcessSection />
      <TestimonialsSection />
      <FAQSection />
      <RegisterForm />
      <Footer />
      <ZaloChatWidget />
      <ScrollToTop />
    </main>
  );
}
