import { z } from 'zod';

export const UserRole = z.enum(['admin', 'alumni']);
export type UserRoleType = z.infer<typeof UserRole>;

const currentYear = new Date().getFullYear();

// Legacy schema kept for backward compatibility
export const AlumniSchema = z.object({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Adresse email invalide"),
  graduationYear: z.number().int().min(1900).max(currentYear).optional(),
});

export type AlumniType = z.infer<typeof AlumniSchema>;

// Extended profile schema
export const AlumniStatusEnum = z.enum(['invited', 'registered', 'completed']);
export type AlumniStatus = z.infer<typeof AlumniStatusEnum>;

export const AlumniProfileSchema = z.object({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Adresse email invalide"),
  graduationYear: z.number().int().min(1900).max(currentYear).optional().nullable(),
  diploma: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  linkedinUrl: z.string().url("URL LinkedIn invalide").optional().nullable().or(z.literal('')),
  status: AlumniStatusEnum.optional(), // Default will be handled in business logic
  isActive: z.boolean().default(true),
});

export type AlumniProfileType = z.infer<typeof AlumniProfileSchema>;

export const AlumniUpdateSchema = AlumniProfileSchema.partial().omit({ email: true });
export type AlumniUpdateType = z.infer<typeof AlumniUpdateSchema>;

export const SignUpSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  role: UserRole.default('alumni'),
  graduationYear: z.number().int().min(1900).max(currentYear).optional(),
  alumniId: z.string().optional(),
});

export type SignUpType = z.infer<typeof SignUpSchema>;

export const LoginSchema = z.object({
  email: z.string().email("Adresse email invalide"),
  password: z.string().min(1, "Le mot de passe est requis"),
});

export type LoginType = z.infer<typeof LoginSchema>;
