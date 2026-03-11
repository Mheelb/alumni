# Dashboard Analytics PRP

## Goal

Créer une page `/dashboard` dédiée et riche pour les admins, avec de vrais graphiques interactifs et des statistiques pertinentes calculées à partir des données alumni existantes.

## Why

La page d'accueil actuelle (`HomePage.vue`) présente des stats très basiques (4 chiffres, 5 alumni récents). L'école a besoin d'une vision analytique réelle pour piloter sa stratégie d'accompagnement des alumni : taux d'insertion, évolution des promotions, répartition géographique, types de carrières, etc.

## What

### Inclus
- Nouvelle page `/dashboard` (admin only) remplaçant le lien "Dashboard" du header
- Nouveau endpoint backend `/dashboard/stats` retournant les données agrégées
- Graphiques interactifs via **vue-chartjs** + **Chart.js**
- KPIs clés en cards en haut de page
- 6 graphiques couvrant les stats prioritaires
- Tableau des alumni récents (conservé depuis `HomePage`)

### Exclu
- Modification de `HomePage.vue` (la page reste telle quelle, le lien header pointe vers `/dashboard`)
- Filtres temporels avancés (v2)
- Export PDF du dashboard (v2)

### Stats à afficher

#### KPI Cards (haut de page)
| KPI | Calcul |
|-----|--------|
| Total alumni actifs | `Alumni.countDocuments({ isActive: true })` |
| Taux d'activation | `(registered / total) * 100` |
| Taux d'emploi | `% alumni avec company ET jobTitle non vides` |
| Taux de freelance | `% alumni dont company/jobTitle contient "freelance", "self-employed", "indépendant", "auto-entrepreneur", "autoentrepreneur", "consultant"` |

#### Graphiques
1. **Bar chart — Diplômés par année de promotion** : `groupBy graduationYear`, trié ASC
2. **Donut chart — Statut des comptes** : unlinked / invited / registered
3. **Bar chart horizontal — Top 10 villes** : `groupBy city`, top 10 par count
4. **Bar chart horizontal — Top 10 entreprises employeurs** : `groupBy company`, top 10
5. **Pie chart — Distribution par diplôme** : `groupBy diploma`
6. **Line chart — Évolution des inscriptions** : alumni ajoutés par année (`groupBy year(createdAt)`)

---

## Technical Context

### Files to Reference (read-only)
- `apps/api/src/index.ts` — pattern des routes existantes (GET /stats ligne 305–333), structure des réponses
- `apps/api/src/models/Alumni.ts` — champs disponibles pour les agrégations MongoDB
- `apps/web/src/pages/HomePage.vue` — UI à reprendre pour les KPI cards et le tableau récent
- `apps/web/src/features/alumni/composables/useAlumni.ts` — pattern TanStack Query à dupliquer (voir `useStats`)
- `apps/web/src/components/ui/index.ts` — composants shadcn-vue disponibles
- `apps/web/src/router.ts` — ajout de la route `/dashboard`
- `apps/web/src/App.vue` — changer le lien "Dashboard" du header vers `/dashboard`
- `libs/shared-schema/src/index.ts` — pattern des schemas Zod

### Files to Implement/Modify

**Backend**
- `apps/api/src/routes/dashboard.ts` *(nouveau)* — endpoint `GET /dashboard/stats` avec toutes les agrégations MongoDB
- `apps/api/src/index.ts` — enregistrer la route `dashboardRoutes`

**Frontend**
- `apps/web/src/pages/DashboardPage.vue` *(nouveau)* — page complète du dashboard
- `apps/web/src/router.ts` — ajouter route `/dashboard` (requiresAdmin)
- `apps/web/src/App.vue` — changer `RouterLink to="/"` (Dashboard) → `to="/dashboard"`

### Existing Patterns to Follow

**Pattern route Fastify (apps/api/src/routes/scraper.ts) :**
```typescript
import { FastifyInstance } from 'fastify';
import { Alumni } from '../models/Alumni';
import { requireAdmin } from '../lib/middleware';

export async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.get('/dashboard/stats', { preHandler: requireAdmin }, async (request, reply) => {
    // aggregations
    return reply.send({ status: 'success', data: { ... } });
  });
}
```

**Enregistrement dans index.ts :**
```typescript
import { dashboardRoutes } from './routes/dashboard';
// ...
await fastify.register(dashboardRoutes);
```

