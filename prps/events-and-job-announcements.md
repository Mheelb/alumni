# Events & Job Announcements PRP

## Goal

Build a full events and job announcements module: admin CRUD management, alumni feed view with RSVP/interest interactions, and enriched dashboard analytics.

## Why

Alumni platforms need a hub for networking events and career opportunities. Admins need to publish and manage content, alumni need to discover and engage with it. This closes the loop on the "Coming Soon" placeholders already shown on the landing page.

## What

### Scope Included
- **Events**: Admin creates/edits/deletes events with date, location, description. Status (`upcoming` / `ongoing` / `past`) is computed automatically from dates. Alumni can mark attendance intent (`going` / `interested` / `not_going`).
- **Job Announcements**: Admin creates/edits/deletes job posts with title, company, type, location, description, URL. Status (`draft` / `active` / `closed`) is managed manually by admin. Alumni can mark interest (`interested` / `not_interested`).
- **Feed Page** (`/feed`): Two-tab layout — Events tab + Job Announcements tab — visible to all authenticated users.
- **Admin Management Pages**: `/admin/events` and `/admin/job-announcements` with full CRUD.
- **Admin Home** (`/`): New sections showing upcoming events and recent active job posts.
- **Dashboard** (`/dashboard`): New stat cards and charts for events and job announcements.

### Scope Excluded
- Email notifications for events/jobs
- Public (unauthenticated) access to feed
- Comment/discussion threads
- File attachments to events

### User Stories
1. As an admin, I can create an event with title, description, start/end date, location, optional image URL.
2. As an admin, I can edit or delete any event or job announcement.
3. As an admin, I can create a job announcement with title, company, type, location, description, external URL and set its status.
4. As an admin, I can change the status of a job announcement (draft → active → closed).
5. As an alumni, I can browse upcoming events in the feed and mark my attendance intent.
6. As an alumni, I can browse active job announcements and mark my interest.
7. As an admin, I see upcoming events and recent job posts on the home screen.
8. As an admin, I see event and job announcement metrics on the dashboard with charts.

---

## Technical Context

### Files to Reference (read-only)

- `apps/api/src/models/Alumni.ts` — Mongoose model pattern (schema, timestamps, export)
- `apps/api/src/routes/dashboard.ts` — Route plugin pattern, aggregation queries, OpenAPI schema format
- `apps/api/src/lib/middleware.ts` — `requireAuth`, `requireAdmin`, `getSession` usage
- `libs/shared-schema/src/index.ts` — Zod schema conventions, enum pattern, type exports
- `apps/web/src/features/alumni/composables/useAlumni.ts` — TanStack Query hooks (useQuery + useMutation + invalidation)
- `apps/web/src/features/alumni/composables/useDashboard.ts` — Dashboard query pattern with `enabled` ref
- `apps/web/src/pages/DashboardPage.vue` — Chart.js usage, KPI cards, chart options pattern
- `apps/web/src/pages/HomePage.vue` — Admin home layout with stat cards and quick-access sections
- `apps/web/src/router.ts` — Route registration, `requiresAuth` / `requiresAdmin` meta
- `apps/api/src/index.ts` — Plugin registration pattern (`fastify.register(...)`)

### Files to Implement / Modify

#### Backend
- `apps/api/src/models/Event.ts` ← **NEW** — Mongoose Event model
- `apps/api/src/models/EventAttendance.ts` ← **NEW** — Attendance record (alumni ↔ event)
- `apps/api/src/models/JobAnnouncement.ts` ← **NEW** — Mongoose JobAnnouncement model
- `apps/api/src/models/JobInterest.ts` ← **NEW** — Interest record (alumni ↔ job)
- `apps/api/src/routes/events.ts` ← **NEW** — CRUD routes for events + attendance
- `apps/api/src/routes/jobAnnouncements.ts` ← **NEW** — CRUD routes for jobs + interest
- `apps/api/src/routes/dashboard.ts` ← **MODIFY** — Add event/job stats to `/dashboard/stats`
- `apps/api/src/index.ts` ← **MODIFY** — Register new route plugins

#### Shared Schema
- `libs/shared-schema/src/index.ts` ← **MODIFY** — Add `EventSchema`, `JobAnnouncementSchema`, enums and inferred types

#### Frontend
- `apps/web/src/features/events/composables/useEvents.ts` ← **NEW** — TanStack Query hooks
- `apps/web/src/features/events/composables/useJobAnnouncements.ts` ← **NEW** — TanStack Query hooks
- `apps/web/src/features/events/components/EventCard.vue` ← **NEW** — Card for feed
- `apps/web/src/features/events/components/EventForm.vue` ← **NEW** — Admin create/edit form
- `apps/web/src/features/events/components/JobAnnouncementCard.vue` ← **NEW** — Card for feed
- `apps/web/src/features/events/components/JobAnnouncementForm.vue` ← **NEW** — Admin form
- `apps/web/src/pages/FeedPage.vue` ← **NEW** — Alumni feed with tabs
- `apps/web/src/pages/admin/AdminEventsPage.vue` ← **NEW** — Admin events management
- `apps/web/src/pages/admin/AdminJobsPage.vue` ← **NEW** — Admin job announcements management
- `apps/web/src/pages/HomePage.vue` ← **MODIFY** — Add upcoming events + recent jobs sections for admin
- `apps/web/src/pages/DashboardPage.vue` ← **MODIFY** — Add events/jobs KPI cards and charts
- `apps/web/src/features/alumni/composables/useDashboard.ts` ← **MODIFY** — Extend `DashboardStats` interface
- `apps/web/src/router.ts` ← **MODIFY** — Register new routes

---

## Implementation Details

### Database Models

#### Event
```typescript
// apps/api/src/models/Event.ts
import mongoose from 'mongoose'

export interface IEvent {
  title: string
  description: string
  startDate: Date
  endDate: Date
  location: string
  imageUrl?: string
  createdAt?: Date
  updatedAt?: Date
}

const EventSchema = new mongoose.Schema<IEvent>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  location: { type: String, required: true },
  imageUrl: { type: String },
}, { timestamps: true })

export const Event = mongoose.model<IEvent>('Event', EventSchema)
```

**Computed status logic** (never stored — computed at query time or in response):
- `upcoming`: `startDate > now`
- `ongoing`: `startDate <= now && endDate >= now`
- `past`: `endDate < now`

