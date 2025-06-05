import { z } from 'zod';

export const signupSchema = z.object({
  email: z
    .string()
    .min(5, { message: 'Email should be at least 5 characters long' })
    .email({ message: 'Invalid email address' }),
  username: z
    .string()
    .min(3, { message: 'Username should be at least 3 characters long' })
    .max(25, { message: 'Username can be up to 25 characters long' })
    .regex(/^[a-zA-Z0-9.]+$/, {
      message: 'Username must only contain letters, numbers, or periods',
    }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .max(128, { message: 'Password can be up to 128 characters long' }),
});

export type SignUpDto = z.infer<typeof signupSchema>;