**Pattern TanStack Query (useAlumni.ts) :**
```typescript
export function useDashboardStats(enabled: Ref<boolean>) {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const res = await axios.get(`${API_URL}/dashboard/stats`, { withCredentials: true });
      return res.data.data;
    },
    enabled,
  });
}
```

---

## Implementation Details

### API Endpoint

**`GET /dashboard/stats`** — Admin only

Agrégations MongoDB à effectuer en parallèle (`Promise.all`) :

```typescript
const [
  total,
  byStatus,           // { unlinked, invited, registered }
  byGraduationYear,   // [{ year: 2020, count: 12 }, ...]
  byCity,             // [{ city: 'Paris', count: 45 }, ...] top 10
  byCompany,          // [{ company: 'Google', count: 8 }, ...] top 10
  byDiploma,          // [{ diploma: 'MBA', count: 30 }, ...]
  byCreatedYear,      // [{ year: 2023, count: 20 }, ...] évolution inscriptions
  employedCount,      // alumni avec company ET jobTitle non vides
  freelanceCount,     // alumni dont company/jobTitle match keywords freelance
] = await Promise.all([...])
```

**Réponse complète :**
```typescript
{
  status: 'success',
  data: {
    total: number,
    byStatus: { unlinked: number, invited: number, registered: number },
    activationRate: number,
    employmentRate: number,      // (employedCount / total) * 100
    freelanceRate: number,       // (freelanceCount / total) * 100
    byGraduationYear: Array<{ year: number, count: number }>,
    byCity: Array<{ city: string, count: number }>,          // top 10
    byCompany: Array<{ company: string, count: number }>,    // top 10
    byDiploma: Array<{ diploma: string, count: number }>,
    byCreatedYear: Array<{ year: number, count: number }>,
    recentAlumni: Array<{ _id, firstName, lastName, email, status, createdAt }>
  }
}
```

**Agrégation MongoDB — exemple diplômés par année :**
```typescript
Alumni.aggregate([
  { $match: { isActive: true, graduationYear: { $exists: true, $ne: null } } },
  { $group: { _id: '$graduationYear', count: { $sum: 1 } } },
  { $sort: { _id: 1 } },
  { $project: { year: '$_id', count: 1, _id: 0 } }
])
```

**Agrégation top villes :**
```typescript
Alumni.aggregate([
  { $match: { isActive: true, city: { $exists: true, $ne: null, $ne: '' } } },
  { $group: { _id: '$city', count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 10 },
  { $project: { city: '$_id', count: 1, _id: 0 } }
])
```

**Taux de freelance — regex MongoDB :**
```typescript
Alumni.countDocuments({
  isActive: true,
  $or: [
    { company: { $regex: /freelance|self.?employed|indépendant|auto.?entrepreneur|consultant/i } },
    { jobTitle: { $regex: /freelance|self.?employed|indépendant|auto.?entrepreneur|consultant/i } }
  ]
})
```

### Librairie graphiques

Utiliser **vue-chartjs** + **chart.js** :
```bash
bun add chart.js vue-chartjs --cwd apps/web
```

Types de charts à utiliser :
- `<Bar>` — Diplômés par an, Top villes, Top entreprises
- `<Doughnut>` — Statut des comptes
- `<Pie>` — Distribution diplômes
- `<Line>` — Évolution inscriptions

**Pattern d'un graphique dans le template :**
```vue
<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const chartData = computed(() => ({
  labels: stats.value.byGraduationYear.map(d => d.year.toString()),
  datasets: [{
    label: 'Diplômés',
    data: stats.value.byGraduationYear.map(d => d.count),
    backgroundColor: 'hsl(221.2 83.2% 53.3%)', // --primary Tailwind
  }]
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } }
}
</script>

<template>
  <div class="h-64">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>
```

### Structure de la page DashboardPage.vue

```
DashboardPage.vue
├── Header (titre + date de mise à jour)
├── Section KPIs (grid 2×2 ou 4 colonnes)
│   ├── Card: Total alumni
│   ├── Card: Taux d'activation
│   ├── Card: Taux d'emploi
│   └── Card: Taux de freelance
├── Section Graphiques ligne 1 (grid 2 colonnes)
│   ├── Card: Diplômés par année de promotion (Bar)
│   └── Card: Statut des comptes (Donut)
├── Section Graphiques ligne 2 (grid 2 colonnes)
│   ├── Card: Top 10 villes (Bar horizontal)
│   └── Card: Distribution par diplôme (Pie)
├── Section Graphiques ligne 3 (grid 2 colonnes)
│   ├── Card: Top 10 entreprises (Bar horizontal)
│   └── Card: Évolution des inscriptions (Line)
└── Section Tableau Alumni récents
```

