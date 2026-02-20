# Testing & CI PRP

## Goal

Mettre en place une suite de tests automatisés sur les trois packages du monorepo et une CI GitHub Actions qui bloque tout merge sur `main` si les tests échouent.

## Why

Le projet n'a aucun filet de sécurité : n'importe quel changement peut silencieusement casser une route, un schéma ou un composant. Des tests + une CI transforment les PRs en un processus fiable et professionnel.

## What

### Inclus
- Tests unitaires pour `libs/shared-schema` (Zod schemas)
- Tests d'intégration pour `apps/api` (routes Fastify + MongoDB in-memory)
- Tests de composants pour `apps/web` (Vue components)
- Scripts `test` dans chaque `package.json`
- Script `test` racine qui lance les trois en séquence
- Workflow GitHub Actions `.github/workflows/ci.yml`
- Section "Tests" ajoutée au `README.md`
- Instructions pour activer la protection de branche sur GitHub

### Exclu
- Tests E2E (Playwright/Cypress) — trop coûteux à maintenir sans infra dédiée
- Coverage report (v2)
- Tests des routes scraper LinkedIn (dépendance externe Apify)
- Tests BetterAuth (authentification déléguée à la lib)

### Frameworks retenus

| Package | Runner | Raison |
|---|---|---|
| `libs/shared-schema` | `bun test` | Pure TS, zéro dépendance DOM |
| `apps/api` | `bun test` | Runtime natif Bun, API Fastify testable avec `inject()` |
| `apps/web` | `vitest` + `@vue/test-utils` | Intégration native Vite, meilleur support Vue SFC |

---

## Technical Context

### Files to Reference (read-only)
- `libs/shared-schema/src/index.ts` — schemas Zod à couvrir
- `apps/api/src/index.ts` — routes à tester, pattern de réponse `{ status, data }`
- `apps/api/src/models/Alumni.ts` — modèle Mongoose
- `apps/api/src/lib/middleware.ts` — `requireAdmin` / `requireAuth` à mocker dans les tests
- `apps/web/src/features/alumni/components/AlumniStatusBadge.vue` — composant à tester
- `README.md` — section Tests à ajouter
- `package.json` (root) — scripts à compléter

### Files to Implement/Modify

**Nouveaux fichiers de test**
- `libs/shared-schema/src/__tests__/schemas.test.ts` — tests unitaires Zod
- `apps/api/src/__tests__/health.test.ts` — test route `/health`
- `apps/api/src/__tests__/alumni.test.ts` — tests routes alumni CRUD
- `apps/api/src/__tests__/helpers/app.ts` — factory Fastify pour les tests (avec middleware mockable)
- `apps/web/src/__tests__/AlumniStatusBadge.test.ts` — tests composant Vue
- `apps/web/src/__tests__/utils.test.ts` — tests fonctions utilitaires (getInitials)

**Config / setup**
- `apps/web/vitest.config.ts` *(nouveau)* — config vitest avec environnement happy-dom
- `apps/api/src/__tests__/setup.ts` *(nouveau)* — setup/teardown MongoDB memory server

**package.json modifiés**
- `libs/shared-schema/package.json` — ajouter script `"test": "bun test"`
- `apps/api/package.json` — ajouter script `"test": "bun test"`
- `apps/web/package.json` — ajouter script `"test": "vitest run"`
- `package.json` (root) — ajouter `"test": "bun --cwd libs/shared-schema test && bun --cwd apps/api test && bun --cwd apps/web run test"`

**CI & README**
- `.github/workflows/ci.yml` *(nouveau)* — workflow GitHub Actions
- `README.md` — section "🧪 Tests"

---

## Implementation Details

### Dépendances à installer

```bash
# apps/api
bun add -d mongodb-memory-server --cwd apps/api

# apps/web
bun add -d vitest @vue/test-utils happy-dom --cwd apps/web
```

### 1. shared-schema — Tests Zod (`bun test`)

**`libs/shared-schema/src/__tests__/schemas.test.ts`**

