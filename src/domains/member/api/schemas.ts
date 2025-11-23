import { z } from 'zod';

export const createMemberSchema = z.object({
  publicId: z.string().min(1, 'Public ID is required'),
  email: z.string().email('Valid email is required'),
  nickName: z.string().min(1, 'Nickname is required'),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  password: z.string().optional(),
});

export type CreateMemberSchemaInput = z.infer<typeof createMemberSchema>;
