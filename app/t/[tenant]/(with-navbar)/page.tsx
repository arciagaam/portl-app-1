import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getPublicTenantPageData } from '@/app/actions/tenant-page';
import { PublicEventCard } from '@/components/public/events/public-event-card';
import { Button } from '@/components/ui/button';
import { Instagram, Facebook, Twitter, Globe, Music2 } from 'lucide-react';

type PageProps = {
  params: Promise<{ tenant: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tenant: subdomain } = await params;
  const result = await getPublicTenantPageData(subdomain);

  if (result.error || !result.data) {
    return { title: 'Not Found' };
  }

  const { name, tagline, bannerUrl } = result.data;

  return {
    title: name,
    description: tagline || `${name} on Portl`,
    openGraph: {
      title: name,
      description: tagline || `${name} on Portl`,
      ...(bannerUrl ? { images: [{ url: bannerUrl }] } : {}),
    },
  };
}

export default async function TenantLandingPage({ params }: PageProps) {
  const { tenant: subdomain } = await params;
  const result = await getPublicTenantPageData(subdomain);

  if (result.error || !result.data) {
    notFound();
  }

  const tenant = result.data;
  const hasSocials = tenant.socialInstagram || tenant.socialFacebook || tenant.socialTwitter || tenant.socialTiktok || tenant.socialWebsite;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative flex items-center justify-center min-h-[60vh] overflow-hidden">
        {/* Background */}
        {tenant.bannerUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${tenant.bannerUrl})` }}
          >
            <div className="absolute inset-0 bg-black/60" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900" />
        )}

        {/* Content */}
        <div className="relative z-10 text-center px-6 py-20 max-w-3xl mx-auto">
          {tenant.logoUrl && (
            <Image
              src={tenant.logoUrl}
              alt={tenant.name}
              width={200}
              height={80}
              className="h-20 w-auto mx-auto mb-6 object-contain"
            />
          )}
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white">
            {tenant.name}
          </h1>
          {tenant.tagline && (
            <p className="mt-4 text-lg md:text-xl text-zinc-300">
              {tenant.tagline}
            </p>
          )}
          <div className="mt-8">
            <Link href="/events">
              <Button size="lg" className="text-base px-8">
                View Events
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Events Section */}
      {tenant.events.length > 0 && (
        <section className="py-16 px-6 md:px-12">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                Upcoming Events
              </h2>
              <Link
                href="/events"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                View all
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {tenant.events.map((event) => (
                <PublicEventCard
                  key={event.id}
                  event={event}
                  tenantSubdomain={subdomain}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Gallery Section */}
      {tenant.images.length > 0 && (
        <section className="py-16 px-6 md:px-12 bg-muted/30">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-8">
              Gallery
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tenant.images.map((image, index) => (
                <div
                  key={image.id}
                  className="group overflow-hidden rounded-lg"
                >
                  <div className="relative aspect-[16/9] overflow-hidden">
                    <Image
                      src={image.url}
                      alt={`${tenant.name} gallery ${index + 1}`}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* About Section */}
      {(tenant.description || tenant.contactEmail) && (
        <section className="py-16 px-6 md:px-12">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-6">
              About
            </h2>
            {tenant.description && (
              <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                {tenant.description}
              </p>
            )}
            {tenant.contactEmail && (
              <p className="mt-6 text-sm text-muted-foreground">
                Contact:{' '}
                <a
                  href={`mailto:${tenant.contactEmail}`}
                  className="text-foreground hover:underline"
                >
                  {tenant.contactEmail}
                </a>
              </p>
            )}
          </div>
        </section>
      )}

      {/* Social Links Section */}
      {hasSocials && (
        <section className="py-12 px-6 md:px-12 border-t">
          <div className="max-w-3xl mx-auto flex items-center justify-center gap-6">
            {tenant.socialInstagram && (
              <a
                href={tenant.socialInstagram}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-6 w-6" />
              </a>
            )}
            {tenant.socialFacebook && (
              <a
                href={tenant.socialFacebook}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-6 w-6" />
              </a>
            )}
            {tenant.socialTwitter && (
              <a
                href={tenant.socialTwitter}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-6 w-6" />
              </a>
            )}
            {tenant.socialTiktok && (
              <a
                href={tenant.socialTiktok}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="TikTok"
              >
                <Music2 className="h-6 w-6" />
              </a>
            )}
            {tenant.socialWebsite && (
              <a
                href={tenant.socialWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Website"
              >
                <Globe className="h-6 w-6" />
              </a>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