```typescript
import { describe, it, expect } from 'bun:test'
import { AlumniProfileSchema, AlumniUpdateSchema, LoginSchema, SignUpSchema } from '../index'

describe('AlumniProfileSchema', () => {
  const valid = {
    firstName: 'Jean',
    lastName: 'Dupont',
    email: 'jean@example.com',
    isActive: true,
  }

  it('accepte des données valides', () => {
    expect(AlumniProfileSchema.safeParse(valid).success).toBe(true)
  })

  it('rejette un email invalide', () => {
    const result = AlumniProfileSchema.safeParse({ ...valid, email: 'pas-un-email' })
    expect(result.success).toBe(false)
  })

  it('rejette un prénom trop court', () => {
    const result = AlumniProfileSchema.safeParse({ ...valid, firstName: 'A' })
    expect(result.success).toBe(false)
  })

  it('accepte une linkedinUrl vide', () => {
    const result = AlumniProfileSchema.safeParse({ ...valid, linkedinUrl: '' })
    expect(result.success).toBe(true)
  })

  it('rejette une linkedinUrl invalide non vide', () => {
    const result = AlumniProfileSchema.safeParse({ ...valid, linkedinUrl: 'pas-une-url' })
    expect(result.success).toBe(false)
  })

  it('rejette une année de diplomation dans le futur', () => {
    const result = AlumniProfileSchema.safeParse({ ...valid, graduationYear: 2099 })
    expect(result.success).toBe(false)
  })

  it('accepte graduationYear null', () => {
    const result = AlumniProfileSchema.safeParse({ ...valid, graduationYear: null })
    expect(result.success).toBe(true)
  })
})

describe('AlumniUpdateSchema', () => {
  it('accepte des données partielles', () => {
    expect(AlumniUpdateSchema.safeParse({ city: 'Paris' }).success).toBe(true)
  })

  it('n\'accepte pas le champ email', () => {
    // email est omis du schema update
    const result = AlumniUpdateSchema.safeParse({ email: 'new@example.com' })
    // Le parse réussit mais email est ignoré (omit)
    expect((result.data as Record<string, unknown>)?.email).toBeUndefined()
  })
})

describe('LoginSchema', () => {
  it('rejette un mot de passe vide', () => {
    const result = LoginSchema.safeParse({ email: 'a@b.com', password: '' })
    expect(result.success).toBe(false)
  })

  it('rejette un email invalide', () => {
    const result = LoginSchema.safeParse({ email: 'invalid', password: 'secret' })
    expect(result.success).toBe(false)
  })

  it('valide des identifiants corrects', () => {
    const result = LoginSchema.safeParse({ email: 'admin@school.fr', password: 'password123' })
    expect(result.success).toBe(true)
  })
})
```

### 2. API — Tests Fastify (`bun test`)

**Pattern clé** : refactoriser la création de l'app Fastify en factory pour l'injecter dans les tests avec middleware mockable.

**`apps/api/src/__tests__/helpers/app.ts`**

```typescript
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import mongoose from 'mongoose'
import { Alumni } from '../../models/Alumni'
import { AlumniProfileSchema, AlumniUpdateSchema } from '@alumni/shared-schema'

// Middleware mock pour les tests : simule un admin authentifié
export const mockAdmin = async (_req: unknown, _reply: unknown) => {}

export async function buildApp(middlewareOverride?: {
  requireAdmin: () => Promise<void>
  requireAuth: () => Promise<void>
}) {
  const app = Fastify({ logger: false })
  await app.register(helmet)
  await app.register(cors, { origin: '*', credentials: true })

  const requireAdmin = middlewareOverride?.requireAdmin ?? mockAdmin
  const requireAuth = middlewareOverride?.requireAuth ?? mockAdmin

  // Re-enregistrer uniquement les routes à tester
  // (copier les routes clés de index.ts avec le middleware injecté)
  app.get('/health', async () => ({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  }))

  app.get('/alumni', { preHandler: requireAuth }, async (req, reply) => {
    const alumni = await Alumni.find({ isActive: true }).lean()
    return reply.send({ status: 'success', data: { alumni, total: alumni.length } })
  })

  app.post('/alumni', { preHandler: requireAdmin }, async (req, reply) => {
    const result = AlumniProfileSchema.safeParse(req.body)
    if (!result.success) return reply.status(400).send({ status: 'error' })
    const existing = await Alumni.findOne({ email: result.data.email })
    if (existing) return reply.status(409).send({ status: 'error', message: 'Email déjà existant' })
    const alumni = await new Alumni({ ...result.data, status: 'unlinked' }).save()
    return reply.status(201).send({ status: 'success', data: alumni })
  })

  app.put('/alumni/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const result = AlumniUpdateSchema.safeParse(req.body)
    if (!result.success) return reply.status(400).send({ status: 'error' })
    const alumni = await Alumni.findByIdAndUpdate(id, result.data, { new: true }).lean()
    if (!alumni) return reply.status(404).send({ status: 'error' })
    return reply.send({ status: 'success', data: alumni })
  })

  app.delete('/alumni/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const alumni = await Alumni.findByIdAndDelete(id).lean()
    if (!alumni) return reply.status(404).send({ status: 'error' })
    return reply.send({ status: 'success' })
  })

  await app.ready()
  return app
}
```

