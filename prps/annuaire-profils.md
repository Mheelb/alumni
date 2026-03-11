# Annuaire & Profils

## Goal
Implémenter un annuaire complet des diplômés permettant à l'admin de consulter, créer, modifier, filtrer, exporter et gérer le statut de chaque profil alumni.

## Why
L'admin a besoin d'une interface centralisée pour piloter la base des diplômés : voir qui est invité, qui s'est inscrit, qui a complété son profil, et agir dessus sans passer par la base de données.

## What

### Fonctionnalités
- Voir tous les profils dans un tableau paginé avec données complètes
- Voir le détail d'un profil sur une page dédiée
- Créer un profil manuellement (via Sheet latérale)
- Modifier n'importe quel profil (via Sheet latérale)
- Désactiver (soft delete) ou supprimer définitivement un profil (confirmation Dialog)
- Filtrer par : promo, diplôme, statut, ville, entreprise
- Recherche par nom ou email
- Exporter la liste filtrée en CSV (téléchargement navigateur)
- Badge de statut : **Invité** (créé manuellement, pas de compte) / **Inscrit** (a un compte BetterAuth) / **Profil complété** (tous les champs remplis)

### Hors périmètre
- Pas d'espace alumni self-service dans ce PRP (c'est l'admin uniquement)
- Pas d'envoi d'email d'invitation
- Pas d'upload de photo de profil

---

## Technical Context

### Files to Reference (read-only)
- `libs/shared-schema/src/index.ts` — Schémas Zod existants (`AlumniSchema`, `SignUpSchema`, `UserRole`)
- `apps/api/src/index.ts` — Pattern d'enregistrement des routes Fastify
- `apps/api/src/models/Alumni.ts` — Modèle Mongoose Alumni existant (à étendre)
- `apps/api/src/lib/auth.ts` — Configuration BetterAuth (champs additionnels user)
- `apps/web/src/features/alumni/components/AlumniForm.vue` — Pattern formulaire + TanStack Mutation + Zod
- `apps/web/src/features/auth/components/LoginForm.vue` — Pattern import composants shadcn
- `apps/web/src/lib/auth-client.ts` — Pattern `authClient`
- `apps/web/src/lib/utils.ts` — Utilitaire `cn()`
- `apps/web/src/App.vue` — Navbar existante (à enrichir avec lien Annuaire)
- `apps/web/src/router.ts` — Routes existantes

### Files to Implement/Modify

**Shared schema**
- `libs/shared-schema/src/index.ts` — Étendre `AlumniSchema` + ajouter `AlumniProfileSchema`, `AlumniStatusEnum`, `AlumniUpdateSchema`

**Backend**
- `apps/api/src/models/Alumni.ts` — Étendre le modèle Mongoose avec les nouveaux champs
- `apps/api/src/index.ts` — Ajouter routes CRUD alumni + export CSV

**Frontend — composants shadcn à ajouter** (via `bunx shadcn-vue@latest add <name>`)
- `apps/web/src/components/ui/` — Ajouter : `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription`, `SheetFooter`, `SheetClose`, `Badge`, `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, `Separator`, `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose`, `Avatar`, `AvatarFallback`, `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`

**Frontend — pages et features**
- `apps/web/src/pages/AnnuairePage.vue` — Page principale de l'annuaire (tableau + filtres)
- `apps/web/src/pages/ProfilDetailPage.vue` — Page détail d'un profil
- `apps/web/src/features/alumni/components/AlumniSheet.vue` — Sheet créer/modifier un profil
- `apps/web/src/features/alumni/components/AlumniFilters.vue` — Barre de filtres
- `apps/web/src/features/alumni/components/AlumniStatusBadge.vue` — Badge statut coloré
- `apps/web/src/features/alumni/components/AlumniDeleteDialog.vue` — Dialog confirmation suppression
- `apps/web/src/features/alumni/composables/useAlumni.ts` — Composables TanStack Query (liste, détail, mutations)
- `apps/web/src/router.ts` — Ajouter routes `/annuaire` et `/annuaire/:id`
- `apps/web/src/App.vue` — Ajouter lien "Annuaire" dans la navbar

---

## Implementation Details

### 1. Extended Zod Schema (`libs/shared-schema/src/index.ts`)

```typescript
export const AlumniStatusEnum = z.enum(['invited', 'registered', 'completed']);
export type AlumniStatus = z.infer<typeof AlumniStatusEnum>;

