export const PERMISSIONS = {
  MANAGE_EVENTS: 'manage_events',
  VIEW_EVENTS: 'view_events',
  PUBLISH_EVENTS: 'publish_events',
  MANAGE_TEAM: 'manage_team',
  MANAGE_ROLES: 'manage_roles',
  VIEW_TEAM: 'view_team',
  MANAGE_ORDERS: 'manage_orders',
  VIEW_ORDERS: 'view_orders',
  CHECK_IN_GUESTS: 'check_in_guests',
  MANAGE_PAGE: 'manage_page',
  MANAGE_PROMOTIONS: 'manage_promotions',
  MANAGE_SETTINGS: 'manage_settings',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

export const PERMISSION_CATEGORIES = {
  Events: [PERMISSIONS.MANAGE_EVENTS, PERMISSIONS.VIEW_EVENTS, PERMISSIONS.PUBLISH_EVENTS],
  Team: [PERMISSIONS.MANAGE_TEAM, PERMISSIONS.MANAGE_ROLES, PERMISSIONS.VIEW_TEAM],
  Orders: [PERMISSIONS.MANAGE_ORDERS, PERMISSIONS.VIEW_ORDERS],
  'Check-in': [PERMISSIONS.CHECK_IN_GUESTS],
  Page: [PERMISSIONS.MANAGE_PAGE],
  Promotions: [PERMISSIONS.MANAGE_PROMOTIONS],
  Settings: [PERMISSIONS.MANAGE_SETTINGS],
} as const;

export const PERMISSION_LABELS: Record<Permission, string> = {
  manage_events: 'Manage Events',
  view_events: 'View Events',
  publish_events: 'Publish Events',
  manage_team: 'Manage Team',
  manage_roles: 'Manage Roles',
  view_team: 'View Team',
  manage_orders: 'Manage Orders',
  view_orders: 'View Orders',
  check_in_guests: 'Check-in Guests',
  manage_page: 'Manage Page',
  manage_promotions: 'Manage Promotions',
  manage_settings: 'Manage Settings',
};

interface RoleWithPermissions {
  permissions: string[];
  isOwnerRole: boolean;
}

/**
 * Compute the effective permissions from a set of roles.
 * If any role is the owner role, returns ALL permissions.
 * Otherwise, returns the union of all role permissions.
 */
export function getEffectivePermissions(roles: RoleWithPermissions[]): Set<Permission> {
  if (roles.some((r) => r.isOwnerRole)) {
    return new Set(ALL_PERMISSIONS);
  }

  const permissions = new Set<Permission>();
  for (const role of roles) {
    for (const p of role.permissions) {
      if (ALL_PERMISSIONS.includes(p as Permission)) {
        permissions.add(p as Permission);
      }
    }
  }
  return permissions;
}

/**
 * Check if a member has the owner role.
 */
export function isOwner(roles: RoleWithPermissions[]): boolean {
  return roles.some((r) => r.isOwnerRole);
}

/**
 * Check if a permission set satisfies a required permission (or any of several).
 */
export function hasPermission(
  permissions: Set<Permission>,
  required: Permission | Permission[]
): boolean {
  if (Array.isArray(required)) {
    return required.some((p) => permissions.has(p));
  }
  return permissions.has(required);
}
