import { ArrowDown } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center hero-glow pt-24 pb-16 px-6 md:px-12">
      <div className="max-w-7xl mx-auto w-full flex flex-col gap-12">
        {/* Headline */}
        <div className="flex flex-col gap-4">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-light tracking-tight leading-[1.05]">
            Your portal to
            <br />
            <span className="font-serif italic text-gradient-purple">nightlife</span>
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-lg leading-relaxed mt-2">
            Discover, book, and experience the best events in your city.
          </p>
        </div>

        {/* Preview Thumbnails */}
        <div className="flex gap-4">
          <div className="w-32 h-44 md:w-40 md:h-56 bg-muted rounded-sm" />
          <div className="w-32 h-44 md:w-40 md:h-56 bg-muted rounded-sm" />
          <div className="w-32 h-44 md:w-40 md:h-56 bg-muted rounded-sm" />
        </div>

        {/* Bottom Bar */}
        <div className="flex items-center justify-between border-t border-border pt-6">
          <span className="label-editorial">See Events</span>
          <div className="flex items-center gap-2 label-editorial">
            <span>Scroll Now</span>
            <ArrowDown className="size-3.5 animate-scroll-bounce" />
          </div>
        </div>
      </div>
    </section>
  );
}
