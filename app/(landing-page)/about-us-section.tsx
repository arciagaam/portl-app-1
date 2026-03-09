import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function AboutUsSection() {
  return (
    <section id="about" className="w-full px-6 md:px-12 py-24 md:py-32">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12">
        {/* Label */}
        <div className="md:col-span-3">
          <span className="label-editorial">About Us</span>
        </div>

        {/* Editorial Paragraph */}
        <div className="md:col-span-9 flex flex-col gap-8">
          <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light leading-snug tracking-tight text-foreground">
            At Portl — we believe every night out should feel{' '}
            <span className="font-serif italic">unforgettable.</span> We connect
            people to the best events, venues, and experiences in their city.
            Whether you&apos;re an{' '}
            <span className="font-semibold">organizer</span> bringing a vision to
            life or a guest looking for something{' '}
            <span className="font-serif italic">extraordinary,</span> Portl is
            your gateway.
          </p>

          <Link
            href="#services"
            className="inline-flex items-center gap-2 label-editorial hover:text-foreground transition-colors w-fit"
          >
            Learn More
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