export const AlumniProfileSchema = z.object({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Adresse email invalide"),
  graduationYear: z.number().int().min(1900).max(new Date().getFullYear() + 10).optional(),
  diploma: z.string().optional(),       // ex: "Master", "Bachelor", "MBA"
  city: z.string().optional(),
  company: z.string().optional(),
  jobTitle: z.string().optional(),
  phone: z.string().optional(),
  linkedinUrl: z.string().url("URL LinkedIn invalide").optional().or(z.literal('')),
  status: AlumniStatusEnum.default('invited'),
  isActive: z.boolean().default(true),
});

export type AlumniProfileType = z.infer<typeof AlumniProfileSchema>;

// Pour les updates partiels
export const AlumniUpdateSchema = AlumniProfileSchema.partial().omit({ email: true });
export type AlumniUpdateType = z.infer<typeof AlumniUpdateSchema>;
```

Conserver `AlumniSchema` existant pour compatibilité ascendante.

### 2. Mongoose Model (`apps/api/src/models/Alumni.ts`)

Étendre le schéma Mongoose avec tous les nouveaux champs. Le champ `status` a la valeur par défaut `'invited'` (profil créé manuellement par l'admin). `isActive: true` par défaut, passe à `false` lors d'une désactivation (soft delete).

```typescript
import mongoose from 'mongoose';
import { AlumniProfileType } from '@alumni/shared-schema';

