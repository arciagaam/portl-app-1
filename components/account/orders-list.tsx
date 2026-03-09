import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronRight } from 'lucide-react';
import type { OrderListItem } from '@/lib/types/order';

interface OrdersListProps {
  orders: OrderListItem[];
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  CONFIRMED: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
  REFUNDED: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
  PARTIALLY_REFUNDED: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
  PARTIALLY_REFUNDED: 'Partially Refunded',
};

export function OrdersList({ orders }: OrdersListProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatEventDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <Card key={order.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={statusColors[order.status]}>
                    {statusLabels[order.status]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    #{order.orderNumber}
                  </span>
                </div>

                <div>
                  <h3 className="font-semibold">{order.event.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {order.event.tenant.name}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatEventDate(order.event.startDate)}
                  </span>
                  <span>
                    {order._count.tickets} {order._count.tickets === 1 ? 'ticket' : 'tickets'}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground">
                  Ordered on {formatDate(order.createdAt)}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-semibold">
                    PHP {order.total.toLocaleString()}
                  </p>
                </div>
                <Button variant="ghost" size="icon" asChild>
                  <Link href={`/account/orders/${order.id}`}>
                    <ChevronRight className="h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
