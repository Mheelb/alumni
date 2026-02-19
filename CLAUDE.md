# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# From monorepo root
bun install                      # Install all workspace dependencies
bun dev:api                      # Start API (port 3000, file-watching)
bun dev:web                      # Start frontend dev server (port 5173)
docker compose up                # Start full stack (MongoDB:27018, API:3000, Web:5173)
npx nx graph                     # Visualize project dependency graph

# From apps/api
bun src/scripts/seed-admin.ts    # Seed admin user

# From apps/web
bun run build                    # Type-check and build (vue-tsc + vite)
```

No test framework is configured yet. When tests are added, use `bun test`.

## Architecture

Nx monorepo with Bun as the runtime and package manager.

```
apps/api/          Fastify 5 backend (Bun + MongoDB/Mongoose + BetterAuth)
apps/web/          Vue 3 frontend (Vite + Tailwind + shadcn-vue)
libs/shared-schema/  Zod schemas shared between apps — single source of truth
docker-compose.yml   MongoDB + API + Web containers
```

See `apps/api/CLAUDE.md` for detailed API-specific guidance (conventions, env vars, key files).

## Shared Schema

`libs/shared-schema/src/index.ts` exports `AlumniSchema`, `SignUpSchema`, `LoginSchema`, `UserRole` and their inferred TypeScript types. Import as `@alumni/shared-schema` in both apps. Always use the shared schema for any data crossing the frontend/backend boundary — validate with `safeParse()` on the frontend before sending, and re-validate on the backend.

## Frontend (apps/web)

- **Vue 3** with `<script setup>` and Composition API throughout
- **TanStack Query** (Vue Query) for all server state — avoid manual loading/error state
- **shadcn-vue** for all UI components (`src/components/ui/`); do not build custom primitives
- **BetterAuth** client via `src/lib/auth-client.ts` (`authClient.signIn`, `signUp`, `signOut`, `useSession`)
- **Vue Router 5** config in `src/router.ts`
- Feature-based structure: domain logic lives in `src/features/<feature>/`

## Coding Conventions

- **Bun first** — use `bun` for all package management and script execution, never npm/pnpm/yarn
- **No `any`** — use Zod-inferred types or explicit interfaces
- **Naming**: camelCase for variables/functions, PascalCase for models/components/types, UPPER_SNAKE_CASE for constants
- API endpoints use plural nouns (`/alumni`, `/users`)
- API responses: `{ status: 'success', data: {...} }` or `{ status: 'error', message: '...', issues: [...] }`
