import { Badge } from '@/components/ui/badge';

const postings = [
  {
    title: 'Neon District: Underground Rave',
    venue: 'Black Market, Makati',
    date: 'Mar 15, 2025',
    tag: 'Electronic',
  },
  {
    title: 'Rooftop Sunset Sessions',
    venue: 'The Palace, BGC',
    date: 'Mar 22, 2025',
    tag: 'Lounge',
  },
  {
    title: 'After Dark: Hip-Hop Night',
    venue: 'Xylo, The Palace',
    date: 'Mar 29, 2025',
    tag: 'Hip-Hop',
  },
];

export default function PostingsSection() {
  return (
    <section className="w-full px-6 md:px-12 py-24 md:py-32">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="label-editorial">Featured Postings</span>
          <span className="label-editorial cursor-pointer hover:text-foreground transition-colors">
            See More
          </span>
        </div>

        {/* Large Featured Card */}
        <div className="relative aspect-[16/9] bg-muted rounded-sm overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-2">
            <Badge variant="secondary" className="w-fit">
              {postings[0].tag}
            </Badge>
            <h3 className="text-xl md:text-2xl font-medium text-white">
              {postings[0].title}
            </h3>
            <p className="text-sm text-white/70">
              {postings[0].venue} &middot; {postings[0].date}
            </p>
          </div>
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {postings.slice(1).map((posting) => (
            <div
              key={posting.title}
              className="relative aspect-[4/3] bg-muted rounded-sm overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 flex flex-col gap-2">
                <Badge variant="secondary" className="w-fit">
                  {posting.tag}
                </Badge>
                <h3 className="text-lg font-medium text-white">
                  {posting.title}
                </h3>
                <p className="text-sm text-white/70">
                  {posting.venue} &middot; {posting.date}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
