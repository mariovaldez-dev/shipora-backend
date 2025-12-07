import { Schema } from 'mongoose';

export const OrganizationInviteSchema = new Schema(
  {
    _id: { type: String, required: true },
    organizationId: { type: String, required: true },
    email: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'member', 'viewer'],
      default: 'member',
    },
    token: { type: String, required: true, unique: true },
    invitedBy: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired', 'cancelled'],
      default: 'pending',
    },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date },
    acceptedBy: { type: String },
  },
  {
    timestamps: true,
    _id: false,
  },
);

OrganizationInviteSchema.index({ token: 1 });
OrganizationInviteSchema.index({ organizationId: 1, email: 1 });
OrganizationInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