#### EventAttendance
```typescript
// apps/api/src/models/EventAttendance.ts
import mongoose from 'mongoose'

export interface IEventAttendance {
  eventId: mongoose.Types.ObjectId
  userId: string  // BetterAuth user ID (string)
  status: 'going' | 'interested' | 'not_going'
  createdAt?: Date
  updatedAt?: Date
}

const EventAttendanceSchema = new mongoose.Schema<IEventAttendance>({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  userId: { type: String, required: true },
  status: { type: String, enum: ['going', 'interested', 'not_going'], required: true },
}, { timestamps: true })

EventAttendanceSchema.index({ eventId: 1, userId: 1 }, { unique: true })

export const EventAttendance = mongoose.model<IEventAttendance>('EventAttendance', EventAttendanceSchema)
```

#### JobAnnouncement
```typescript
// apps/api/src/models/JobAnnouncement.ts
import mongoose from 'mongoose'

export interface IJobAnnouncement {
  title: string
  company: string
  type: 'CDI' | 'CDD' | 'stage' | 'alternance' | 'freelance'
  location: string
  description: string
  url?: string
  status: 'draft' | 'active' | 'closed'
  createdAt?: Date
  updatedAt?: Date
}

const JobAnnouncementSchema = new mongoose.Schema<IJobAnnouncement>({
  title: { type: String, required: true },
  company: { type: String, required: true },
  type: { type: String, enum: ['CDI', 'CDD', 'stage', 'alternance', 'freelance'], required: true },
  location: { type: String, required: true },
  description: { type: String, required: true },
  url: { type: String },
  status: { type: String, enum: ['draft', 'active', 'closed'], default: 'draft' },
}, { timestamps: true })

export const JobAnnouncement = mongoose.model<IJobAnnouncement>('JobAnnouncement', JobAnnouncementSchema)
```

#### JobInterest
```typescript
// apps/api/src/models/JobInterest.ts
import mongoose from 'mongoose'

export interface IJobInterest {
  jobId: mongoose.Types.ObjectId
  userId: string
  status: 'interested' | 'not_interested'
  createdAt?: Date
  updatedAt?: Date
}

const JobInterestSchema = new mongoose.Schema<IJobInterest>({
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobAnnouncement', required: true },
  userId: { type: String, required: true },
  status: { type: String, enum: ['interested', 'not_interested'], required: true },
}, { timestamps: true })

JobInterestSchema.index({ jobId: 1, userId: 1 }, { unique: true })

export const JobInterest = mongoose.model<IJobInterest>('JobInterest', JobInterestSchema)
```

---

### Shared Schema Additions

```typescript
// libs/shared-schema/src/index.ts — add:

export const JobTypeEnum = z.enum(['CDI', 'CDD', 'stage', 'alternance', 'freelance'])
export type JobType = z.infer<typeof JobTypeEnum>

export const JobStatusEnum = z.enum(['draft', 'active', 'closed'])
export type JobStatus = z.infer<typeof JobStatusEnum>

export const AttendanceStatusEnum = z.enum(['going', 'interested', 'not_going'])
export type AttendanceStatus = z.infer<typeof AttendanceStatusEnum>

export const JobInterestStatusEnum = z.enum(['interested', 'not_interested'])
export type JobInterestStatus = z.infer<typeof JobInterestStatusEnum>

export const EventSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(10),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  location: z.string().min(2),
  imageUrl: z.string().url().optional().nullable(),
})
export const EventUpdateSchema = EventSchema.partial()
export type EventInput = z.infer<typeof EventSchema>

export const JobAnnouncementSchema = z.object({
  title: z.string().min(2),
  company: z.string().min(2),
  type: JobTypeEnum,
  location: z.string().min(2),
  description: z.string().min(10),
  url: z.string().url().optional().nullable(),
  status: JobStatusEnum.default('draft'),
})
export const JobAnnouncementUpdateSchema = JobAnnouncementSchema.partial()
export type JobAnnouncementInput = z.infer<typeof JobAnnouncementSchema>
```

---

### API Endpoints

#### Events Plugin (`apps/api/src/routes/events.ts`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/events` | requireAuth | List events with computed status + alumni's attendance if logged in |
| `GET` | `/events/:id` | requireAuth | Get single event detail |
| `POST` | `/events` | requireAdmin | Create event |
| `PUT` | `/events/:id` | requireAdmin | Update event |
| `DELETE` | `/events/:id` | requireAdmin | Delete event |
| `POST` | `/events/:id/attendance` | requireAuth | Upsert attendance (`{ status: 'going' \| 'interested' \| 'not_going' }`) |
| `GET` | `/events/:id/attendance` | requireAdmin | List attendees for an event |

**GET /events response** (add computed `status` field per event):
```json
{
  "status": "success",
  "data": [
    {
      "_id": "...",
      "title": "Alumni Meetup 2026",
      "description": "...",
      "startDate": "2026-04-10T18:00:00Z",
      "endDate": "2026-04-10T21:00:00Z",
      "location": "Paris",
      "imageUrl": null,
      "status": "upcoming",
      "attendanceCounts": { "going": 12, "interested": 5 },
      "myAttendance": "going"
    }
  ]
}
```

#### Job Announcements Plugin (`apps/api/src/routes/jobAnnouncements.ts`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/job-announcements` | requireAuth | List jobs (alumni see only `active`; admin see all + filter by status) |
| `GET` | `/job-announcements/:id` | requireAuth | Get single job detail |
| `POST` | `/job-announcements` | requireAdmin | Create job announcement |
| `PUT` | `/job-announcements/:id` | requireAdmin | Full update |
| `PATCH` | `/job-announcements/:id/status` | requireAdmin | Update status only |
| `DELETE` | `/job-announcements/:id` | requireAdmin | Delete job announcement |
| `POST` | `/job-announcements/:id/interest` | requireAuth | Upsert interest (`{ status: 'interested' \| 'not_interested' }`) |

**GET /job-announcements** — admin receives query param `?status=draft|active|closed` for filtering.

#### Dashboard Stats Extension

