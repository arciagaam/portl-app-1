import HeroSection from './hero-section';
import HighlightsSection from './highlights-section';
import HottestBarsSection from './hottest-bars-section';
import PublishSection from './publish-section';
import FaqSection from './faq-section';

export default async function HomePage() {
  return (
    <>
      <HeroSection />
      <HighlightsSection />
      <HottestBarsSection />
      <PublishSection />
      <FaqSection />
    </>
  );
}
