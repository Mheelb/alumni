# Homepage Redesign PRP

## Goal

Remplacer la page d'accueil actuelle (hero générique + AlumniForm) par une page intelligente qui s'adapte au rôle de l'utilisateur : tableau de bord pour les admins, page d'accueil personnalisée pour les alumni connectés, et landing page pour les visiteurs non connectés.

## Why

La home actuelle est une coquille vide (hero copié-collé d'un template + formulaire d'inscription alumnus en plein milieu). Elle ne sert ni les admins (qui ont besoin de chiffres clés) ni les alumni connectés (qui veulent un accès rapide aux fonctionnalités). Elle doit devenir le vrai point d'entrée de l'application, cohérent avec les fonctionnalités actuelles et extensible pour les futures (événements, annonces emploi, messagerie).

## What

### Trois vues distinctes selon l'état de session

**1. Non connecté → Landing page**
- Message de présentation de la plateforme (en français, sans jargon marketing)
- Un seul CTA : "Se connecter"
- Pas de formulaire alumni sur cette page (ça n'a pas de sens ici)

**2. Admin connecté → Tableau de bord**
- Statistiques clés : total alumni, taux d'activation (inscrits/invités), profils complétés
- Derniers alumni créés (5 derniers, avec lien vers leur profil)
- Widgets "coming soon" pour : Prochains événements, Annonces actives
- Accès rapide : Annuaire, Créer un profil, Exporter CSV

**3. Alumni connecté → Page d'accueil personnalisée**
- Message de bienvenue avec le prénom
- Accès rapide : Annuaire, Mon profil
- Widget "coming soon" pour : Événements à venir, Annonces emploi
- Pas de stats ni d'actions admin

### Périmètre

Inclus :
- Refonte complète de `apps/web/src/pages/HomePage.vue`
- Nouvel endpoint API `GET /stats` (admin uniquement) pour les métriques
- Nouveau composable `useStats()` dans `useAlumni.ts`

Exclus :
- Aucune modification du routeur ou de `App.vue`
- Pas de création de nouvelles entités Mongoose (events, jobs)
- Pas de messagerie interne (future feature)

## Technical Context

### Files to Reference (read-only)

- `apps/web/src/pages/AnnuairePage.vue` — Pattern complet : TanStack Query + shadcn-vue + authClient.useSession() + lucide icons
- `apps/web/src/pages/ProfilDetailPage.vue` — Pattern useAlumniDetail + Card layout
- `apps/web/src/App.vue` — Pattern `authClient.useSession()` pour détecter l'état connecté et le rôle
- `apps/web/src/features/alumni/composables/useAlumni.ts` — Pattern useQuery (à étendre avec useStats)
- `apps/web/src/components/ui/index.ts` — Composants disponibles : Card, Button, Badge, Avatar, Separator
- `apps/api/src/index.ts` — Convention routes Fastify + requireAdmin middleware
- `apps/api/src/lib/middleware.ts` — requireAdmin, requireAuth helpers
- `apps/api/src/models/Alumni.ts` — Modèle Mongoose avec champs status, isActive, createdAt

### Files to Implement/Modify

- `apps/web/src/pages/HomePage.vue` — Refonte complète (3 vues conditionnelles)
- `apps/web/src/features/alumni/composables/useAlumni.ts` — Ajouter `useStats()`
- `apps/api/src/index.ts` — Ajouter `GET /stats` endpoint

### Existing Patterns to Follow

**Détection du rôle (depuis App.vue) :**
```typescript
const session = authClient.useSession()
// session.data?.user         → utilisateur connecté ou null
// session.data?.user?.role   → 'admin' | 'user' (pas de @ts-ignore nécessaire si typé)
```

**TanStack Query (depuis AnnuairePage.vue / useAlumni.ts) :**
```typescript
// Composable
export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const { data } = await axios.get<{ status: string; data: StatsData }>('/stats', {
        baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
        withCredentials: true,
      })
      return data.data
    },
  })
}
```

**Convention réponse API (depuis index.ts) :**
```typescript
return reply.send({ status: 'success', data: { ... } })
```

**shadcn-vue Card (pattern depuis ProfilDetailPage.vue) :**
```vue
<Card>
  <CardHeader>
    <CardTitle>Titre</CardTitle>
  </CardHeader>
  <CardContent>
    contenu
  </CardContent>
</Card>
```

## Implementation Details

### API Endpoint

**`GET /stats`** — Protégé par `requireAdmin`

Réponse :
```json
{
  "status": "success",
  "data": {
    "total": 142,
    "byStatus": {
      "invited": 80,
      "registered": 40,
      "completed": 22
    },
    "activationRate": 43,
    "recentAlumni": [
      {
        "_id": "...",
        "firstName": "Alice",
        "lastName": "Dupont",
        "email": "alice@example.com",
        "status": "invited",
        "createdAt": "2025-01-15T10:00:00Z"
      }
    ]
  }
}
```

Logique Mongoose :
```typescript
const [total, byStatus, recentAlumni] = await Promise.all([
  Alumni.countDocuments({ isActive: true }),
  Alumni.aggregate([
    { $match: { isActive: true } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]),
  Alumni.find({ isActive: true })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('firstName lastName email status createdAt')
    .lean(),
])
```

### TypeScript Interfaces

À ajouter dans `useAlumni.ts` :
```typescript
export interface StatsData {
  total: number
  byStatus: { invited: number; registered: number; completed: number }
  activationRate: number
  recentAlumni: Array<{
    _id: string
    firstName: string
    lastName: string
    email: string
    status: string
    createdAt: string
  }>
}
```

### Structure de HomePage.vue

```vue
<script setup lang="ts">
import { computed } from 'vue'
import { authClient } from '@/lib/auth-client'
import { useStats } from '@/features/alumni/composables/useAlumni'
// imports shadcn-vue + lucide

const session = authClient.useSession()
const isLoggedIn = computed(() => !!session.data?.user)
const isAdmin = computed(() => session.data?.user?.role === 'admin')
const userName = computed(() => session.data?.user?.name?.split(' ')[0] ?? '')

// useStats() uniquement si admin
const { data: stats, isLoading: statsLoading } = useStats()
// Note : useStats doit être conditionnel ou toujours appelé mais désactivé si non admin
// → utiliser `enabled: isAdmin.value` dans useQuery options
</script>

<template>
  <!-- VUE 1 : Non connecté -->
  <div v-if="!isLoggedIn"> ... landing page ... </div>

  <!-- VUE 2 : Admin -->
  <div v-else-if="isAdmin"> ... dashboard avec stats ... </div>

  <!-- VUE 3 : Alumni -->
  <div v-else> ... accueil personnalisé ... </div>
</template>
```

### Maquettes des vues

**Vue Admin — Tableau de bord :**
```
┌─────────────────────────────────────────────────────────┐
│  Bonjour, [Prénom] 👋                                    │
│  Tableau de bord — My Digital School Alumnis            │
├──────────────┬──────────────┬──────────────────────────-┤
│ 142          │ 43%          │ 22                        │
│ Alumni actifs│ Taux activat.│ Profils complétés         │
├──────────────┴──────────────┴──────────────────────────-┤
│ Répartition par statut                                  │
│ [Invités 80] [Inscrits 40] [Complétés 22]               │
├─────────────────────────────┬───────────────────────────┤
│ Derniers alumni créés       │ Accès rapides             │
│ • Alice Dupont — invité     │ [→ Annuaire]              │
│ • Bob Martin — inscrit      │ [+ Nouveau profil]        │
│ • ...                       │ [↓ Exporter CSV]          │
├─────────────────────────────┼───────────────────────────┤
│ Prochains événements        │ Annonces actives          │
│ [Bientôt disponible]        │ [Bientôt disponible]      │
└─────────────────────────────┴───────────────────────────┘
```

**Vue Alumni — Accueil :**
```
┌─────────────────────────────────────────────────────────┐
│  Bonjour, Alice 👋                                       │
│  Bienvenue sur la plateforme alumni                     │
├──────────────────────┬──────────────────────────────────┤
│ Annuaire             │ Mon profil                       │
│ Retrouvez d'anciens  │ Complétez vos informations       │
│ camarades            │                                  │
│ [Consulter →]        │ [Voir mon profil →]              │
├──────────────────────┼──────────────────────────────────┤
│ Événements           │ Annonces emploi                  │
│ [Bientôt disponible] │ [Bientôt disponible]             │
└──────────────────────┴──────────────────────────────────┘
```

**Vue Landing (non connecté) :**
```
┌─────────────────────────────────────────────────────────┐
│          My Digital School Alumnis                      │
│  La plateforme de gestion de votre réseau diplômés      │
│                                                         │
│  • Annuaire des diplômés                                │
│  • Événements & annonces emploi                         │
│  • Gestion centralisée pour les administrateurs         │
│                                                         │
│              [Se connecter →]                           │
└─────────────────────────────────────────────────────────┘
```

## Validation Criteria

### Functional Requirements

- [ ] Non connecté : la page affiche la landing sans contenu d'app, avec CTA "Se connecter"
- [ ] Admin connecté : la page affiche les 4 stats cards (total, taux, complétés, répartition)
- [ ] Admin connecté : la section "Derniers alumni" liste les 5 derniers avec leur statut
- [ ] Admin connecté : les widgets événements/annonces affichent "Bientôt disponible"
- [ ] Admin connecté : les boutons d'accès rapide fonctionnent (Annuaire, Nouveau profil, Export)
- [ ] Alumni connecté : le message de bienvenue affiche le prénom de l'utilisateur
- [ ] Alumni connecté : les 2 cartes d'accès rapide (Annuaire, Mon profil) ont un lien fonctionnel
- [ ] Alumni connecté : les cartes événements/annonces affichent "Bientôt disponible"
- [ ] `GET /stats` retourne 401 si non connecté, 403 si non admin
- [ ] `GET /stats` retourne les bonnes données agrégées

### Technical Requirements

- [ ] TypeScript compile sans erreur (`bun run build` dans `apps/web`)
- [ ] Pas de `any` : `StatsData` interface définie, session typée
- [ ] `useStats()` utilise l'option `enabled` de TanStack Query pour ne pas appeler l'API si non admin
- [ ] Aucun `console.log` de debug oublié
- [ ] Responsive : les grilles passent en colonne sur mobile (< sm)

### Testing Steps

1. Ouvrir l'app en navigation privée → doit afficher la landing page avec CTA connexion
2. Se connecter en tant qu'admin → la home doit afficher le tableau de bord avec des chiffres réels
3. Vérifier que les 4 cards stats sont cohérentes avec les données de l'annuaire
4. Cliquer "Annuaire" → navigation vers `/annuaire`
5. Cliquer "Nouveau profil" → ouverture du sheet de création (ou navigation si préféré)
6. Cliquer "Exporter CSV" → téléchargement du fichier
7. Se déconnecter, se reconnecter en tant qu'alumni → doit afficher la vue alumni (pas les stats)
8. Vérifier que le prénom s'affiche correctement dans le message de bienvenue
9. Cliquer "Consulter l'annuaire" → navigation vers `/annuaire`
