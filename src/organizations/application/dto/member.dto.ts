import { z } from 'zod';

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
});

export type InviteMemberDto = z.infer<typeof inviteMemberSchema>;

export const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer']),
});

export type UpdateMemberRoleDto = z.infer<typeof updateMemberRoleSchema>;

export const acceptInviteSchema = z.object({
  token: z.string(),
});

export type AcceptInviteDto = z.infer<typeof acceptInviteSchema>;

export const transferOwnershipSchema = z.object({
  newOwnerId: z.string(),
});

export type TransferOwnershipDto = z.infer<typeof transferOwnershipSchema>;
