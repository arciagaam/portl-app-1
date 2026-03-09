'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Users, TrendingUp, ChevronDown, ChevronRight } from 'lucide-react';
import { formatPhp } from '@/lib/format';

interface OrderTicket {
  id: string;
  ticketCode: string;
  status: string;
  holderFirstName: string | null;
  holderLastName: string | null;
  holderEmail: string | null;
  ticketType: { name: string };
}

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  ticketType: { id: string; name: string; kind: string };
}

interface OrderUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  total: number;
  completedAt: Date | null;
  createdAt: Date;
  user: OrderUser;
  items: OrderItem[];
  tickets: OrderTicket[];
}

interface OrdersSectionProps {
  orders: Order[];
  stats: {
    totalOrders: number;
    totalTickets: number;
    totalRevenue: number;
  };
}

export function OrdersSection({ orders, stats }: OrdersSectionProps) {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const formatDate = (date: Date | string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tickets</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTickets}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPhp(stats.totalRevenue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <p>No orders yet for this event.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium w-8"></th>
                    <th className="text-left py-3 px-2 font-medium">Order #</th>
                    <th className="text-left py-3 px-2 font-medium">Purchaser</th>
                    <th className="text-left py-3 px-2 font-medium">Tickets</th>
                    <th className="text-left py-3 px-2 font-medium">Total</th>
                    <th className="text-left py-3 px-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const isExpanded = expandedOrderId === order.id;
                    const ticketCount = order.tickets.length;
                    return (
                      <OrderRow
                        key={order.id}
                        order={order}
                        ticketCount={ticketCount}
                        isExpanded={isExpanded}
                        onToggle={() =>
                          setExpandedOrderId(isExpanded ? null : order.id)
                        }
                        formatDate={formatDate}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function OrderRow({
  order,
  ticketCount,
  isExpanded,
  onToggle,
  formatDate,
}: {
  order: OrdersSectionProps['orders'][number];
  ticketCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  formatDate: (date: Date | string | null) => string;
}) {
  const purchaserName = [order.user.firstName, order.user.lastName]
    .filter(Boolean)
    .join(' ') || order.user.email;

  return (
    <>
      <tr
        className="border-b cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <td className="py-3 px-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </td>
        <td className="py-3 px-2 font-mono text-xs">{order.orderNumber}</td>
        <td className="py-3 px-2">
          <div>{purchaserName}</div>
          {purchaserName !== order.user.email && (
            <div className="text-xs text-muted-foreground">{order.user.email}</div>
          )}
        </td>
        <td className="py-3 px-2">{ticketCount}</td>
        <td className="py-3 px-2">{formatPhp(order.total)}</td>
        <td className="py-3 px-2 text-muted-foreground">
          {formatDate(order.completedAt || order.createdAt)}
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={6} className="bg-muted/30 px-6 py-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Tickets
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="text-left py-1 pr-4">Code</th>
                    <th className="text-left py-1 pr-4">Type</th>
                    <th className="text-left py-1 pr-4">Attendee</th>
                    <th className="text-left py-1 pr-4">Email</th>
                    <th className="text-left py-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {order.tickets.map((ticket) => (
                    <tr key={ticket.id} className="border-t border-muted">
                      <td className="py-2 pr-4 font-mono text-xs">
                        {ticket.ticketCode}
                      </td>
                      <td className="py-2 pr-4">{ticket.ticketType.name}</td>
                      <td className="py-2 pr-4">
                        {[ticket.holderFirstName, ticket.holderLastName]
                          .filter(Boolean)
                          .join(' ') || '-'}
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">
                        {ticket.holderEmail || '-'}
                      </td>
                      <td className="py-2">
                        <Badge
                          variant={ticket.status === 'ACTIVE' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {ticket.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
