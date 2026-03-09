import HeroSection from './hero-section';
import AboutUsSection from './about-us-section';
import PostingsSection from './postings-section';
import ServicesSection from './services-section';
import EventsShowcaseSection from './events-showcase-section';
import FaqSection from './faq-section';
import CtaSection from './cta-section';

export default async function HomePage() {
  return (
    <>
      <HeroSection />
      <AboutUsSection />
      <PostingsSection />
      <ServicesSection />
      <EventsShowcaseSection />
      <FaqSection />
      <CtaSection />
    </>
  );
}
