import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(5, { message: 'Email should be at least 5 characters long' })
    .email({ message: 'Invalid email address' }),

  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .max(128, { message: 'Password can be up to 128 characters long' }),
});

export type LoginDto = z.infer<typeof loginSchema>;
