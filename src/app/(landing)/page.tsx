import { prisma } from "@/lib/prisma";
import { Header } from "./components/Header";
import { HeroSection } from "./components/HeroSection";
import { StatsSection, type LandingStats } from "./components/StatsSection";
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

const LANDING_BASE_ORDERS = 200_000;
const LANDING_BASE_SHOPS = 250;

async function getLandingStats(): Promise<LandingStats> {
  try {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const [totalOrders, activeShopsResult, deliveredCount, totalFinished] =
      await Promise.all([
        prisma.order.count(),
        prisma.order.groupBy({
          by: ["shopName"],
          where: { createdTime: { gte: sixtyDaysAgo }, shopName: { not: null } },
          _count: true,
        }),
        prisma.order.count({
          where: { deliveryStatus: { in: ["DELIVERED", "RECONCILED"] } },
        }),
        prisma.order.count({
          where: { deliveryStatus: { notIn: ["PROCESSING", "IN_TRANSIT", "DELIVERING"] } },
        }),
      ]);

    const successRate = totalFinished > 0
      ? Math.round((deliveredCount / totalFinished) * 1000) / 10
      : 0;

    return {
      totalOrders: LANDING_BASE_ORDERS + totalOrders,
      activeShops: LANDING_BASE_SHOPS + activeShopsResult.length,
      successRate,
    };
  } catch (err) {
    console.warn("[LandingPage] Failed to prefetch stats:", err);
    return { totalOrders: LANDING_BASE_ORDERS, activeShops: LANDING_BASE_SHOPS, successRate: 0 };
  }
}

export default async function LandingPage() {
  const stats = await getLandingStats();

  return (
    <main className="min-h-screen">
      <Header />
      <HeroSection />
      <StatsSection initialStats={stats} />
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
