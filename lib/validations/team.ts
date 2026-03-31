import { z } from 'zod';

export const inviteMemberSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  roleIds: z.array(z.string()).min(1, 'At least one role is required'),
  title: z.string().max(100).optional(),
});

export const updateMemberSchema = z.object({
  title: z.string().max(100).nullable().optional(),
  tenantShowInProfile: z.boolean().optional(),
});

export const createTenantRoleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color'),
  permissions: z.array(z.string()).min(1, 'At least one permission is required'),
});

export const updateTenantRoleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color').optional(),
  permissions: z.array(z.string()).min(1, 'At least one permission is required').optional(),
});

export type InviteMemberData = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberData = z.infer<typeof updateMemberSchema>;
export type CreateTenantRoleData = z.infer<typeof createTenantRoleSchema>;
export type UpdateTenantRoleData = z.infer<typeof updateTenantRoleSchema>;
