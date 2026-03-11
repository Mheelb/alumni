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
export const AlumniStatusEnum = z.enum(['unlinked', 'invited', 'registered']);
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
  avatarUrl: z.string().optional().nullable(),
  status: AlumniStatusEnum.optional(), // Default will be handled in business logic
  isActive: z.boolean().default(true),
});

export type AlumniProfileType = z.infer<typeof AlumniProfileSchema>;

export const AlumniUpdateSchema = AlumniProfileSchema.partial().omit({ email: true });
export type AlumniUpdateType = z.infer<typeof AlumniUpdateSchema>;

export const ProfileUpdateRequestStatusEnum = z.enum(['pending', 'accepted', 'refused']);
export type ProfileUpdateRequestStatus = z.infer<typeof ProfileUpdateRequestStatusEnum>;

export const ProfileUpdateRequestSchema = z.object({
  alumniId: z.string(),
  userId: z.string(),
  changes: AlumniUpdateSchema,
  status: ProfileUpdateRequestStatusEnum.default('pending'),
});

export type ProfileUpdateRequestType = z.infer<typeof ProfileUpdateRequestSchema>;

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

// ─── Events ──────────────────────────────────────────────────────────────────

export const EventSchema = z.object({
  title: z.string().min(2, "Le titre doit contenir au moins 2 caractères"),
  description: z.string().min(10, "La description doit contenir au moins 10 caractères"),
  startDate: z.string().datetime("Date de début invalide"),
  endDate: z.string().datetime("Date de fin invalide"),
  location: z.string().min(2, "Le lieu doit contenir au moins 2 caractères"),
  imageUrl: z.string().url("URL d'image invalide").optional().nullable(),
});

export const EventUpdateSchema = EventSchema.partial();
export type EventInput = z.infer<typeof EventSchema>;
export type EventUpdateInput = z.infer<typeof EventUpdateSchema>;

export const AttendanceStatusEnum = z.enum(['going', 'interested', 'not_going']);
export type AttendanceStatus = z.infer<typeof AttendanceStatusEnum>;

// ─── Job Announcements ────────────────────────────────────────────────────────

export const JobTypeEnum = z.enum(['CDI', 'CDD', 'stage', 'alternance', 'freelance']);
export type JobType = z.infer<typeof JobTypeEnum>;

export const JobStatusEnum = z.enum(['draft', 'active', 'closed']);
export type JobStatus = z.infer<typeof JobStatusEnum>;

export const JobInterestStatusEnum = z.enum(['interested', 'not_interested']);
export type JobInterestStatus = z.infer<typeof JobInterestStatusEnum>;

export const JobAnnouncementSchema = z.object({
  title: z.string().min(2, "Le titre doit contenir au moins 2 caractères"),
  company: z.string().min(2, "L'entreprise doit contenir au moins 2 caractères"),
  type: JobTypeEnum,
  location: z.string().min(2, "Le lieu doit contenir au moins 2 caractères"),
  description: z.string().min(10, "La description doit contenir au moins 10 caractères"),
  url: z.string().url("URL invalide").optional().nullable(),
  status: JobStatusEnum.default('draft'),
});

export const JobAnnouncementUpdateSchema = JobAnnouncementSchema.partial();
export type JobAnnouncementInput = z.infer<typeof JobAnnouncementSchema>;
export type JobAnnouncementUpdateInput = z.infer<typeof JobAnnouncementUpdateSchema>;
