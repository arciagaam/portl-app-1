'use server';

import { requireAuth, getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import type { AddToCartData, UpdateCartItemData } from '@/lib/validations/checkout';
import type { Cart, CartItem, Event, TicketType, TicketTypePriceTier, Tenant } from '@/prisma/generated/prisma/client';

// Cart expiration time in minutes
const CART_EXPIRATION_MINUTES = 15;

// Types for cart with relations
export type CartItemWithRelations = CartItem & {
  event: Event & { tenant: Tenant };
  ticketType: TicketType;
  priceTier: TicketTypePriceTier | null;
};

export type CartWithItems = Cart & {
  items: CartItemWithRelations[];
};

// Type for cart grouped by tenant
export type TenantCartGroup = {
  tenant: Tenant;
  items: CartItemWithRelations[];
  subtotal: number;
};

export type CartSummary = {
  cart: CartWithItems | null;
  groupedByTenant: TenantCartGroup[];
  totalItems: number;
  totalAmount: number;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate the current active price for a ticket type
 * Returns the price from the most appropriate active price tier, or base price
 */
function getCurrentPrice(ticketType: TicketType & { priceTiers: TicketTypePriceTier[] }): {
  price: number;
  priceTierId: string | null;
} {
  const now = new Date();

  // Find active price tier
  // Priority: TIME_WINDOW tiers that are currently active, then ALLOCATION tiers that aren't sold out
  // Sort by priority (higher priority first)
  const sortedTiers = [...ticketType.priceTiers].sort((a, b) => b.priority - a.priority);

  for (const tier of sortedTiers) {
    if (tier.strategy === 'TIME_WINDOW') {
      // Check if within time window
      if (tier.startsAt && tier.endsAt) {
        const startsAt = new Date(tier.startsAt);
        const endsAt = new Date(tier.endsAt);
        if (now >= startsAt && now <= endsAt) {
          return { price: tier.price, priceTierId: tier.id };
        }
      }
    } else if (tier.strategy === 'ALLOCATION') {
      // Check if allocation not sold out
      if (tier.allocationTotal === null || tier.allocationSold < tier.allocationTotal) {
        return { price: tier.price, priceTierId: tier.id };
      }
    }
  }

  // Fall back to base price
  return { price: ticketType.basePrice, priceTierId: null };
}

/**
 * Extend cart expiration time (sliding window)
 */
function getNewExpirationTime(): Date {
  return new Date(Date.now() + CART_EXPIRATION_MINUTES * 60 * 1000);
}

// ============================================================================
// CART ACTIONS
// ============================================================================

/**
 * Get or create cart for current user
 * Creates a new cart if none exists or existing cart has expired
 */
export async function getOrCreateCartAction(): Promise<{ data: CartWithItems } | { error: string }> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    // Try to find existing non-expired cart
    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            event: {
              include: {
                tenant: true,
              },
            },
            ticketType: true,
            priceTier: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    const now = new Date();

    // If cart exists but is expired, delete it and create new
    if (cart && cart.expiresAt < now) {
      await prisma.cart.delete({ where: { id: cart.id } });
      cart = null;
    }

    // Create new cart if needed
    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId,
          expiresAt: getNewExpirationTime(),
        },
        include: {
          items: {
            include: {
              event: {
                include: {
                  tenant: true,
                },
              },
              ticketType: true,
              priceTier: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });
    } else {
      // Extend expiration on access (sliding window)
      cart = await prisma.cart.update({
        where: { id: cart.id },
        data: { expiresAt: getNewExpirationTime() },
        include: {
          items: {
            include: {
              event: {
                include: {
                  tenant: true,
                },
              },
              ticketType: true,
              priceTier: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });
    }

    return { data: cart as CartWithItems };
  } catch (error) {
    console.error('Error getting/creating cart:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Please sign in to add items to cart' };
    }
    return { error: 'Failed to get cart' };
  }
}

/**
 * Add item to cart with price locking
 */
export async function addToCartAction(
  data: AddToCartData
): Promise<{ data: CartWithItems } | { error: string }> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    const { eventId, ticketTypeId, quantity, seatId } = data;

    // Validate ticket type exists and get current price
    const ticketType = await prisma.ticketType.findUnique({
      where: { id: ticketTypeId },
      include: {
        event: {
          include: {
            tenant: true,
          },
        },
        priceTiers: true,
      },
    });

    if (!ticketType) {
      return { error: 'Ticket type not found' };
    }

    if (ticketType.eventId !== eventId) {
      return { error: 'Ticket type does not belong to this event' };
    }

    if (ticketType.event.status !== 'PUBLISHED') {
      return { error: 'Event is not available for purchase' };
    }

    if (ticketType.status === 'HIDDEN' || ticketType.status === 'CLOSED') {
      return { error: 'This ticket type is not available for purchase' };
    }

    // Check availability
    if (ticketType.quantityTotal !== null) {
      const available = ticketType.quantityTotal - ticketType.quantitySold;
      if (available < quantity) {
        return { error: available === 0 ? 'Sold out' : `Only ${available} tickets available` };
      }
    }

    // Get current price
    const { price, priceTierId } = getCurrentPrice(ticketType);

    // Check allocation limit if using allocation-based price tier
    if (priceTierId) {
      const priceTier = ticketType.priceTiers.find(t => t.id === priceTierId);
      if (priceTier && priceTier.strategy === 'ALLOCATION' && priceTier.allocationTotal !== null) {
        const available = priceTier.allocationTotal - priceTier.allocationSold;
        if (available < quantity) {
          return { error: `Only ${available} tickets available at this price` };
        }
      }
    }

    // For SEAT tickets, validate seat is not already reserved
    if (seatId) {
      const existingCartItem = await prisma.cartItem.findFirst({
        where: {
          seatId,
          cart: {
            expiresAt: { gt: new Date() },
          },
        },
      });

      if (existingCartItem) {
        return { error: 'This seat is already reserved' };
      }

      // Also check if seat is already in a confirmed order
      const existingOrderItem = await prisma.orderItem.findFirst({
        where: {
          seatId,
          order: {
            status: { in: ['PENDING', 'CONFIRMED'] },
          },
        },
      });

      if (existingOrderItem) {
        return { error: 'This seat is already sold' };
      }
    }

    // Get or create cart
    const cartResult = await getOrCreateCartAction();
    if ('error' in cartResult) {
      return cartResult;
    }

    const cart = cartResult.data;

    // Check if item already exists in cart (same ticket type and seat)
    const existingItem = cart.items.find(
      item => item.ticketTypeId === ticketTypeId && item.seatId === (seatId || null)
    );

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > 10) {
        return { error: 'Maximum 10 tickets per type' };
      }

      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      // Create new cart item
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          eventId,
          ticketTypeId,
          priceTierId,
          quantity,
          unitPrice: price,
          seatId,
        },
      });
    }

    // Fetch updated cart
    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            event: {
              include: {
                tenant: true,
              },
            },
            ticketType: true,
            priceTier: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    return { data: updatedCart as CartWithItems };
  } catch (error) {
    console.error('Error adding to cart:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Please sign in to add items to cart' };
    }
    return { error: 'Failed to add item to cart' };
  }
}

