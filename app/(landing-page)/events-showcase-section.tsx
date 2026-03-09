const words = [
  { text: 'NIGHTLIFE', ghost: true },
  { text: 'ELECTRIC', ghost: false },
  { text: 'RHYTHM', ghost: true },
  { text: 'AFTERDARK', ghost: true },
];

export default function EventsShowcaseSection() {
  return (
    <section className="relative w-full py-24 md:py-32 overflow-hidden section-glow-purple">
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col gap-8">
        {/* Progress Indicator */}
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm text-muted-foreground">
            01 / 04
          </span>
          <span className="label-editorial">Featured Events</span>
        </div>

        {/* Large Typography */}
        <div className="flex flex-col -space-y-4 md:-space-y-8 select-none">
          {words.map((word) => (
            <span
              key={word.text}
              className={`text-6xl sm:text-7xl md:text-8xl lg:text-[10rem] font-bold tracking-tighter leading-none ${
                word.ghost
                  ? 'text-foreground/10'
                  : 'text-gradient-purple font-serif italic'
              }`}
            >
              {word.text}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
