import { Schema } from 'mongoose';

export const OrganizationMemberSchema = new Schema(
  {
    _id: { type: String, required: true },
    organizationId: { type: String, required: true },
    userId: { type: String, required: true },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member', 'viewer'],
      default: 'member',
    },
    permissions: {
      type: {
        canManageOrders: Boolean,
        canManageGuides: Boolean,
        canManageMembers: Boolean,
        canViewReports: Boolean,
        canManageBilling: Boolean,
        canManageSettings: Boolean,
        canManageIntegrations: Boolean,
      },
      default: {},
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'suspended'],
      default: 'pending',
    },
    invitedBy: { type: String },
    invitedAt: { type: Date },
    joinedAt: { type: Date },
    lastActiveAt: { type: Date },
  },
  {
    timestamps: true,
    _id: false,
  },
);

OrganizationMemberSchema.index(
  { organizationId: 1, userId: 1 },
  { unique: true },
);
OrganizationMemberSchema.index({ organizationId: 1, status: 1 });
OrganizationMemberSchema.index({ userId: 1 });
