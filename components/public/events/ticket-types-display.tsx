import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ticket } from 'lucide-react';
import { AddToCartButton } from '@/components/cart';
import type { TicketType, TicketTypePriceTier } from '@/prisma/generated/prisma/client';

type TicketTypeWithPriceTiers = TicketType & {
  priceTiers: TicketTypePriceTier[];
};

interface TicketTypesDisplayProps {
  eventId: string;
  ticketTypes: TicketTypeWithPriceTiers[];
}

const kindLabels: Record<string, string> = {
  GENERAL: 'General Admission',
  TABLE: 'Table Booking',
  SEAT: 'Seat',
};

export function TicketTypesDisplay({ eventId, ticketTypes }: TicketTypesDisplayProps) {
  if (ticketTypes.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-3 mb-3">
            <Ticket className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold mb-1">Tickets coming soon</h3>
          <p className="text-sm text-muted-foreground">
            Ticket sales for this event haven&apos;t started yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getCurrentPrice = (ticketType: TicketTypeWithPriceTiers): number => {
    const now = new Date();

    // Check price tiers in priority order
    for (const tier of ticketType.priceTiers) {
      if (tier.strategy === 'TIME_WINDOW') {
        const startsAt = tier.startsAt ? new Date(tier.startsAt) : null;
        const endsAt = tier.endsAt ? new Date(tier.endsAt) : null;

        if (startsAt && endsAt && now >= startsAt && now <= endsAt) {
          return tier.price;
        }
      } else if (tier.strategy === 'ALLOCATION') {
        // For allocation-based tiers, we'd need sold count - for now, show if allocation remains
        if (tier.allocationTotal && tier.allocationSold < tier.allocationTotal) {
          return tier.price;
        }
      }
    }

    // Fall back to base price
    return ticketType.basePrice;
  };

  const getAvailability = (ticketType: TicketTypeWithPriceTiers): string | null => {
    if (ticketType.quantityTotal === null) {
      return null; // Unlimited
    }
    const remaining = ticketType.quantityTotal - ticketType.quantitySold;
    if (remaining <= 0) {
      return 'Sold out';
    }
    if (remaining <= 10) {
      return `${remaining} left`;
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {ticketTypes.map((ticketType) => {
        const currentPrice = getCurrentPrice(ticketType);
        const availability = getAvailability(ticketType);
        const isSoldOut = availability === 'Sold out';

        return (
          <Card key={ticketType.id} className={isSoldOut ? 'opacity-60' : ''}>
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex gap-4">
                {ticketType.imageUrl && (
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md">
                    <Image
                      src={ticketType.imageUrl}
                      alt={ticketType.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{ticketType.name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {kindLabels[ticketType.kind] || ticketType.kind}
                    </Badge>
                    {availability && (
                      <Badge variant={isSoldOut ? 'outline' : 'destructive'} className="text-xs">
                        {availability}
                      </Badge>
                    )}
                  </div>
                  {ticketType.description && (
                    <p className="text-sm text-muted-foreground">
                      {ticketType.description}
                    </p>
                  )}
                </div>
              </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      PHP {currentPrice.toLocaleString()}
                    </div>
                    {currentPrice !== ticketType.basePrice && (
                      <div className="text-xs text-muted-foreground line-through">
                        PHP {ticketType.basePrice.toLocaleString()}
                      </div>
                    )}
                  </div>
                  <AddToCartButton
                    eventId={eventId}
                    ticketTypeId={ticketType.id}
                    ticketTypeName={ticketType.name}
                    price={currentPrice}
                    maxQuantity={ticketType.quantityTotal ? Math.min(10, ticketType.quantityTotal - ticketType.quantitySold) : 10}
                    disabled={isSoldOut}
                    disabledReason={isSoldOut ? 'Sold Out' : undefined}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