/**
 * Update cart item quantity
 */
export async function updateCartItemAction(
  data: UpdateCartItemData
): Promise<{ data: CartWithItems } | { error: string }> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    const { cartItemId, quantity } = data;

    // Find cart item and verify ownership
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: {
        cart: true,
        ticketType: true,
      },
    });

    if (!cartItem) {
      return { error: 'Cart item not found' };
    }

    if (cartItem.cart.userId !== userId) {
      return { error: 'Unauthorized' };
    }

    if (quantity === 0) {
      // Remove item
      await prisma.cartItem.delete({ where: { id: cartItemId } });
    } else {
      // Check availability for new quantity
      if (cartItem.ticketType.quantityTotal !== null) {
        const available = cartItem.ticketType.quantityTotal - cartItem.ticketType.quantitySold;
        if (available < quantity) {
          return { error: `Only ${available} tickets available` };
        }
      }

      // Update quantity
      await prisma.cartItem.update({
        where: { id: cartItemId },
        data: { quantity },
      });
    }

    // Extend cart expiration
    await prisma.cart.update({
      where: { id: cartItem.cartId },
      data: { expiresAt: getNewExpirationTime() },
    });

    // Fetch updated cart
    const updatedCart = await prisma.cart.findUnique({
      where: { id: cartItem.cartId },
      include: {
        items: {
          include: {
            event: {
              include: {
                tenant: true,
              },
            },
            ticketType: true,
            priceTier: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    return { data: updatedCart as CartWithItems };
  } catch (error) {
    console.error('Error updating cart item:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Please sign in to update cart' };
    }
    return { error: 'Failed to update cart item' };
  }
}

/**
 * Remove item from cart
 */
export async function removeFromCartAction(
  cartItemId: string
): Promise<{ data: CartWithItems } | { error: string }> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    // Find cart item and verify ownership
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true },
    });

    if (!cartItem) {
      return { error: 'Cart item not found' };
    }

    if (cartItem.cart.userId !== userId) {
      return { error: 'Unauthorized' };
    }

    // Delete item
    await prisma.cartItem.delete({ where: { id: cartItemId } });

    // Extend cart expiration
    await prisma.cart.update({
      where: { id: cartItem.cartId },
      data: { expiresAt: getNewExpirationTime() },
    });

    // Fetch updated cart
    const updatedCart = await prisma.cart.findUnique({
      where: { id: cartItem.cartId },
      include: {
        items: {
          include: {
            event: {
              include: {
                tenant: true,
              },
            },
            ticketType: true,
            priceTier: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    return { data: updatedCart as CartWithItems };
  } catch (error) {
    console.error('Error removing from cart:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Please sign in to update cart' };
    }
    return { error: 'Failed to remove item from cart' };
  }
}

/**
 * Clear entire cart
 */
export async function clearCartAction(): Promise<{ success: true } | { error: string }> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    // Delete all cart items for user's cart
    const cart = await prisma.cart.findUnique({
      where: { userId },
    });

    if (cart) {
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error clearing cart:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Please sign in to clear cart' };
    }
    return { error: 'Failed to clear cart' };
  }
}