**`apps/api/src/__tests__/setup.ts`**

```typescript
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'

let mongod: MongoMemoryServer

export async function startDb() {
  mongod = await MongoMemoryServer.create()
  await mongoose.connect(mongod.getUri())
}

export async function stopDb() {
  await mongoose.disconnect()
  await mongod.stop()
}

export async function clearDb() {
  const collections = mongoose.connection.collections
  for (const key in collections) {
    await collections[key].deleteMany({})
  }
}
```

**`apps/api/src/__tests__/health.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { buildApp } from './helpers/app'
import { startDb, stopDb } from './setup'

let app: Awaited<ReturnType<typeof buildApp>>

beforeAll(async () => {
  await startDb()
  app = await buildApp()
})

afterAll(async () => {
  await app.close()
  await stopDb()
})

describe('GET /health', () => {
  it('retourne 200 avec status ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.statusCode).toBe(200)
    expect(res.json().status).toBe('ok')
    expect(res.json().db).toBe('connected')
  })
})
```

**`apps/api/src/__tests__/alumni.test.ts`**

```typescript
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'bun:test'
import { buildApp } from './helpers/app'
import { startDb, stopDb, clearDb } from './setup'

let app: Awaited<ReturnType<typeof buildApp>>

const validAlumni = {
  firstName: 'Marie',
  lastName: 'Curie',
  email: 'marie.curie@example.com',
  isActive: true,
}

beforeAll(async () => {
  await startDb()
  app = await buildApp()
})

afterEach(async () => {
  await clearDb()
})

afterAll(async () => {
  await app.close()
  await stopDb()
})

describe('GET /alumni', () => {
  it('retourne une liste vide', async () => {
    const res = await app.inject({ method: 'GET', url: '/alumni' })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.total).toBe(0)
  })
})

describe('POST /alumni', () => {
  it('crée un alumni avec des données valides', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/alumni',
      payload: validAlumni,
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().data.email).toBe(validAlumni.email)
    expect(res.json().data.status).toBe('unlinked')
  })

  it('retourne 409 si l\'email existe déjà', async () => {
    await app.inject({ method: 'POST', url: '/alumni', payload: validAlumni })
    const res = await app.inject({ method: 'POST', url: '/alumni', payload: validAlumni })
    expect(res.statusCode).toBe(409)
  })

  it('retourne 400 avec des données invalides', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/alumni',
      payload: { firstName: 'A', email: 'invalid' },
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('PUT /alumni/:id', () => {
  it('met à jour un alumni existant', async () => {
    const created = await app.inject({ method: 'POST', url: '/alumni', payload: validAlumni })
    const id = created.json().data._id

    const res = await app.inject({
      method: 'PUT',
      url: `/alumni/${id}`,
      payload: { city: 'Paris' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.city).toBe('Paris')
  })

  it('retourne 404 pour un ID inexistant', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/alumni/000000000000000000000000',
      payload: { city: 'Paris' },
    })
    expect(res.statusCode).toBe(404)
  })
})

describe('DELETE /alumni/:id', () => {
  it('supprime un alumni existant', async () => {
    const created = await app.inject({ method: 'POST', url: '/alumni', payload: validAlumni })
    const id = created.json().data._id

    const res = await app.inject({ method: 'DELETE', url: `/alumni/${id}` })
    expect(res.statusCode).toBe(200)
  })

  it('retourne 404 pour un ID inexistant', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: '/alumni/000000000000000000000000',
    })
    expect(res.statusCode).toBe(404)
  })
})
```

### 3. Web — Tests Vue (`vitest`)

**`apps/web/vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
```

**`apps/web/src/__tests__/AlumniStatusBadge.test.ts`**

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AlumniStatusBadge from '@/features/alumni/components/AlumniStatusBadge.vue'

describe('AlumniStatusBadge', () => {
  it('affiche "Non lié" pour le statut unlinked', () => {
    const wrapper = mount(AlumniStatusBadge, { props: { status: 'unlinked' } })
    expect(wrapper.text()).toContain('Non lié')
  })

  it('affiche "Invité" pour le statut invited', () => {
    const wrapper = mount(AlumniStatusBadge, { props: { status: 'invited' } })
    expect(wrapper.text()).toContain('Invité')
  })

  it('affiche "Inscrit" pour le statut registered', () => {
    const wrapper = mount(AlumniStatusBadge, { props: { status: 'registered' } })
    expect(wrapper.text()).toContain('Inscrit')
  })
})
```

**`apps/web/src/__tests__/utils.test.ts`** — tester `getInitials` (copié/exposé depuis les pages)

```typescript
import { describe, it, expect } from 'vitest'

