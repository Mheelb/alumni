import { z } from 'zod';

export const UserRole = z.enum(['admin', 'alumni']);
export type UserRoleType = z.infer<typeof UserRole>;

export const AlumniSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  graduationYear: z.number().int().min(1900).max(new Date().getFullYear() + 10).optional(),
});

export type AlumniType = z.infer<typeof AlumniSchema>;

export const SignUpSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  role: UserRole.default('alumni'),
  graduationYear: z.number().int().min(1900).max(new Date().getFullYear() + 10).optional(),
});

export type SignUpType = z.infer<typeof SignUpSchema>;

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginType = z.infer<typeof LoginSchema>;
