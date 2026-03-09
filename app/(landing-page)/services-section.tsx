const services = [
  {
    number: '01',
    name: 'Event Ticketing',
    description:
      'Flexible ticket types, price tiers, and promotions — everything you need to sell out your next event.',
  },
  {
    number: '02',
    name: 'Nightlife Discovery',
    description:
      'Help guests find the best nights out in their city with curated listings and real-time availability.',
  },
  {
    number: '03',
    name: 'Organizer Tools',
    description:
      'Branded pages, team management, QR check-in, and analytics to run your events like a pro.',
  },
];

export default function ServicesSection() {
  return (
    <section id="services" className="w-full px-6 md:px-12 py-24 md:py-32">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <span className="label-editorial">What We Do</span>
          <h2 className="text-3xl md:text-4xl font-light tracking-tight">
            Services
          </h2>
        </div>

        {/* Service Rows */}
        <div className="flex flex-col">
          {services.map((service) => (
            <div
              key={service.number}
              className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 py-10 border-t border-border items-center"
            >
              {/* Number + Name */}
              <div className="md:col-span-4 flex items-baseline gap-4">
                <span className="font-mono text-sm text-muted-foreground">
                  {service.number}
                </span>
                <h3 className="text-xl md:text-2xl font-medium tracking-tight">
                  {service.name}
                </h3>
              </div>

              {/* Placeholder Images */}
              <div className="md:col-span-4 flex gap-3">
                <div className="w-24 h-32 md:w-28 md:h-36 bg-muted rounded-sm -rotate-3" />
                <div className="w-24 h-32 md:w-28 md:h-36 bg-muted rounded-sm rotate-3" />
              </div>

              {/* Description */}
              <div className="md:col-span-4">
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {service.description}
                </p>
              </div>
            </div>
          ))}
          <div className="border-t border-border" />
        </div>
      </div>
    </section>
  );
}
