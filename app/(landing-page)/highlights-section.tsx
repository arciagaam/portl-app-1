import { Users } from 'lucide-react';

const highlights = [
  {
    title: 'Prxzml',
    category: 'Electronic',
    price: '2,500',
    attendees: '2,000',
    image: null,
  },
  {
    title: 'Classics',
    category: 'R&B',
    price: '1,500',
    attendees: null,
    image: null,
  },
  {
    title: 'ZNTHE',
    category: 'Hip-Hop',
    price: '1,800',
    attendees: null,
    image: null,
  },
];

export default function HighlightsSection() {
  return (
    <section id="highlights" className="w-full px-6 md:px-12 py-20 md:py-28">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl md:text-4xl font-light tracking-tight">
            This week&apos;s <span className="font-semibold">highlights</span>
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg">
            Highlighting experiences from the best partners in the city. Book now before they sell out.
          </p>
        </div>

        {/* Event Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {highlights.map((event) => (
            <div
              key={event.title}
              className="group flex flex-col gap-3 cursor-pointer"
            >
              {/* Image */}
              <div className="relative aspect-[3/4] bg-muted/50 rounded-2xl overflow-hidden border border-border">
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                {/* Category badge */}
                <div className="absolute top-3 left-3">
                  <span className="text-xs bg-white/10 backdrop-blur-sm text-white/90 px-3 py-1 rounded-full border border-white/10">
                    {event.category}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="flex flex-col gap-1 px-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-medium group-hover:text-landing-accent transition-colors">
                    {event.title}
                  </h3>
                  <span className="text-xs text-muted-foreground">{event.category}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">
                    &#8369; {event.price}
                  </span>
                  {event.attendees && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="size-3" />
                      {event.attendees}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
