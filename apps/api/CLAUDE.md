# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **API service** of the Alumni platform — a Fastify backend running on Bun within an Nx monorepo. It serves a Vue 3 frontend (`apps/web`).

## Commands

```bash
# From monorepo root (/Users/matteohouillon/Documents/MDS/alumni)
bun install                      # Install all workspace dependencies
bun dev:api                      # Start API with file watching (port 3000)
bun dev:web                      # Start frontend dev server (port 5173)

# From apps/api
bun --watch src/index.ts         # Start API directly
bun src/scripts/seed-admin.ts    # Seed admin user (WIP)

# Docker (from monorepo root)
docker compose up                # Start full stack (MongoDB:27018, API:3000, Web:5173)

# Nx
npx nx graph                     # Visualize project dependency graph
```

No test framework is configured yet. When tests are added, use `bun test`.

## Architecture

```
alumni/                          # Nx monorepo root
├── apps/api/                    # Fastify backend (this project)
├── apps/web/                    # Vue 3 + Vite frontend
├── libs/shared-schema/          # Zod schemas shared between apps
└── docker-compose.yml           # MongoDB + API + Web
```

### API Stack

- **Runtime**: Bun
- **Framework**: Fastify 5 with helmet and CORS
- **Database**: MongoDB via Mongoose 9
- **Auth**: BetterAuth (in progress, not functional — `feat-auth` branch)
- **Validation**: Zod 4 (schemas live in `libs/shared-schema`)
- **Scraping**: Playwright

### Key Files

- `src/index.ts` — Server entrypoint: Fastify setup, MongoDB connection, route definitions
- `src/models/Alumni.ts` — Mongoose model using types from shared-schema
- `src/lib/auth.ts` — BetterAuth configuration with MongoDB adapter
- `src/scripts/seed-admin.ts` — Admin account seeder (not yet functional)

### Shared Schema (`libs/shared-schema/src/index.ts`)

Single source of truth for validation. Exports: `AlumniSchema`, `SignUpSchema`, `LoginSchema`, `UserRole` enum, and their inferred TypeScript types. Import as `@alumni/shared-schema`.

### API Conventions

- Endpoints use plural nouns (`/alumni`, `/users`)
- Validate `request.body` and `request.params` with Zod schemas before processing
- Success: `{ status: 'success', data: { ... } }` or direct object
- Error: `{ status: 'error', message: '...', issues: [...] }`

### Environment Variables

| Variable    | Default                              | Description          |
|-------------|--------------------------------------|----------------------|
| `MONGO_URI` | `mongodb://localhost:27017/alumni`   | MongoDB connection   |
| `PORT`      | `3000`                               | API server port      |

## Coding Conventions

- **Bun first** — use `bun` for all package management and script execution
- **No `any`** — use Zod-inferred types or explicit interfaces
- **Naming**: camelCase for variables/functions, PascalCase for models/components, UPPER_SNAKE_CASE for constants
- Feature-oriented structure in the frontend (`apps/web/src/features/`)
- Use Shadcn-vue for all UI components in the frontend