/**
 * Clear items for specific tenant only
 */
export async function clearTenantItemsAction(
  tenantId: string
): Promise<{ data: CartWithItems } | { error: string }> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    // Find user's cart
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            event: true,
          },
        },
      },
    });

    if (!cart) {
      return { error: 'Cart not found' };
    }

    // Delete items for this tenant
    const itemsToDelete = cart.items.filter(item => item.event.tenantId === tenantId);
    await prisma.cartItem.deleteMany({
      where: {
        id: { in: itemsToDelete.map(item => item.id) },
      },
    });

    // Fetch updated cart
    const updatedCart = await prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            event: {
              include: {
                tenant: true,
              },
            },
            ticketType: true,
            priceTier: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    return { data: updatedCart as CartWithItems };
  } catch (error) {
    console.error('Error clearing tenant items:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Please sign in to update cart' };
    }
    return { error: 'Failed to clear tenant items' };
  }
}

/**
 * Get cart summary with items grouped by tenant
 */
export async function getCartSummaryAction(): Promise<{ data: CartSummary } | { error: string }> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      // Return empty cart for unauthenticated users
      return {
        data: {
          cart: null,
          groupedByTenant: [],
          totalItems: 0,
          totalAmount: 0,
        },
      };
    }

    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            event: {
              include: {
                tenant: true,
              },
            },
            ticketType: true,
            priceTier: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    // If cart is expired, treat as empty
    if (cart && cart.expiresAt < new Date()) {
      return {
        data: {
          cart: null,
          groupedByTenant: [],
          totalItems: 0,
          totalAmount: 0,
        },
      };
    }

    if (!cart || cart.items.length === 0) {
      return {
        data: {
          cart: cart as CartWithItems | null,
          groupedByTenant: [],
          totalItems: 0,
          totalAmount: 0,
        },
      };
    }

    // Group items by tenant
    const tenantMap = new Map<string, TenantCartGroup>();

    for (const item of cart.items) {
      const tenantId = item.event.tenantId;
      const tenant = item.event.tenant;

      if (!tenantMap.has(tenantId)) {
        tenantMap.set(tenantId, {
          tenant,
          items: [],
          subtotal: 0,
        });
      }

      const group = tenantMap.get(tenantId)!;
      group.items.push(item as CartItemWithRelations);
      group.subtotal += item.unitPrice * item.quantity;
    }

    const groupedByTenant = Array.from(tenantMap.values());

    // Calculate totals
    const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    return {
      data: {
        cart: cart as CartWithItems,
        groupedByTenant,
        totalItems,
        totalAmount,
      },
    };
  } catch (error) {
    console.error('Error getting cart summary:', error);
    return { error: 'Failed to get cart summary' };
  }
}

/**
 * Get cart items for a specific tenant (for checkout)
 */
export async function getCartForTenantAction(
  tenantSubdomain: string
): Promise<{ data: { items: CartItemWithRelations[]; subtotal: number } } | { error: string }> {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    // Find tenant
    const tenant = await prisma.tenant.findUnique({
      where: { subdomain: tenantSubdomain },
    });

    if (!tenant) {
      return { error: 'Tenant not found' };
    }

    // Get cart items for this tenant
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          where: {
            event: {
              tenantId: tenant.id,
            },
          },
          include: {
            event: {
              include: {
                tenant: true,
              },
            },
            ticketType: true,
            priceTier: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!cart || cart.expiresAt < new Date()) {
      return {
        data: {
          items: [],
          subtotal: 0,
        },
      };
    }

    const subtotal = cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    return {
      data: {
        items: cart.items as CartItemWithRelations[],
        subtotal,
      },
    };
  } catch (error) {
    console.error('Error getting cart for tenant:', error);
    if (error instanceof Error && error.message === 'Unauthorized') {
      return { error: 'Please sign in to view cart' };
    }
    return { error: 'Failed to get cart' };
  }
}

/**
 * Get cart item count (for navbar badge)
 */
export async function getCartItemCountAction(): Promise<{ data: number } | { error: string }> {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { data: 0 };
    }

    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: {
        items: {
          select: { quantity: true },
        },
      },
    });

    if (!cart || cart.expiresAt < new Date()) {
      return { data: 0 };
    }

    const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    return { data: count };
  } catch (error) {
    console.error('Error getting cart item count:', error);
    return { data: 0 };
  }
}