Add to `/dashboard/stats` response:
```json
{
  "events": {
    "total": 12,
    "upcoming": 3,
    "ongoing": 1,
    "past": 8,
    "byMonth": [{ "month": "2026-01", "count": 2 }, ...]
  },
  "jobs": {
    "total": 20,
    "byStatus": { "draft": 2, "active": 10, "closed": 8 },
    "byType": [{ "type": "CDI", "count": 6 }, ...]
  }
}
```

---

### Frontend Architecture

#### TanStack Query Composables

**`useEvents.ts`**
```typescript
export function useEvents(isAdmin: Ref<boolean>) { /* GET /events */ }
export function useEvent(id: Ref<string>) { /* GET /events/:id */ }
export function useCreateEvent() { /* POST /events — admin */ }
export function useUpdateEvent() { /* PUT /events/:id — admin */ }
export function useDeleteEvent() { /* DELETE /events/:id — admin */ }
export function useUpsertAttendance() { /* POST /events/:id/attendance */ }
```

**`useJobAnnouncements.ts`**
```typescript
export function useJobAnnouncements(statusFilter?: Ref<string>) { /* GET /job-announcements */ }
export function useCreateJob() { /* POST /job-announcements */ }
export function useUpdateJob() { /* PUT /job-announcements/:id */ }
export function usePatchJobStatus() { /* PATCH /job-announcements/:id/status */ }
export function useDeleteJob() { /* DELETE /job-announcements/:id */ }
export function useUpsertJobInterest() { /* POST /job-announcements/:id/interest */ }
```

#### FeedPage (`/feed`)

- Accessible to all authenticated users (`requiresAuth: true`)
- Uses shadcn-vue `Tabs` component with two tabs: **Événements** | **Annonces d'emploi**
- **Events tab**: Filter buttons (Tous / À venir / En cours / Passés). Cards sorted by `startDate` desc. Each `EventCard` shows status badge, attendance counts, and attendance action buttons.
- **Jobs tab**: Filter badges by job type. Cards sorted by `createdAt` desc. Each `JobAnnouncementCard` shows company, type badge, status, and interest button.

**EventCard layout:**
```
[Image banner (if imageUrl)]
[Status badge: À venir / En cours / Passé]
Title
Date & Time · Location
Description (truncated 3 lines)
─────────────────────────────────
👥 12 participants · ⭐ 5 intéressés
[Je viens] [Je suis intéressé(e)] [Je ne viens pas]
```

**JobAnnouncementCard layout:**
```
Company name  [Type badge: CDI]
Title
📍 Location · 📅 Published date
Description (truncated 3 lines)
[Voir l'offre ↗]  [Je suis intéressé(e)]
```

#### AdminEventsPage (`/admin/events`)

- Table listing all events with columns: Title, Location, Start Date, Status (computed), Attendees count, Actions (edit, delete)
- "Créer un événement" button opens a `Dialog` containing `EventForm`
- Row click / edit button opens the same form pre-filled
- Delete button shows confirmation `Dialog`

**EventForm fields:** title, description, startDate (datetime-local), endDate (datetime-local), location, imageUrl (optional)

#### AdminJobsPage (`/admin/job-announcements`)

- Table listing all jobs with columns: Title, Company, Type, Location, Status (badge), Created, Actions
- Status column shows `Badge` with color: draft=gray, active=green, closed=red
- "Créer une annonce" button opens `Dialog` with `JobAnnouncementForm`
- Status can be changed inline via a `Select` in the row (calls `PATCH /status`)
- Delete button with confirmation

**JobAnnouncementForm fields:** title, company, type (select), location, description, url (optional), status (select)

#### HomePage Admin Extensions

Add two new sections after the existing stats cards:

**Section: Prochains événements**
- Shows up to 3 upcoming events as compact cards (title, date, location, attendees count)
- "Voir tous les événements" link → `/admin/events`
- If none: empty state "Aucun événement à venir"

**Section: Annonces actives récentes**
- Shows up to 3 active job announcements as compact cards (title, company, type badge)
- "Voir toutes les annonces" link → `/admin/job-announcements`
- If none: empty state "Aucune annonce active"

#### DashboardPage Extensions

**New KPI Cards (add to existing 4-card row, or add a second row):**
- Événements à venir (count)
- Événements ce mois (count)
- Annonces actives (count)
- Annonces publiées ce mois (count)

**New Charts:**
- **Événements par mois** (Bar chart) — `events.byMonth`
- **Annonces par type** (Doughnut) — `jobs.byType`
- **Statut des annonces** (Doughnut: draft/active/closed)

---

### Router Updates

```typescript
// apps/web/src/router.ts — add:
{ path: '/feed', component: FeedPage, meta: { requiresAuth: true } },
{ path: '/admin/events', component: AdminEventsPage, meta: { requiresAdmin: true } },
{ path: '/admin/job-announcements', component: AdminJobsPage, meta: { requiresAdmin: true } },
```

---

### Navigation Updates

Add "Feed" link to the navbar for alumni users and "Événements" + "Annonces" links for admin users (check existing `App.vue` navbar).

---

## Validation Criteria

### Functional Requirements
- [ ] Admin can create an event with all required fields — event appears in DB
- [ ] Admin can edit an event — changes persist
- [ ] Admin can delete an event — event and its attendance records removed
- [ ] Event status is `upcoming` when `startDate > now`, `ongoing` when in progress, `past` when `endDate < now`
- [ ] Alumni can mark attendance on an event — re-clicking with same status is idempotent; changing updates the record
- [ ] Admin can create a job announcement with status `draft`
- [ ] Admin can change job status to `active` — alumni can now see it in their feed
- [ ] Admin can change job status to `closed` — disappears from alumni feed
- [ ] Admin can delete a job announcement — also removes interest records
- [ ] Alumni can mark interest on a job announcement
- [ ] Feed page shows Events and Job Announcements in separate tabs
- [ ] Alumni tab only shows `active` jobs (not draft or closed)
- [ ] Admin events page lists all events with correct computed status
- [ ] Admin jobs page lists all jobs with status badges and inline status change
- [ ] Admin home shows up to 3 upcoming events and 3 active jobs
- [ ] Dashboard shows event and job KPI cards
- [ ] Dashboard shows "events by month" bar chart
- [ ] Dashboard shows "jobs by type" doughnut and "jobs by status" doughnut