### Route et navigation

**`apps/web/src/router.ts`** — ajouter :
```typescript
{
  path: '/dashboard',
  component: () => import('./pages/DashboardPage.vue'),
  meta: { requiresAuth: true, requiresAdmin: true }
}
```

**`apps/web/src/App.vue`** — modifier :
```html
<!-- Avant -->
<RouterLink to="/">
<!-- Après -->
<RouterLink to="/dashboard">
```

### Composable useDashboardStats

Créer dans `apps/web/src/features/alumni/composables/useAlumni.ts` ou un nouveau fichier `useDashboard.ts` dans le même dossier :

```typescript
export interface DashboardStats {
  total: number
  byStatus: { unlinked: number; invited: number; registered: number }
  activationRate: number
  employmentRate: number
  freelanceRate: number
  byGraduationYear: Array<{ year: number; count: number }>
  byCity: Array<{ city: string; count: number }>
  byCompany: Array<{ company: string; count: number }>
  byDiploma: Array<{ diploma: string; count: number }>
  byCreatedYear: Array<{ year: number; count: number }>
  recentAlumni: Array<{ _id: string; firstName: string; lastName: string; email: string; status: string; createdAt: string }>
}

export function useDashboardStats(enabled: Ref<boolean>) {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const res = await axios.get(`${API_URL}/dashboard/stats`, { withCredentials: true })
      return res.data.data
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 min cache
  })
}
```

---

## Validation Criteria

### Functional Requirements
- [ ] La page `/dashboard` est accessible uniquement aux admins (redirect vers `/login` sinon)
- [ ] Le lien "Dashboard" dans le header pointe vers `/dashboard` au lieu de `/`
- [ ] Les 4 KPI cards affichent des valeurs cohérentes avec la base de données
- [ ] Le taux d'emploi est calculé (alumni avec `company` ET `jobTitle` non vides)
- [ ] Le taux de freelance est calculé via regex sur `company` et `jobTitle`
- [ ] Le graphique "Diplômés par an" affiche un bar par `graduationYear` présent en base
- [ ] Le graphique "Statut des comptes" est un donut avec 3 segments (unlinked/invited/registered)
- [ ] Le graphique "Top villes" affiche au plus 10 villes triées par count DESC
- [ ] Le graphique "Top entreprises" affiche au plus 10 entreprises triées par count DESC
- [ ] Le graphique "Diplômes" affiche la répartition par `diploma`
- [ ] Le graphique "Évolution" affiche le nombre d'alumni créés par année
- [ ] Le tableau des alumni récents affiche les 5 derniers avec statut
- [ ] État de chargement (spinner) affiché pendant le fetch
- [ ] État d'erreur géré si l'API échoue

### Technical Requirements
- [ ] TypeScript compile sans erreurs (`bun run build` dans apps/web)
- [ ] Pas de `any` dans le nouveau code
- [ ] `vue-chartjs` et `chart.js` installés dans `apps/web`
- [ ] Le composable utilise TanStack Query avec `staleTime: 5 * 60 * 1000`
- [ ] Tous les Chart.js modules nécessaires sont enregistrés via `ChartJS.register()`
- [ ] Responsive : la grille passe en 1 colonne sur mobile

### Testing Steps
1. Lancer `bun dev:api` et `bun dev:web`
2. Se connecter avec un compte admin → vérifier que le header "Dashboard" redirige vers `/dashboard`
3. Vérifier que `/dashboard` est inaccessible en tant qu'alumni (redirect)
4. Vérifier que les 4 KPIs s'affichent avec des valeurs numériques
5. Vérifier que les 6 graphiques s'affichent sans erreur console
6. Comparer le `total` du dashboard avec le count réel en base MongoDB
7. Vérifier que les alumni sans `graduationYear` n'apparaissent pas dans le bar chart
8. Vérifier que les alumni sans `city` n'apparaissent pas dans le top villes
