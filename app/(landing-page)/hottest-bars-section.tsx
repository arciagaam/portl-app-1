import { ArrowRight } from 'lucide-react';

export default function HottestBarsSection() {
  return (
    <section className="w-full px-6 md:px-12 py-20 md:py-28">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <h2 className="text-3xl md:text-4xl font-light tracking-tight">
            Hottest <span className="font-semibold">bars</span>
          </h2>
          <p className="text-muted-foreground text-sm max-w-md">
            Curated experiences from the top 10 venues in the city. Explore these places now.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Venue Card */}
          <div className="relative aspect-[4/3] bg-muted/50 rounded-2xl overflow-hidden border border-border group cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5">
              <span className="text-xs bg-white/10 backdrop-blur-sm text-white/90 px-3 py-1 rounded-full border border-white/10">
                Featured
              </span>
              <h3 className="text-xl font-medium text-white mt-2">re_arts</h3>
              <p className="text-sm text-white/60 mt-1">Makati City</p>
            </div>
          </div>

          {/* Reservation CTA Card */}
          <div className="relative aspect-[4/3] bg-card rounded-2xl overflow-hidden border border-border flex flex-col justify-between p-6 md:p-8 group cursor-pointer">
            {/* Background image with overlay */}
            <div className="absolute inset-0 bg-muted/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/90 to-card/60" />

            <div className="relative z-10 flex flex-col justify-between h-full">
              <div className="flex flex-col gap-3">
                <p className="text-muted-foreground text-sm">Do you want to make a</p>
                <h3 className="text-2xl md:text-3xl font-light tracking-tight">
                  reservation?
                </h3>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-foreground transition-colors mt-auto">
                <span>Browse venues</span>
                <ArrowRight className="size-4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
