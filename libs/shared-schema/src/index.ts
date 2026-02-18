import { z } from 'zod';

export const AlumniSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  graduationYear: z.number().int().min(1900).max(new Date().getFullYear() + 10).optional(),
});

export type AlumniType = z.infer<typeof AlumniSchema>;
