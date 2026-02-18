# Technical Architecture & Database Specification

This document provides a detailed overview of the system's architecture, data models, and development patterns.

## 1. System Overview
The platform uses a modular approach with a clear separation of concerns, orchestrated within an Nx-managed monorepo.

### High-Level Architecture
```text
[ Frontend (Vue 3/Vite) ] <--- HTTP (REST) ---> [ Backend (Fastify/Bun) ]
          ^                                           |
          |                                           v
          +----------- [ Shared Schema (Zod) ] <--- [ MongoDB ]
```

---

## 2. Database Structure & TypeScript Types

The database is managed via **Mongoose** (ODM) on the backend, while types and runtime validation are handled by **Zod** in a shared library.

### Shared Types (`libs/shared-schema`)

The `Alumni` entity is the core of the system.

```typescript
// libs/shared-schema/src/index.ts
import { z } from 'zod';

/**
 * Zod Schema for validation and type inference.
 * Defines the contract between Frontend and Backend.
 */
export const AlumniSchema = z.object({
  firstName: z.string()
    .min(2, "First name must be at least 2 characters")
    .describe("Alumni's given name"),
  
  lastName: z.string()
    .min(2, "Last name must be at least 2 characters")
    .describe("Alumni's family name"),
  
  email: z.string()
    .email("Invalid email address")
    .describe("Primary contact email (must be unique)"),
  
  graduationYear: z.number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 10)
    .optional()
    .describe("Year the alumni graduated"),
});

/**
 * Inferred TypeScript type from the Zod Schema.
 */
export type AlumniType = z.infer<typeof AlumniSchema>;
```

### Backend Implementation (`apps/api`)

The backend uses **Mongoose** with the shared types to ensure schema consistency.

```typescript
// apps/api/src/models/Alumni.ts
import mongoose from 'mongoose';
import { AlumniType } from '@alumni/shared-schema';

const AlumniSchema = new mongoose.Schema<AlumniType>({
  firstName: { 
    type: String, 
    required: true,
    trim: true 
  },
  lastName: { 
    type: String, 
    required: true,
    trim: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true,
    trim: true 
  },
  graduationYear: {
    type: Number,
    min: 1900,
    max: 2100
  },
}, { 
  timestamps: true // Automatically adds createdAt and updatedAt
});

export const Alumni = mongoose.model<AlumniType>('Alumni', AlumniSchema);
```

---

## 3. Communication Patterns

### REST API Standards
- **Endpoint naming**: Plural nouns (e.g., `/alumni`, `/users`).
- **HTTP Methods**:
  - `GET`: Retrieve data.
  - `POST`: Create new resources (Validation required).
  - `PUT/PATCH`: Update existing resources.
  - `DELETE`: Remove resources.
- **Success Response**: `{ status: 'success', data: { ... } }` or direct object.
- **Error Response**: `{ status: 'error', message: '...', issues: [...] }` (including Zod validation errors).

### Frontend State Management
- **Vue Query**: Used for all asynchronous operations (fetching, caching, mutations).
- **Zod Validation**: Performed on form submission before API calls.

---

## 4. Coding Standards & Best Practices

### Global
- **Bun First**: Use `bun` for package management and scripts.
- **Type Safety**: Avoid `any`. Use inferred types from Zod or explicitly defined interfaces.
- **Naming**: 
  - Components: PascalCase (e.g., `AlumniForm.vue`).
  - Variables/Functions: camelCase.
  - Constants: UPPER_SNAKE_CASE.

### Backend Specifics
- **Fastify Hook**: Use hooks for authentication or logging.
- **Validation**: Always validate `request.body` and `request.params` using Zod schemas.

### Frontend Specifics
- **Shadcn-vue**: Standard for all UI elements. Do not reinvent basic UI components.
- **Composable Pattern**: Extract complex logic into reusable functions in `src/composables/` or `src/features/*/composables/`.
- **Lucide Icons**: Use for all iconography to maintain consistency.
