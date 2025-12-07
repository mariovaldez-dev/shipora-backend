import { z } from 'zod';

export const createOrganizationSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message:
        'Slug must be lowercase and contain only letters, numbers, and hyphens',
    })
    .optional(),
  description: z.string().max(500).optional(),
  website: z.string().url().optional(),
  allowedDomains: z.array(z.string()).optional(),
});

export type CreateOrganizationDto = z.infer<typeof createOrganizationSchema>;
