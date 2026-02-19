# Gestion des Utilisateurs - Création de Compte Admin PRP

## Goal
Créer une route et une page permettant aux administrateurs de créer un compte utilisateur pour un profil alumni existant, avec un mot de passe généré aléatoirement.

## Why
Permet aux administrateurs de faciliter l'onboarding des alumni en créant leurs comptes à leur place, garantissant que les données du compte correspondent au profil alumni déjà enregistré.

## What
- Une nouvelle route API `GET /alumni/:id` pour récupérer les détails d'un alumni.
- Une nouvelle page frontend `/admin/create-account/:alumniId`.
- Un formulaire de création de compte (en français) inspiré du `LoginForm.vue`.
- Pré-remplissage de l'email depuis le profil alumni.
- Génération d'un mot de passe sécurisé aléatoire.
- Affichage des informations de l'alumni (nom, prénom, année).
- Attribution automatique du rôle 'alumni'.

## Technical Context

### Files to Reference (read-only)
- `apps/web/src/features/auth/components/LoginForm.vue` — pour le style et la structure du formulaire.
- `apps/web/src/features/auth/components/RegisterForm.vue` — pour la logique d'inscription via Better-Auth.
- `libs/shared-schema/src/index.ts` — pour les schémas Zod (`SignUpSchema`, `AlumniSchema`).
- `apps/api/src/index.ts` — pour l'implémentation des routes Fastify.

### Files to Implement/Modify
- `apps/api/src/index.ts` — ajouter la route `GET /alumni/:id`.
- `apps/web/src/router.ts` — ajouter la route `/admin/create-account/:alumniId`.
- `apps/web/src/pages/admin/CreateAccountPage.vue` — nouvelle page pour la création de compte.
- `apps/web/src/features/admin/components/CreateAccountForm.vue` — nouveau composant de formulaire.

### Existing Patterns to Follow
- Utilisation de `Better-Auth` via `authClient` sur le frontend.
- Utilisation de `TanStack Query` (Vue Query) pour le fetch des données alumni.
- Validation avec `Zod` et les schémas partagés.
- Composants UI de `Shadcn-vue`.

## Implementation Details

### API/Endpoints
- `GET /alumni/:id` : Retourne l'objet `Alumni` correspondant à l'ID.
- `POST /api/auth/sign-up/email` : (Existant via Better-Auth) Utilisé pour créer le compte.

### Components
#### CreateAccountForm.vue
- Champs : Email (pré-rempli, readonly), Mot de passe (généré, visible ou modifiable), Prénom (readonly), Nom (readonly).
- Bouton : "Créer le compte".
- Affichage des infos alumni : Un encart informatif affichant le prénom, nom, et l'année de diplomation.

## Validation Criteria

### Functional Requirements
- [ ] La page affiche correctement les informations de l'alumni via son ID.
- [ ] L'email est pré-rempli et correspond à celui du profil alumni.
- [ ] Un mot de passe aléatoire est généré au chargement de la page.
- [ ] La soumission du formulaire crée un utilisateur avec le rôle 'alumni'.
- [ ] Le wording est entièrement en français.

### Technical Requirements
- [ ] TypeScript compile sans erreurs.
- [ ] Utilisation de `shared-schema` pour la validation.
- [ ] Pas d'erreurs de console lors du fetch de l'alumni.

### Testing Steps
1. Créer un profil alumni via `/seed` ou le formulaire existant.
2. Naviguer vers `/admin/create-account/[ALUMNI_ID]`.
3. Vérifier que les infos sont présentes et l'email correct.
4. Cliquer sur "Créer le compte".
5. Vérifier dans la base de données (ou via login) que le compte est créé.