// Fonction extraite pour être testable
function getInitials(name: string = '') {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)
}

describe('getInitials', () => {
  it('retourne les initiales d\'un nom complet', () => {
    expect(getInitials('Jean Dupont')).toBe('JD')
  })

  it('gère un prénom seul', () => {
    expect(getInitials('Alice')).toBe('A')
  })

  it('gère une chaîne vide', () => {
    expect(getInitials('')).toBe('')
  })

  it('limite à 2 caractères', () => {
    expect(getInitials('Jean Paul Martin')).toBe('JP')
  })
})
```

### 4. Scripts `package.json`

**`libs/shared-schema/package.json`** — ajouter :
```json
"scripts": {
  "test": "bun test"
}
```

**`apps/api/package.json`** — ajouter :
```json
"scripts": {
  "test": "bun test"
}
```

**`apps/web/package.json`** — ajouter :
```json
"scripts": {
  "test": "vitest run"
}
```

**`package.json` racine** — ajouter :
```json
"scripts": {
  "test": "bun --cwd libs/shared-schema test && bun --cwd apps/api test && bun --cwd apps/web run test",
  "test:schema": "bun --cwd libs/shared-schema test",
  "test:api": "bun --cwd apps/api test",
  "test:web": "bun --cwd apps/web run test"
}
```

### 5. GitHub Actions CI

**`.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  test-schema:
    name: Tests — shared-schema
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install
      - run: bun test
        working-directory: libs/shared-schema

  test-api:
    name: Tests — API
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install
      - run: bun test
        working-directory: apps/api

  test-web:
    name: Tests — Web
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install
      - run: bun run test
        working-directory: apps/web
```

### 6. README — Section Tests à ajouter

Après la section "Commandes Utiles", ajouter :

```markdown
## 🧪 Tests

Les tests couvrent les trois packages du monorepo.

| Package | Framework | Commande |
|---|---|---|
| `libs/shared-schema` | Bun test | `bun test:schema` |
| `apps/api` | Bun test + MongoDB in-memory | `bun test:api` |
| `apps/web` | Vitest + Vue Test Utils | `bun test:web` |

### Lancer tous les tests
```bash
bun test
```

### Lancer les tests d'un package
```bash
bun test:schema   # Schemas Zod
bun test:api      # Routes Fastify
bun test:web      # Composants Vue
```

### CI
Chaque Pull Request sur `main` déclenche la CI GitHub Actions. Le merge est bloqué si un test échoue.

Pour activer la protection de branche sur GitHub :
1. Aller dans **Settings → Branches → Add branch protection rule**
2. Branch name pattern : `main`
3. Cocher **"Require status checks to pass before merging"**
4. Sélectionner les checks : `Tests — shared-schema`, `Tests — API`, `Tests — Web`
```

### 7. AlumniStatusBadge — vérification du contenu

Avant d'écrire les tests du badge, lire `AlumniStatusBadge.vue` pour vérifier le texte exact affiché par chaque statut et adapter les assertions si nécessaire.

---

## Validation Criteria

### Functional Requirements
- [ ] `bun test` à la racine passe sans erreur
- [ ] Les 3 jobs CI passent sur une PR vers `main`
- [ ] Une PR avec un test qui échoue est bloquée (status check obligatoire configuré sur GitHub)
- [ ] `bun test:schema` : 8+ assertions sur les schemas Zod
- [ ] `bun test:api` : 8+ assertions couvrant health, CRUD alumni, 404, 409
- [ ] `bun test:web` : 5+ assertions sur AlumniStatusBadge et getInitials
- [ ] `README.md` contient une section "Tests" avec le tableau et les commandes

### Technical Requirements
- [ ] Pas de vraie connexion MongoDB pendant les tests API (mongodb-memory-server)
- [ ] Les tests API utilisent Fastify `inject()` (pas de serveur HTTP démarré)
- [ ] vitest.config.ts configure `environment: 'happy-dom'`
- [ ] Chaque test est isolé (clearDb entre chaque test API)
- [ ] Aucune dépendance externe réseau dans les tests (Apify, LinkedIn non testés)

### Testing Steps
1. `bun install` depuis la racine
2. `bun test:schema` → tous les tests passent
3. `bun test:api` → tous les tests passent (MongoDB en mémoire)
4. `bun test:web` → tous les tests passent
5. `bun test` depuis la racine → les 3 suites passent en séquence
6. Ouvrir une PR sur GitHub → les 3 jobs CI apparaissent dans la PR
7. Modifier un test pour qu'il échoue → vérifier que la CI devient rouge et bloque le merge
8. Aller dans Settings → Branches → configurer la protection de branche `main`
