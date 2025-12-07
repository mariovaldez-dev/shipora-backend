import { Schema } from 'mongoose';

export const OrganizationSchema = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    logo: { type: String },
    website: { type: String },
    ownerId: { type: String, required: true },
    settings: {
      type: {
        defaultCarrier: String,
        autoApproveOrders: Boolean,
        notificationsEnabled: Boolean,
        webhookUrl: String,
        defaultPackaging: String,
        insuranceDefault: Boolean,
      },
      default: {},
    },
    billing: {
      type: {
        plan: {
          type: String,
          enum: ['free', 'starter', 'professional', 'enterprise'],
          default: 'free',
        },
        stripeCustomerId: String,
        stripeSubscriptionId: String,
        billingEmail: String,
        billingAddress: {
          street: String,
          city: String,
          state: String,
          postalCode: String,
          country: String,
        },
      },
      default: { plan: 'free' },
    },
    isActive: { type: Boolean, default: true },
    allowedDomains: { type: [String], default: [] },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
    _id: false,
  },
);

OrganizationSchema.index({ slug: 1 });
OrganizationSchema.index({ ownerId: 1 });
OrganizationSchema.index({ isActive: 1 });