### Technical Requirements
- [ ] TypeScript compiles without errors (`bun run build` in `apps/web`)
- [ ] No `any` types — use Zod-inferred types or explicit interfaces
- [ ] All new API routes have OpenAPI schema (tags, summary, security, response)
- [ ] All admin routes use `preHandler: requireAdmin`
- [ ] All alumni routes use `preHandler: requireAuth`
- [ ] Shared schemas exported from `libs/shared-schema` and imported with `@alumni/shared-schema`
- [ ] Frontend validates form inputs with Zod `safeParse()` before sending
- [ ] TanStack Query invalidates relevant queries on mutation success
- [ ] Attendance and interest records use compound unique index (eventId+userId, jobId+userId)
- [ ] No console errors in browser

### Testing Steps (manual)

1. Start the stack: `docker compose up` (or `bun dev:api` + `bun dev:web`)
2. Log in as admin
3. Navigate to `/admin/events` → create an event with future dates → verify it appears with status "À venir"
4. Create a second event with past dates → verify status "Passé"
5. Edit the first event → verify changes saved
6. Navigate to `/admin/job-announcements` → create a job with status `draft`
7. Verify the job does NOT appear at `/feed` for an alumni account
8. Change job status to `active` → verify it NOW appears in alumni feed
9. Log in as alumni → go to `/feed` → mark attendance on an event → verify badge updates
10. Mark interest on a job → verify interest recorded
11. Log back in as admin → go to `/` (home) → verify upcoming event and active job appear in new sections
12. Go to `/dashboard` → verify new KPI cards show correct counts → verify new charts render without errors
13. Delete the event → verify attendance records also removed → event gone from admin list and feed

---

## Tests Automatisés

### Stack de test (cohérent avec le PRP `testing-and-ci.md`)

| Package | Runner | Raison |
|---|---|---|
| `libs/shared-schema` | `bun test` | Pure TS, zéro dépendance DOM |
| `apps/api` | `bun test` + mongodb-memory-server | Fastify `inject()`, pas de serveur HTTP réel |
| `apps/web` | `vitest` + `@vue/test-utils` | Intégration native Vite, support Vue SFC |

### Nouveaux fichiers de test

```
libs/shared-schema/src/__tests__/events-jobs-schemas.test.ts
apps/api/src/__tests__/events.test.ts
apps/api/src/__tests__/jobAnnouncements.test.ts
apps/web/src/__tests__/EventCard.test.ts
apps/web/src/__tests__/JobAnnouncementCard.test.ts
```

---

### 1. shared-schema — Zod schema tests

**`libs/shared-schema/src/__tests__/events-jobs-schemas.test.ts`**

```typescript
import { describe, it, expect } from 'bun:test'
import {
  EventSchema,
  EventUpdateSchema,
  JobAnnouncementSchema,
  JobAnnouncementUpdateSchema,
  JobTypeEnum,
  JobStatusEnum,
  AttendanceStatusEnum,
  JobInterestStatusEnum,
} from '../index'

const validEvent = {
  title: 'Alumni Meetup 2026',
  description: 'Rencontre annuelle des diplômés de MDS.',
  startDate: '2026-06-15T18:00:00Z',
  endDate: '2026-06-15T22:00:00Z',
  location: 'Paris, France',
}

const validJob = {
  title: 'Développeur Full Stack',
  company: 'Acme Corp',
  type: 'CDI',
  location: 'Paris',
  description: 'Rejoignez notre équipe produit en pleine croissance.',
  status: 'active',
}

// ─── EventSchema ──────────────────────────────────────────────────────────────

describe('EventSchema', () => {
  it('accepte un événement valide', () => {
    expect(EventSchema.safeParse(validEvent).success).toBe(true)
  })

  it('accepte imageUrl optionnel null', () => {
    expect(EventSchema.safeParse({ ...validEvent, imageUrl: null }).success).toBe(true)
  })

  it('rejette une URL imageUrl invalide', () => {
    expect(EventSchema.safeParse({ ...validEvent, imageUrl: 'pas-une-url' }).success).toBe(false)
  })

  it('rejette un titre trop court', () => {
    expect(EventSchema.safeParse({ ...validEvent, title: 'A' }).success).toBe(false)
  })

  it('rejette une description trop courte', () => {
    expect(EventSchema.safeParse({ ...validEvent, description: 'Court' }).success).toBe(false)
  })

  it('rejette une startDate non ISO', () => {
    expect(EventSchema.safeParse({ ...validEvent, startDate: '15/06/2026' }).success).toBe(false)
  })

  it('rejette un location trop court', () => {
    expect(EventSchema.safeParse({ ...validEvent, location: 'P' }).success).toBe(false)
  })
})

describe('EventUpdateSchema', () => {
  it('accepte une mise à jour partielle (location seule)', () => {
    expect(EventUpdateSchema.safeParse({ location: 'Lyon' }).success).toBe(true)
  })

  it('accepte un objet vide', () => {
    expect(EventUpdateSchema.safeParse({}).success).toBe(true)
  })
})

// ─── JobAnnouncementSchema ────────────────────────────────────────────────────

describe('JobAnnouncementSchema', () => {
  it('accepte une annonce valide', () => {
    expect(JobAnnouncementSchema.safeParse(validJob).success).toBe(true)
  })

  it('accepte url optionnel null', () => {
    expect(JobAnnouncementSchema.safeParse({ ...validJob, url: null }).success).toBe(true)
  })

  it('rejette une url invalide non nulle', () => {
    expect(JobAnnouncementSchema.safeParse({ ...validJob, url: 'pas-une-url' }).success).toBe(false)
  })

  it('rejette un type de contrat invalide', () => {
    expect(JobAnnouncementSchema.safeParse({ ...validJob, type: 'inconnu' }).success).toBe(false)
  })

  it('accepte tous les types de contrat valides', () => {
    const types = ['CDI', 'CDD', 'stage', 'alternance', 'freelance']
    for (const type of types) {
      expect(JobAnnouncementSchema.safeParse({ ...validJob, type }).success).toBe(true)
    }
  })

  it('rejette un statut invalide', () => {
    expect(JobAnnouncementSchema.safeParse({ ...validJob, status: 'published' }).success).toBe(false)
  })

  it('définit draft comme statut par défaut', () => {
    const result = JobAnnouncementSchema.safeParse({ ...validJob, status: undefined })
    expect(result.success).toBe(true)
    expect(result.data?.status).toBe('draft')
  })

  it('rejette un titre trop court', () => {
    expect(JobAnnouncementSchema.safeParse({ ...validJob, title: 'A' }).success).toBe(false)
  })
})

describe('JobAnnouncementUpdateSchema', () => {
  it('accepte une mise à jour partielle (status seul)', () => {
    expect(JobAnnouncementUpdateSchema.safeParse({ status: 'closed' }).success).toBe(true)
  })
})

// ─── Enums ───────────────────────────────────────────────────────────────────

describe('Enums', () => {
  it('JobTypeEnum contient les 5 types attendus', () => {
    const values = JobTypeEnum.options
    expect(values).toContain('CDI')
    expect(values).toContain('CDD')
    expect(values).toContain('stage')
    expect(values).toContain('alternance')
    expect(values).toContain('freelance')
  })

  it('JobStatusEnum contient draft, active, closed', () => {
    const values = JobStatusEnum.options
    expect(values).toContain('draft')
    expect(values).toContain('active')
    expect(values).toContain('closed')
  })

  it('AttendanceStatusEnum contient going, interested, not_going', () => {
    const values = AttendanceStatusEnum.options
    expect(values).toContain('going')
    expect(values).toContain('interested')
    expect(values).toContain('not_going')
  })

  it('JobInterestStatusEnum contient interested, not_interested', () => {
    const values = JobInterestStatusEnum.options
    expect(values).toContain('interested')
    expect(values).toContain('not_interested')
  })
})
```

