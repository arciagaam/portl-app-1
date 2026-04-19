import { Globe, CreditCard, Settings } from 'lucide-react';

const features = [
  {
    icon: Globe,
    title: 'Wide Reach',
    description: 'Get your events seen by thousands of potential attendees in your city.',
  },
  {
    icon: CreditCard,
    title: 'Easy Payments',
    description: 'Accept payments seamlessly with integrated Philippine payment methods.',
  },
  {
    icon: Settings,
    title: 'Event Management',
    description: 'Manage tickets, check-ins, and analytics all from one dashboard.',
  },
];

export default function PublishSection() {
  return (
    <section className="w-full px-6 md:px-12 py-20 md:py-28">
      <div className="max-w-7xl mx-auto">
        {/* Main CTA Card */}
        <div className="bg-card rounded-2xl border border-border p-8 md:p-12 flex flex-col gap-10">
          {/* Header */}
          <div className="flex flex-col items-center text-center gap-3">
            <h2 className="text-3xl md:text-4xl font-light tracking-tight">
              Publish event with <span className="font-semibold">Portl</span>
            </h2>
            <p className="text-muted-foreground text-sm max-w-lg">
              Reach thousands of event-goers across the Philippines. Our platform makes it easy to create, promote, and manage your events.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-background rounded-xl border border-border p-5 flex flex-col gap-3"
              >
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                  <feature.icon className="size-4 text-foreground" />
                </div>
                <h3 className="text-sm font-medium">{feature.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
