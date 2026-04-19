'use client';

import { ChevronDown } from 'lucide-react';

export default function HeroSection() {
  const scrollToHighlights = () => {
    document.getElementById('highlights')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex flex-col justify-center pt-20 pb-16 px-6 md:px-12 overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-white/[0.015] rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto w-full flex flex-col items-center justify-center flex-1 relative">
        {/* Center headline */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-light tracking-tight leading-[1.1] text-center">
          Infinite
          <br />
          <span className="font-serif italic text-landing-accent">experiences</span>
          <br />
          one <span className="font-semibold">Portl</span>
        </h1>

        {/* Scroll indicator */}
        <button
          onClick={scrollToHighlights}
          className="mt-16 flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          aria-label="Scroll to highlights"
        >
          <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center">
            <ChevronDown className="size-4 animate-scroll-bounce" />
          </div>
        </button>
      </div>
    </section>
  );
}
