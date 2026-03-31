import { PERMISSIONS, ALL_PERMISSIONS } from './permissions';
import type { Permission } from './permissions';

export interface DefaultRoleDefinition {
  name: string;
  color: string;
  permissions: Permission[];
  position: number;
  isDefault: boolean;
  isOwnerRole: boolean;
}

export const DEFAULT_ROLES: DefaultRoleDefinition[] = [
  {
    name: 'Owner',
    color: '#F59E0B',
    permissions: ALL_PERMISSIONS,
    position: 0,
    isDefault: true,
    isOwnerRole: true,
  },
  {
    name: 'Core',
    color: '#8B5CF6',
    permissions: [
      PERMISSIONS.MANAGE_EVENTS,
      PERMISSIONS.PUBLISH_EVENTS,
      PERMISSIONS.VIEW_EVENTS,
      PERMISSIONS.MANAGE_TEAM,
      PERMISSIONS.VIEW_TEAM,
      PERMISSIONS.MANAGE_ORDERS,
      PERMISSIONS.VIEW_ORDERS,
      PERMISSIONS.MANAGE_PAGE,
      PERMISSIONS.MANAGE_PROMOTIONS,
      PERMISSIONS.CHECK_IN_GUESTS,
    ],
    position: 1,
    isDefault: true,
    isOwnerRole: false,
  },
  {
    name: 'Support',
    color: '#3B82F6',
    permissions: [
      PERMISSIONS.VIEW_EVENTS,
      PERMISSIONS.VIEW_TEAM,
      PERMISSIONS.MANAGE_ORDERS,
      PERMISSIONS.VIEW_ORDERS,
      PERMISSIONS.CHECK_IN_GUESTS,
    ],
    position: 2,
    isDefault: true,
    isOwnerRole: false,
  },
  {
    name: 'Registration',
    color: '#10B981',
    permissions: [
      PERMISSIONS.VIEW_EVENTS,
      PERMISSIONS.CHECK_IN_GUESTS,
      PERMISSIONS.VIEW_ORDERS,
    ],
    position: 3,
    isDefault: true,
    isOwnerRole: false,
  },
  {
    name: 'Hosting',
    color: '#6B7280',
    permissions: [
      PERMISSIONS.VIEW_EVENTS,
      PERMISSIONS.CHECK_IN_GUESTS,
    ],
    position: 4,
    isDefault: true,
    isOwnerRole: false,
  },
];

/**
 * Seed default roles for a tenant within a transaction.
 * Returns the created roles, with the Owner role first.
 * Accepts either a Prisma transaction client or the full PrismaClient.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seedDefaultRoles(tx: any, tenantId: string) {
  const createdRoles = [];

  for (const roleDef of DEFAULT_ROLES) {
    const role = await tx.tenantRole.create({
      data: {
        tenantId,
        name: roleDef.name,
        color: roleDef.color,
        permissions: roleDef.permissions,
        position: roleDef.position,
        isDefault: roleDef.isDefault,
        isOwnerRole: roleDef.isOwnerRole,
      },
    });
    createdRoles.push(role);
  }

  return createdRoles;
}
