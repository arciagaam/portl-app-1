import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function CtaSection() {
  return (
    <section className="w-full px-6 md:px-12 py-24 md:py-32">
      <div className="max-w-7xl mx-auto flex flex-col items-center text-center gap-6">
        <span className="label-editorial">Ready to get started?</span>
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tight leading-tight">
          Your next <span className="font-serif italic text-gradient-purple">unforgettable</span>
          <br />
          night starts here
        </h2>
        <p className="text-muted-foreground text-base md:text-lg max-w-md">
          Create your free account and start discovering or hosting events today.
        </p>
        <Button size="lg" asChild className="mt-2">
          <Link href="/auth/signup">
            Get Started
            <ArrowRight className="size-4 ml-2" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