---

### 2. API — Events routes (`bun test`)

> Utilise le même pattern `buildApp` + `mongodb-memory-server` que le helper existant dans `apps/api/src/__tests__/helpers/app.ts`. Étendre ce helper pour inclure les routes events et job-announcements avec middleware mocké.

**`apps/api/src/__tests__/events.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'bun:test'
import { buildApp } from './helpers/app'
import { startDb, stopDb, clearDb } from './setup'

let app: Awaited<ReturnType<typeof buildApp>>

const futureStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
const futureEnd   = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString()
const pastStart   = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
const pastEnd     = new Date(Date.now() -  9 * 24 * 60 * 60 * 1000).toISOString()

const validEvent = {
  title: 'Alumni Meetup',
  description: 'Rencontre annuelle des diplômés de MDS.',
  startDate: futureStart,
  endDate: futureEnd,
  location: 'Paris',
}

beforeAll(async () => {
  await startDb()
  app = await buildApp()
})
afterEach(async () => { await clearDb() })
afterAll(async () => {
  await app.close()
  await stopDb()
})

describe('GET /events', () => {
  it('retourne une liste vide', async () => {
    const res = await app.inject({ method: 'GET', url: '/events' })
    expect(res.statusCode).toBe(200)
    expect(res.json().data).toHaveLength(0)
  })

  it('retourne les événements créés', async () => {
    await app.inject({ method: 'POST', url: '/events', payload: validEvent })
    const res = await app.inject({ method: 'GET', url: '/events' })
    expect(res.json().data).toHaveLength(1)
  })
})

describe('POST /events', () => {
  it('crée un événement avec des données valides', async () => {
    const res = await app.inject({ method: 'POST', url: '/events', payload: validEvent })
    expect(res.statusCode).toBe(201)
    expect(res.json().data.title).toBe('Alumni Meetup')
  })

  it('retourne 400 avec des données invalides', async () => {
    const res = await app.inject({ method: 'POST', url: '/events', payload: { title: 'A' } })
    expect(res.statusCode).toBe(400)
  })
})

describe('Computed event status', () => {
  it('calcule "upcoming" pour un événement futur', async () => {
    await app.inject({ method: 'POST', url: '/events', payload: validEvent })
    const res = await app.inject({ method: 'GET', url: '/events' })
    expect(res.json().data[0].status).toBe('upcoming')
  })

  it('calcule "past" pour un événement passé', async () => {
    await app.inject({
      method: 'POST',
      url: '/events',
      payload: { ...validEvent, startDate: pastStart, endDate: pastEnd },
    })
    const res = await app.inject({ method: 'GET', url: '/events' })
    expect(res.json().data[0].status).toBe('past')
  })
})

describe('PUT /events/:id', () => {
  it('met à jour un événement existant', async () => {
    const created = await app.inject({ method: 'POST', url: '/events', payload: validEvent })
    const id = created.json().data._id
    const res = await app.inject({
      method: 'PUT',
      url: `/events/${id}`,
      payload: { location: 'Lyon' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.location).toBe('Lyon')
  })

  it('retourne 404 pour un ID inexistant', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/events/000000000000000000000000',
      payload: { location: 'Lyon' },
    })
    expect(res.statusCode).toBe(404)
  })
})

describe('DELETE /events/:id', () => {
  it('supprime l\'événement et ses participations', async () => {
    const created = await app.inject({ method: 'POST', url: '/events', payload: validEvent })
    const id = created.json().data._id

    // Marquer une participation
    await app.inject({
      method: 'POST',
      url: `/events/${id}/attendance`,
      payload: { status: 'going' },
    })

    const delRes = await app.inject({ method: 'DELETE', url: `/events/${id}` })
    expect(delRes.statusCode).toBe(200)

    // L'événement ne doit plus exister
    const getRes = await app.inject({ method: 'GET', url: `/events/${id}` })
    expect(getRes.statusCode).toBe(404)
  })

  it('retourne 404 pour un ID inexistant', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/events/000000000000000000000000' })
    expect(res.statusCode).toBe(404)
  })
})

describe('POST /events/:id/attendance', () => {
  it('enregistre une participation "going"', async () => {
    const created = await app.inject({ method: 'POST', url: '/events', payload: validEvent })
    const id = created.json().data._id

    const res = await app.inject({
      method: 'POST',
      url: `/events/${id}/attendance`,
      payload: { status: 'going' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.status).toBe('going')
  })

  it('met à jour la participation si on rappelle avec un autre statut', async () => {
    const created = await app.inject({ method: 'POST', url: '/events', payload: validEvent })
    const id = created.json().data._id

    await app.inject({ method: 'POST', url: `/events/${id}/attendance`, payload: { status: 'going' } })
    const res = await app.inject({
      method: 'POST',
      url: `/events/${id}/attendance`,
      payload: { status: 'interested' },
    })
    expect(res.json().data.status).toBe('interested')
  })

  it('retourne 400 pour un statut de participation invalide', async () => {
    const created = await app.inject({ method: 'POST', url: '/events', payload: validEvent })
    const id = created.json().data._id

    const res = await app.inject({
      method: 'POST',
      url: `/events/${id}/attendance`,
      payload: { status: 'maybe' },
    })
    expect(res.statusCode).toBe(400)
  })
})
```

