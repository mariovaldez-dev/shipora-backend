import { z } from 'zod';

export const updateOrganizationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
  logo: z.string().url().optional(),
  website: z.string().url().optional(),
  allowedDomains: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  settings: z
    .object({
      defaultCarrier: z.string().optional(),
      autoApproveOrders: z.boolean().optional(),
      notificationsEnabled: z.boolean().optional(),
      webhookUrl: z.string().url().optional(),
      defaultPackaging: z.string().optional(),
      insuranceDefault: z.boolean().optional(),
    })
    .optional(),
});

export type UpdateOrganizationDto = z.infer<typeof updateOrganizationSchema>;
