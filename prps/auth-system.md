# Authentication System (BetterAuth + Fastify)

## Goal
Implement a complete authentication system using **BetterAuth** with an email/password strategy. The system must distinguish between **Admin** and **Alumni** roles using Zod schemas for validation and Shadcn-vue for the UI.

## Why
To secure the application and provide role-based access control (RBAC). Admins manage the platform, while Alumni can register and manage their profiles.

## What
- **Authentication**: Classic email/password flow (no social login).
- **Roles**:
  - `admin`: Initial account created directly via a seed script (no public signup).
  - `alumni`: Publicly available signup.
- **Database**: MongoDB (Mongoose) using the BetterAuth MongoDB adapter.
- **Frontend**: BetterAuth Vue client integration with Shadcn-vue components.

## Technical Context

### Files to Reference
- `libs/shared-schema/src/index.ts` — Current `AlumniSchema`.
- `apps/api/src/index.ts` — Current Fastify setup and MongoDB connection.
- `apps/web/src/components/ui/` — Available Shadcn components (Button, Card, Input, Label, etc.).

### Files to Implement/Modify
- `libs/shared-schema/src/index.ts`: Define `UserRole` enum and `AuthSchema`.
- `apps/api/src/lib/auth.ts`: BetterAuth server-side configuration with MongoDB adapter.
- `apps/api/src/index.ts`: Mount BetterAuth handler on `/api/auth/*`.
- `apps/api/src/scripts/seed-admin.ts`: Script to create the first admin account directly.
- `apps/web/src/lib/auth-client.ts`: BetterAuth client-side configuration.
- `apps/web/src/features/auth/components/LoginForm.vue`: Shadcn-based login.
- `apps/web/src/features/auth/components/RegisterForm.vue`: Shadcn-based registration for Alumni.

## Implementation Details

### API/Endpoints
- BetterAuth handles endpoints: `/api/auth/sign-in-email`, `/api/auth/sign-up-email`, `/api/auth/sign-out`, `/api/auth/get-session`.

### Schema (Zod)
```typescript
export const UserRole = z.enum(['admin', 'alumni']);

export const SignUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  role: UserRole.default('alumni'),
  graduationYear: z.number().int().min(1900).optional(),
});

export type SignUpType = z.infer<typeof SignUpSchema>;
```

### UI Components (Shadcn)
- Use `Card`, `Input`, `Button`, `Label`, and `Alert` for the auth forms.
- Ensure the forms have clear validation states and loading indicators.

## Validation Criteria

### Functional Requirements
- [ ] Users can sign up as Alumni with email/password.
- [ ] Users can sign in and maintain a session.
- [ ] The first Admin account can sign in successfully after being seeded.
- [ ] Roles are correctly assigned and accessible in the session object.

### Technical Requirements
- [ ] BetterAuth uses the existing MongoDB connection.
- [ ] Frontend state is reactive via `useSession()`.
- [ ] Zod validation is performed on both client and server.
- [ ] TypeScript types are strictly followed without `any`.

### Testing Steps
1. Create a `seed-admin.ts` script and run it via `bun run`.
2. Attempt to login with the admin credentials in the UI.
3. Register a new Alumni account via the UI.
4. Verify the user appears in the database with the correct role and `graduationYear`.