---

### 3. API — Job Announcements routes (`bun test`)

**`apps/api/src/__tests__/jobAnnouncements.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'bun:test'
import { buildApp } from './helpers/app'
import { startDb, stopDb, clearDb } from './setup'

let app: Awaited<ReturnType<typeof buildApp>>

const validJob = {
  title: 'Développeur Full Stack',
  company: 'Acme Corp',
  type: 'CDI',
  location: 'Paris',
  description: 'Rejoignez notre équipe produit en pleine croissance.',
  status: 'draft',
}

beforeAll(async () => {
  await startDb()
  app = await buildApp()
})
afterEach(async () => { await clearDb() })
afterAll(async () => {
  await app.close()
  await stopDb()
})

describe('GET /job-announcements (admin)', () => {
  it('retourne toutes les annonces (draft inclus) pour un admin', async () => {
    await app.inject({ method: 'POST', url: '/job-announcements', payload: validJob })
    const res = await app.inject({ method: 'GET', url: '/job-announcements' })
    expect(res.statusCode).toBe(200)
    expect(res.json().data).toHaveLength(1)
  })
})

describe('GET /job-announcements (alumni)', () => {
  it('ne retourne que les annonces actives pour un alumni', async () => {
    await app.inject({ method: 'POST', url: '/job-announcements', payload: validJob }) // draft
    await app.inject({ method: 'POST', url: '/job-announcements', payload: { ...validJob, title: 'Dev Backend', status: 'active' } })

    // Simuler la vue alumni (filtre status=active côté API)
    const res = await app.inject({ method: 'GET', url: '/job-announcements?alumniView=true' })
    expect(res.json().data.every((j: { status: string }) => j.status === 'active')).toBe(true)
    expect(res.json().data).toHaveLength(1)
  })
})

describe('POST /job-announcements', () => {
  it('crée une annonce avec des données valides', async () => {
    const res = await app.inject({ method: 'POST', url: '/job-announcements', payload: validJob })
    expect(res.statusCode).toBe(201)
    expect(res.json().data.title).toBe('Développeur Full Stack')
    expect(res.json().data.status).toBe('draft')
  })

  it('retourne 400 avec un type de contrat invalide', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/job-announcements',
      payload: { ...validJob, type: 'inconnu' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('retourne 400 sans titre', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/job-announcements',
      payload: { ...validJob, title: undefined },
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('PATCH /job-announcements/:id/status', () => {
  it('passe draft → active', async () => {
    const created = await app.inject({ method: 'POST', url: '/job-announcements', payload: validJob })
    const id = created.json().data._id

    const res = await app.inject({
      method: 'PATCH',
      url: `/job-announcements/${id}/status`,
      payload: { status: 'active' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.status).toBe('active')
  })

  it('passe active → closed', async () => {
    const created = await app.inject({ method: 'POST', url: '/job-announcements', payload: { ...validJob, status: 'active' } })
    const id = created.json().data._id

    const res = await app.inject({
      method: 'PATCH',
      url: `/job-announcements/${id}/status`,
      payload: { status: 'closed' },
    })
    expect(res.json().data.status).toBe('closed')
  })

  it('retourne 400 pour un statut invalide', async () => {
    const created = await app.inject({ method: 'POST', url: '/job-announcements', payload: validJob })
    const id = created.json().data._id

    const res = await app.inject({
      method: 'PATCH',
      url: `/job-announcements/${id}/status`,
      payload: { status: 'published' },
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('PUT /job-announcements/:id', () => {
  it('met à jour une annonce existante', async () => {
    const created = await app.inject({ method: 'POST', url: '/job-announcements', payload: validJob })
    const id = created.json().data._id

    const res = await app.inject({
      method: 'PUT',
      url: `/job-announcements/${id}`,
      payload: { company: 'Nouvelle Corp' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.company).toBe('Nouvelle Corp')
  })
})

describe('DELETE /job-announcements/:id', () => {
  it('supprime l\'annonce et ses intérêts associés', async () => {
    const created = await app.inject({ method: 'POST', url: '/job-announcements', payload: validJob })
    const id = created.json().data._id

    // Marquer un intérêt
    await app.inject({
      method: 'POST',
      url: `/job-announcements/${id}/interest`,
      payload: { status: 'interested' },
    })

    const delRes = await app.inject({ method: 'DELETE', url: `/job-announcements/${id}` })
    expect(delRes.statusCode).toBe(200)

    const getRes = await app.inject({ method: 'GET', url: `/job-announcements/${id}` })
    expect(getRes.statusCode).toBe(404)
  })
})

describe('POST /job-announcements/:id/interest', () => {
  it('enregistre un intérêt "interested"', async () => {
    const created = await app.inject({ method: 'POST', url: '/job-announcements', payload: validJob })
    const id = created.json().data._id

    const res = await app.inject({
      method: 'POST',
      url: `/job-announcements/${id}/interest`,
      payload: { status: 'interested' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.status).toBe('interested')
  })

  it('met à jour l\'intérêt si rappelé avec un autre statut', async () => {
    const created = await app.inject({ method: 'POST', url: '/job-announcements', payload: validJob })
    const id = created.json().data._id

    await app.inject({ method: 'POST', url: `/job-announcements/${id}/interest`, payload: { status: 'interested' } })
    const res = await app.inject({
      method: 'POST',
      url: `/job-announcements/${id}/interest`,
      payload: { status: 'not_interested' },
    })
    expect(res.json().data.status).toBe('not_interested')
  })

  it('retourne 400 pour un statut d\'intérêt invalide', async () => {
    const created = await app.inject({ method: 'POST', url: '/job-announcements', payload: validJob })
    const id = created.json().data._id

    const res = await app.inject({
      method: 'POST',
      url: `/job-announcements/${id}/interest`,
      payload: { status: 'maybe' },
    })
    expect(res.statusCode).toBe(400)
  })
})
```