const AlumniSchema = new mongoose.Schema<AlumniProfileType>({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  graduationYear: Number,
  diploma: String,
  city: String,
  company: String,
  jobTitle: String,
  phone: String,
  linkedinUrl: String,
  status: { type: String, enum: ['invited', 'registered', 'completed'], default: 'invited' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const Alumni = mongoose.model<AlumniProfileType>('Alumni', AlumniSchema);
```

### 3. API Endpoints (`apps/api/src/index.ts`)

Ajouter ces routes (remplacer la route POST `/alumni` existante) :

#### `GET /alumni`
Query params optionnels : `search`, `graduationYear`, `diploma`, `status`, `city`, `company`, `page` (défaut 1), `limit` (défaut 20)

```
Response: { status: 'success', data: AlumniProfileType[], total: number, page: number, pages: number }
```

Logique de filtrage :
```typescript
const query: any = {};
if (search) query.$or = [
  { firstName: new RegExp(search, 'i') },
  { lastName: new RegExp(search, 'i') },
  { email: new RegExp(search, 'i') },
];
if (graduationYear) query.graduationYear = Number(graduationYear);
if (diploma) query.diploma = new RegExp(diploma, 'i');
if (status) query.status = status;
if (city) query.city = new RegExp(city, 'i');
if (company) query.company = new RegExp(company, 'i');
// Ne jamais retourner les profils inactifs sauf si explicitement demandé
if (showInactive !== 'true') query.isActive = true;
```

#### `GET /alumni/:id`
```
Response: { status: 'success', data: AlumniProfileType }
```

#### `POST /alumni`
Body validé par `AlumniProfileSchema`.
```
Response 201: { status: 'success', data: AlumniProfileType }
Response 400: { status: 'error', message: '...', issues: [...] }
Response 409: { status: 'error', message: 'Email déjà utilisé' }
```

#### `PUT /alumni/:id`
Body validé par `AlumniUpdateSchema`.
```
Response: { status: 'success', data: AlumniProfileType }
```

#### `PATCH /alumni/:id/deactivate`
Passe `isActive` à `false` et `status` à `'invited'` si pas de compte actif.
```
Response: { status: 'success', data: AlumniProfileType }
```

#### `DELETE /alumni/:id`
Suppression définitive.
```
Response: { status: 'success', message: 'Profil supprimé' }
```

#### `GET /alumni/export`
Mêmes query params que `GET /alumni` (sans pagination). Génère un CSV et le retourne avec les headers :
```
Content-Type: text/csv
Content-Disposition: attachment; filename="alumni-export.csv"
```
Colonnes CSV : `Prénom,Nom,Email,Promotion,Diplôme,Ville,Entreprise,Poste,Téléphone,LinkedIn,Statut,Actif,Créé le`

**Important** : déclarer la route `/alumni/export` AVANT la route `/alumni/:id` pour éviter le conflit de paramètre.

### 4. Composable TanStack Query (`apps/web/src/features/alumni/composables/useAlumni.ts`)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import axios from 'axios'
import { type Ref } from 'vue'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export interface AlumniFilters {
  search?: string
  graduationYear?: number
  diploma?: string
  status?: string
  city?: string
  company?: string
  page?: number
}

export function useAlumniList(filters: Ref<AlumniFilters>) {
  return useQuery({
    queryKey: ['alumni', filters],
    queryFn: async () => {
      const params = Object.fromEntries(
        Object.entries(filters.value).filter(([, v]) => v !== '' && v !== undefined)
      )
      const { data } = await axios.get(`${API}/alumni`, { params, withCredentials: true })
      return data
    },
  })
}

export function useAlumniDetail(id: Ref<string>) {
  return useQuery({
    queryKey: ['alumni', id],
    queryFn: async () => {
      const { data } = await axios.get(`${API}/alumni/${id.value}`, { withCredentials: true })
      return data.data
    },
    enabled: () => !!id.value,
  })
}

export function useCreateAlumni() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: unknown) => axios.post(`${API}/alumni`, body, { withCredentials: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alumni'] }),
  })
}

export function useUpdateAlumni() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: unknown }) =>
      axios.put(`${API}/alumni/${id}`, body, { withCredentials: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alumni'] }),
  })
}

export function useDeactivateAlumni() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      axios.patch(`${API}/alumni/${id}/deactivate`, {}, { withCredentials: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alumni'] }),
  })
}

export function useDeleteAlumni() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      axios.delete(`${API}/alumni/${id}`, { withCredentials: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alumni'] }),
  })
}
```

### 5. Page Annuaire (`apps/web/src/pages/AnnuairePage.vue`)

Structure de la page :

```
┌─────────────────────────────────────────────────────────┐
│  Annuaire des diplômés             [+ Nouveau profil]   │
│  XXX diplômés                      [⬇ Exporter CSV]    │
├─────────────────────────────────────────────────────────┤
│  [🔍 Rechercher...]  [Promo ▾]  [Diplôme ▾]  [Statut ▾]│
│  [Ville ▾]  [Entreprise ▾]              [Réinitialiser] │
├─────────────────────────────────────────────────────────┤
│  Avatar  Nom ↑↓    Email          Promo  Statut  Actions│
│  ──────────────────────────────────────────────────────  │
│  [AB]  Alice B.   alice@...       2022  ✅ Complété  ⋯  │
│  [CD]  Charles D. charles@...     2021  📧 Invité    ⋯  │
│  ...                                                     │
├─────────────────────────────────────────────────────────┤
│              < 1 2 3 ... >                               │
└─────────────────────────────────────────────────────────┘
```

**Composants utilisés** : `Card`, `Button`, `Input`, `Select`, `Table`/`TableHeader`/`TableBody`/`TableRow`/`TableHead`/`TableCell`, `Badge`, `Avatar`/`AvatarFallback`, `Separator`, `AlumniSheet`, `AlumniStatusBadge`, `AlumniDeleteDialog`, `AlumniFilters`

**Logique** :
- `filters` = `ref<AlumniFilters>({})` réactif, passé à `useAlumniList(filters)`
- Bouton "Nouveau profil" → `sheetOpen.value = true`, `sheetMode.value = 'create'`
- Clic "Modifier" sur une ligne → `sheetOpen.value = true`, `sheetMode.value = 'edit'`, `selectedAlumni.value = row`
- Clic "Voir" → `router.push('/annuaire/' + row._id)`
- Clic "Désactiver" → `AlumniDeleteDialog` avec mode désactivation
- Clic "Supprimer" → `AlumniDeleteDialog` avec mode suppression
- Export CSV → `window.open(API + '/alumni/export?' + queryString, '_blank')`

### 6. Sheet Créer/Modifier (`apps/web/src/features/alumni/components/AlumniSheet.vue`)

Props : `open: boolean`, `mode: 'create' | 'edit'`, `alumni?: AlumniProfileType`

Émet : `update:open`, `success`

Structure :
```
Sheet (latérale, côté droit, largeur ~600px)
├── SheetHeader
│   ├── SheetTitle: "Nouveau profil" | "Modifier le profil"
│   └── SheetDescription
├── SheetContent (scrollable)
│   └── Form (grid 2 colonnes)
│       ├── Prénom / Nom
│       ├── Email (disabled en mode edit)
│       ├── Promotion / Diplôme
│       ├── Ville / Entreprise
│       ├── Poste / Téléphone
│       └── LinkedIn (pleine largeur)
└── SheetFooter
    ├── Button "Annuler"
    └── Button "Enregistrer" (avec Loader2 si pending)
```

Validation Zod côté client avec affichage des erreurs champ par champ (même pattern que `AlumniForm.vue`).

### 7. Badge Statut (`apps/web/src/features/alumni/components/AlumniStatusBadge.vue`)

Props : `status: 'invited' | 'registered' | 'completed'`

```typescript
const config = {
  invited:   { label: 'Invité',            variant: 'outline',     icon: Mail },
  registered:{ label: 'Inscrit',           variant: 'secondary',   icon: UserCheck },
  completed: { label: 'Profil complété',   variant: 'default',     icon: CheckCircle2 },
}
```

Utilise le composant `Badge` de shadcn-vue avec icône lucide à gauche.

### 8. Dialog Confirmation (`apps/web/src/features/alumni/components/AlumniDeleteDialog.vue`)

Props : `open: boolean`, `mode: 'deactivate' | 'delete'`, `alumniName: string`

Émet : `update:open`, `confirm`

Affiche un Dialog shadcn avec texte contextuel :
- Désactiver : "Le profil de {nom} sera masqué de l'annuaire mais conservé dans la base."
- Supprimer : "Cette action est irréversible. Le profil de {nom} sera définitivement supprimé."

Bouton de confirmation en `variant="destructive"`.

### 9. Page Détail Profil (`apps/web/src/pages/ProfilDetailPage.vue`)

Route param : `:id`

Structure :
```
← Retour à l'annuaire

┌─ [Avatar large] Alice Beaumont ─ [Badge: Profil complété] ─────┐
│  alice.beaumont@ecole.fr                         [Modifier] [⋯] │
└──────────────────────────────────────────────────────────────────┘

┌─ Informations personnelles ──┐  ┌─ Parcours professionnel ──────┐
│ Promotion    2022            │  │ Entreprise   Société XYZ      │
│ Diplôme      Master Design   │  │ Poste        UX Designer      │
│ Ville        Paris           │  │ LinkedIn     linkedin.com/... │
│ Téléphone    +33 6 ...       │  └───────────────────────────────┘
└──────────────────────────────┘

┌─ Infos système ─────────────────────────────────────────────────┐
│ Créé le   12/01/2024     Modifié le   14/02/2025                │
│ Statut    Actif                                                  │
└──────────────────────────────────────────────────────────────────┘
```

Bouton "Modifier" → ouvre `AlumniSheet` en mode edit directement sur cette page.

### 10. Navbar (`apps/web/src/App.vue`)

Ajouter dans `<nav>` le lien vers l'annuaire (visible uniquement si session active) :
```html
<RouterLink v-if="session.data?.user" to="/annuaire">
  <Button variant="ghost" size="sm" class="flex items-center gap-2">
    <Users class="h-4 w-4" />
    Annuaire
  </Button>
</RouterLink>
```

### 11. Router (`apps/web/src/router.ts`)

```typescript
import AnnuairePage from './pages/AnnuairePage.vue'
import ProfilDetailPage from './pages/ProfilDetailPage.vue'

// Ajouter dans routes[]
{ path: '/annuaire', component: AnnuairePage },
{ path: '/annuaire/:id', component: ProfilDetailPage },
```

---

## Validation Criteria

### Functional Requirements
- [ ] La page `/annuaire` affiche tous les profils actifs dans un tableau
- [ ] Les filtres (recherche, promo, diplôme, statut, ville, entreprise) filtrent les résultats en temps réel
- [ ] Le bouton "Nouveau profil" ouvre une Sheet avec un formulaire vide
- [ ] La soumission du formulaire crée un alumni avec `status: 'invited'` et invalide le cache TanStack Query
- [ ] Le bouton "Modifier" ouvre la Sheet pré-remplie avec les données du profil
- [ ] La modification d'un profil met à jour les données et ferme la Sheet
- [ ] Le bouton "Désactiver" ouvre un Dialog de confirmation, puis désactive le profil (masqué de la liste)
- [ ] Le bouton "Supprimer" ouvre un Dialog de confirmation destructive, puis supprime définitivement
- [ ] Le bouton "Exporter CSV" télécharge un fichier CSV avec les données filtrées courantes
- [ ] Cliquer sur "Voir" navigue vers `/annuaire/:id`
- [ ] La page `/annuaire/:id` affiche toutes les données du profil dans un layout structuré
- [ ] Le badge de statut affiche la bonne couleur et le bon libellé (Invité / Inscrit / Profil complété)
- [ ] L'annuaire est accessible dans la navbar pour un utilisateur connecté

### Technical Requirements
- [ ] `bun run build` dans `apps/web` compile sans erreur TypeScript
- [ ] Aucun `any` explicite — utiliser les types inférés de Zod ou des interfaces explicites
- [ ] Tous les appels API passent par le composable `useAlumni.ts` (pas d'axios direct dans les composants)
- [ ] La route `/alumni/export` est déclarée avant `/alumni/:id` dans Fastify
- [ ] Les composants shadcn sont installés via `bunx shadcn-vue@latest add` avant utilisation
- [ ] Les textes de l'interface sont en français

### Testing Steps
1. Lancer `docker compose up` (MongoDB + API + Web)
2. Aller sur `/annuaire` → vérifier que le tableau s'affiche (vide si base vide)
3. Cliquer "Nouveau profil" → remplir le formulaire → "Enregistrer" → vérifier l'apparition dans le tableau avec badge "Invité"
4. Cliquer "Modifier" sur ce profil → changer un champ → "Enregistrer" → vérifier la mise à jour
5. Cliquer "Désactiver" → confirmer → vérifier que le profil disparaît de la liste
6. Créer un 2e profil, cliquer "Supprimer" → confirmer → vérifier la suppression définitive
7. Tester chaque filtre séparément puis en combinaison
8. Cliquer "Exporter CSV" → vérifier que le fichier téléchargé contient les bonnes colonnes et données filtrées
9. Cliquer "Voir" sur un profil → vérifier que la page `/annuaire/:id` affiche toutes les informations
10. Cliquer "Modifier" depuis la page détail → vérifier que la Sheet s'ouvre pré-remplie