---

### 4. Web — Composants Vue (`vitest`)

**`apps/web/src/__tests__/EventCard.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import EventCard from '@/features/events/components/EventCard.vue'

const baseEvent = {
  _id: '123',
  title: 'Alumni Meetup',
  description: 'Grande rencontre annuelle.',
  startDate: '2026-06-15T18:00:00Z',
  endDate: '2026-06-15T22:00:00Z',
  location: 'Paris',
  status: 'upcoming' as const,
  attendanceCounts: { going: 12, interested: 5 },
  myAttendance: null,
}

describe('EventCard', () => {
  it('affiche le titre de l\'événement', () => {
    const wrapper = mount(EventCard, { props: { event: baseEvent } })
    expect(wrapper.text()).toContain('Alumni Meetup')
  })

  it('affiche la localisation', () => {
    const wrapper = mount(EventCard, { props: { event: baseEvent } })
    expect(wrapper.text()).toContain('Paris')
  })

  it('affiche le badge "À venir" pour un événement upcoming', () => {
    const wrapper = mount(EventCard, { props: { event: baseEvent } })
    expect(wrapper.text()).toContain('À venir')
  })

  it('affiche le badge "Passé" pour un événement past', () => {
    const wrapper = mount(EventCard, { props: { event: { ...baseEvent, status: 'past' } } })
    expect(wrapper.text()).toContain('Passé')
  })

  it('affiche le badge "En cours" pour un événement ongoing', () => {
    const wrapper = mount(EventCard, { props: { event: { ...baseEvent, status: 'ongoing' } } })
    expect(wrapper.text()).toContain('En cours')
  })

  it('affiche le nombre de participants', () => {
    const wrapper = mount(EventCard, { props: { event: baseEvent } })
    expect(wrapper.text()).toContain('12')
  })

  it('émet l\'événement "attend" lors du clic sur "Je viens"', async () => {
    const wrapper = mount(EventCard, { props: { event: baseEvent } })
    const btn = wrapper.find('[data-testid="btn-going"]')
    await btn.trigger('click')
    expect(wrapper.emitted('attend')).toBeTruthy()
    expect(wrapper.emitted('attend')![0]).toEqual([{ eventId: '123', status: 'going' }])
  })

  it('marque le bouton actif si myAttendance correspond', () => {
    const wrapper = mount(EventCard, {
      props: { event: { ...baseEvent, myAttendance: 'going' } },
    })
    const btn = wrapper.find('[data-testid="btn-going"]')
    expect(btn.classes()).toContain('active') // ou vérifier aria-pressed selon l'implémentation
  })
})
```

**`apps/web/src/__tests__/JobAnnouncementCard.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import JobAnnouncementCard from '@/features/events/components/JobAnnouncementCard.vue'

const baseJob = {
  _id: '456',
  title: 'Développeur Full Stack',
  company: 'Acme Corp',
  type: 'CDI' as const,
  location: 'Paris',
  description: 'Rejoignez notre équipe produit en pleine croissance.',
  status: 'active' as const,
  url: 'https://acme.com/jobs/1',
  myInterest: null,
  createdAt: '2026-03-01T10:00:00Z',
}

describe('JobAnnouncementCard', () => {
  it('affiche le titre du poste', () => {
    const wrapper = mount(JobAnnouncementCard, { props: { job: baseJob } })
    expect(wrapper.text()).toContain('Développeur Full Stack')
  })

  it('affiche le nom de l\'entreprise', () => {
    const wrapper = mount(JobAnnouncementCard, { props: { job: baseJob } })
    expect(wrapper.text()).toContain('Acme Corp')
  })

  it('affiche le badge de type de contrat', () => {
    const wrapper = mount(JobAnnouncementCard, { props: { job: baseJob } })
    expect(wrapper.text()).toContain('CDI')
  })

  it('affiche la localisation', () => {
    const wrapper = mount(JobAnnouncementCard, { props: { job: baseJob } })
    expect(wrapper.text()).toContain('Paris')
  })

  it('affiche le lien "Voir l\'offre" si url présente', () => {
    const wrapper = mount(JobAnnouncementCard, { props: { job: baseJob } })
    const link = wrapper.find('a[href="https://acme.com/jobs/1"]')
    expect(link.exists()).toBe(true)
  })

  it('n\'affiche pas le lien si url absente', () => {
    const wrapper = mount(JobAnnouncementCard, { props: { job: { ...baseJob, url: null } } })
    expect(wrapper.find('a[href]').exists()).toBe(false)
  })

  it('émet l\'événement "interest" lors du clic sur "Je suis intéressé(e)"', async () => {
    const wrapper = mount(JobAnnouncementCard, { props: { job: baseJob } })
    const btn = wrapper.find('[data-testid="btn-interested"]')
    await btn.trigger('click')
    expect(wrapper.emitted('interest')).toBeTruthy()
    expect(wrapper.emitted('interest')![0]).toEqual([{ jobId: '456', status: 'interested' }])
  })

  it('marque le bouton intérêt actif si myInterest = "interested"', () => {
    const wrapper = mount(JobAnnouncementCard, {
      props: { job: { ...baseJob, myInterest: 'interested' } },
    })
    const btn = wrapper.find('[data-testid="btn-interested"]')
    expect(btn.classes()).toContain('active')
  })
})
```

---

### 5. Extension du helper `buildApp`

Le helper `apps/api/src/__tests__/helpers/app.ts` doit être étendu pour inclure les routes events et job-announcements avec les middlewares mockés. Ajouter les routes suivantes dans la factory :

```typescript
// Dans buildApp() — ajouter après les routes alumni existantes :
import { Event } from '../../models/Event'
import { EventAttendance } from '../../models/EventAttendance'
import { JobAnnouncement } from '../../models/JobAnnouncement'
import { JobInterest } from '../../models/JobInterest'
import { EventSchema, EventUpdateSchema, JobAnnouncementSchema, JobAnnouncementUpdateSchema, AttendanceStatusEnum, JobInterestStatusEnum } from '@alumni/shared-schema'

// Mock userId fixe pour les tests (simule un alumni connecté)
const MOCK_USER_ID = 'test-user-id'

function computeStatus(startDate: Date, endDate: Date): 'upcoming' | 'ongoing' | 'past' {
  const now = new Date()
  if (startDate > now) return 'upcoming'
  if (endDate < now) return 'past'
  return 'ongoing'
}

// ─── Events ──────────────────────────────────────────────────────────────────
app.get('/events', { preHandler: requireAuth }, async (_req, reply) => {
  const events = await Event.find().sort({ startDate: 1 }).lean()
  const data = events.map(e => ({ ...e, status: computeStatus(e.startDate, e.endDate) }))
  return reply.send({ status: 'success', data })
})

app.get('/events/:id', { preHandler: requireAuth }, async (req, reply) => {
  const { id } = req.params as { id: string }
  const event = await Event.findById(id).lean()
  if (!event) return reply.status(404).send({ status: 'error' })
  return reply.send({ status: 'success', data: { ...event, status: computeStatus(event.startDate, event.endDate) } })
})

app.post('/events', { preHandler: requireAdmin }, async (req, reply) => {
  const result = EventSchema.safeParse(req.body)
  if (!result.success) return reply.status(400).send({ status: 'error', issues: result.error.issues })
  const event = await new Event(result.data).save()
  return reply.status(201).send({ status: 'success', data: event })
})

app.put('/events/:id', { preHandler: requireAdmin }, async (req, reply) => {
  const { id } = req.params as { id: string }
  const result = EventUpdateSchema.safeParse(req.body)
  if (!result.success) return reply.status(400).send({ status: 'error' })
  const event = await Event.findByIdAndUpdate(id, result.data, { new: true }).lean()
  if (!event) return reply.status(404).send({ status: 'error' })
  return reply.send({ status: 'success', data: event })
})

app.delete('/events/:id', { preHandler: requireAdmin }, async (req, reply) => {
  const { id } = req.params as { id: string }
  const event = await Event.findByIdAndDelete(id)
  if (!event) return reply.status(404).send({ status: 'error' })
  await EventAttendance.deleteMany({ eventId: id })
  return reply.send({ status: 'success' })
})

app.post('/events/:id/attendance', { preHandler: requireAuth }, async (req, reply) => {
  const { id } = req.params as { id: string }
  const parsed = AttendanceStatusEnum.safeParse((req.body as { status: string }).status)
  if (!parsed.success) return reply.status(400).send({ status: 'error' })
  const record = await EventAttendance.findOneAndUpdate(
    { eventId: id, userId: MOCK_USER_ID },
    { status: parsed.data },
    { upsert: true, new: true },
  )
  return reply.send({ status: 'success', data: record })
})

// ─── Job Announcements ───────────────────────────────────────────────────────
app.get('/job-announcements', { preHandler: requireAuth }, async (req, reply) => {
  const alumniView = (req.query as { alumniView?: string }).alumniView === 'true'
  const filter = alumniView ? { status: 'active' } : {}
  const jobs = await JobAnnouncement.find(filter).sort({ createdAt: -1 }).lean()
  return reply.send({ status: 'success', data: jobs })
})

app.get('/job-announcements/:id', { preHandler: requireAuth }, async (req, reply) => {
  const { id } = req.params as { id: string }
  const job = await JobAnnouncement.findById(id).lean()
  if (!job) return reply.status(404).send({ status: 'error' })
  return reply.send({ status: 'success', data: job })
})

app.post('/job-announcements', { preHandler: requireAdmin }, async (req, reply) => {
  const result = JobAnnouncementSchema.safeParse(req.body)
  if (!result.success) return reply.status(400).send({ status: 'error', issues: result.error.issues })
  const job = await new JobAnnouncement(result.data).save()
  return reply.status(201).send({ status: 'success', data: job })
})

app.put('/job-announcements/:id', { preHandler: requireAdmin }, async (req, reply) => {
  const { id } = req.params as { id: string }
  const result = JobAnnouncementUpdateSchema.safeParse(req.body)
  if (!result.success) return reply.status(400).send({ status: 'error' })
  const job = await JobAnnouncement.findByIdAndUpdate(id, result.data, { new: true }).lean()
  if (!job) return reply.status(404).send({ status: 'error' })
  return reply.send({ status: 'success', data: job })
})

app.patch('/job-announcements/:id/status', { preHandler: requireAdmin }, async (req, reply) => {
  const { id } = req.params as { id: string }
  const parsed = JobStatusEnum.safeParse((req.body as { status: string }).status)
  if (!parsed.success) return reply.status(400).send({ status: 'error' })
  const job = await JobAnnouncement.findByIdAndUpdate(id, { status: parsed.data }, { new: true }).lean()
  if (!job) return reply.status(404).send({ status: 'error' })
  return reply.send({ status: 'success', data: job })
})

app.delete('/job-announcements/:id', { preHandler: requireAdmin }, async (req, reply) => {
  const { id } = req.params as { id: string }
  const job = await JobAnnouncement.findByIdAndDelete(id)
  if (!job) return reply.status(404).send({ status: 'error' })
  await JobInterest.deleteMany({ jobId: id })
  return reply.send({ status: 'success' })
})

app.post('/job-announcements/:id/interest', { preHandler: requireAuth }, async (req, reply) => {
  const { id } = req.params as { id: string }
  const parsed = JobInterestStatusEnum.safeParse((req.body as { status: string }).status)
  if (!parsed.success) return reply.status(400).send({ status: 'error' })
  const record = await JobInterest.findOneAndUpdate(
    { jobId: id, userId: MOCK_USER_ID },
    { status: parsed.data },
    { upsert: true, new: true },
  )
  return reply.send({ status: 'success', data: record })
})
```

---

### 6. Critères de couverture

| Suite | Fichier | Assertions min |
|---|---|---|
| shared-schema | `events-jobs-schemas.test.ts` | 20+ |
| API events | `events.test.ts` | 12+ |
| API jobs | `jobAnnouncements.test.ts` | 14+ |
| Web EventCard | `EventCard.test.ts` | 7+ |
| Web JobCard | `JobAnnouncementCard.test.ts` | 8+ |

### 7. Commandes de test

```bash
# Tous les tests
bun test                    # depuis la racine (si scripts root configurés)

# Par package
bun --cwd libs/shared-schema test
bun --cwd apps/api test
bun --cwd apps/web run test
```
