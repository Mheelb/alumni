# 🎓 Alumni Manager

Une plateforme moderne et performante pour la gestion, le suivi et l'animation d'un réseau d'alumni. Ce projet utilise une architecture monorepo pour garantir une cohérence parfaite entre le frontend et le backend.

## 🚀 Technologies

Le projet est propulsé par l'écosystème **Bun** pour une rapidité d'exécution optimale.

- **Monorepo** : [Nx](https://nx.dev/)
- **Runtime & Package Manager** : [Bun](https://bun.sh/)
- **Frontend** : Vue 3 (Composition API), Vite, Tailwind CSS, [Shadcn-vue](https://www.shadcn-vue.com/)
- **Backend** : Fastify, MongoDB (Mongoose)
- **Authentification** : [Better-Auth](https://www.better-auth.com/)
- **Validation & Types** : Zod (Schémas partagés)

---

## 🏗️ Architecture du Projet

Le projet est divisé en trois parties principales :

- `apps/web` : L'application client Vue 3.
- `apps/api` : L'API Fastify gérant la logique métier et l'accès aux données.
- `libs/shared-schema` : Bibliothèque contenant les schémas Zod et les types TypeScript partagés entre le web et l'api, assurant une synchronisation parfaite des données.

---

## 🔐 Logique des Statuts & Comptes

Nous utilisons une logique de statut à trois niveaux pour suivre l'engagement des alumni :

1.  **Sans compte (`unlinked`)** : Le profil existe dans la base de données (importé ou créé manuellement) mais n'a pas encore de compte utilisateur associé.
2.  **Invité (`invited`)** : Un compte utilisateur a été créé par un administrateur, mais l'alumni ne s'est pas encore connecté pour la première fois.
3.  **Inscrit (`registered`)** : L'alumni s'est connecté au moins une fois à la plateforme.

> [!NOTE]
> La visibilité de ces statuts est strictement réservée aux **Administrateurs**. Les alumni voient l'annuaire mais n'ont pas accès aux informations de statut de leurs pairs.

---

## ✨ Fonctionnalités Clés

### 👤 Pour les Alumni
- **Annuaire interactif** : Recherche par nom, entreprise, ville ou promotion.
- **Profil personnel** : Mise à jour des informations de contact et professionnelles.
- **Sécurité** : Gestion de compte et authentification sécurisée.

### 🛠️ Pour les Administrateurs
- **Dashboard** : Statistiques en temps réel sur l'activation du réseau.
- **Gestion des profils** : Création, modification, désactivation (soft-delete) ou suppression définitive d'alumni.
- **Gestion des utilisateurs** : Bannissement, réactivation ou suppression des comptes d'accès.
- **Import/Export** : Import massif de données via CSV avec création automatique de comptes optionnelle.
- **Synchronisation LinkedIn** : Intégration (via scraper) pour maintenir les profils à jour.

---

## 🛠️ Installation et Développement

### Prérequis
- [Bun](https://bun.sh/) installé sur votre machine.
- Une instance **MongoDB** (locale ou Atlas).

### Installation
```bash
bun install
```

### Lancement en développement
Le projet utilise Nx pour lancer les services en parallèle :

```bash
# Lancer toute la stack (API + Web)
bun dev

# Ou individuellement
bun dev:api
bun dev:web
```

---

## 📋 Commandes Utiles

- `bun nx list` : Liste tous les projets du monorepo.
- `bun test` : Lance les tests sur l'ensemble du projet.
- `bun run lint` : Vérifie le style du code.

---

## 🧪 Tests

Les tests couvrent les trois packages du monorepo.

| Package | Framework | Périmètre |
|---|---|---|
| `libs/shared-schema` | Bun test | Validation Zod (schemas, erreurs, cas limites) |
| `apps/api` | Bun test + MongoDB in-memory | Routes Fastify (CRUD alumni, codes HTTP, health) |
| `apps/web` | Vitest + Vue Test Utils | Composants Vue, fonctions utilitaires |

### Lancer tous les tests
```bash
bun test
```

### Lancer les tests d'un package
```bash
bun test:schema   # Schemas Zod
bun test:api      # Routes Fastify (MongoDB in-memory)
bun test:web      # Composants Vue
```

### CI — Protection de branche

Chaque Pull Request vers `main` ou `dev` déclenche automatiquement 5 jobs GitHub Actions en parallèle :

| Job | Ce qu'il vérifie |
|---|---|
| `Tests — shared-schema` | Schemas Zod |
| `Tests — API` | Typecheck TypeScript + routes Fastify |
| `Tests — Web` | Composants Vue |
| `Build — Web` | `vue-tsc` + compilation Vite |
| `Audit — dépendances` | Vulnérabilités connues dans les packages |

Le merge est bloqué si l'un d'eux échoue. Le cache Bun est partagé entre les jobs pour accélérer les runs.

Pour activer la protection de branche sur GitHub (à répéter pour `main` et `dev`) :
1. Aller dans **Settings → Branches → Add branch protection rule**
2. Branch name pattern : `main` puis `dev`
3. Cocher **Require status checks to pass before merging**
4. Ajouter les 5 checks listés ci-dessus

---

## 📁 Structure des dossiers
```text
.
├── apps/
│   ├── api/          # Backend Fastify
│   └── web/          # Frontend Vue 3
├── libs/
│   └── shared-schema/# Schémas de validation partagés
├── docs/             # Documentation technique (Architecture, Guidelines)
└── scripts/          # Scripts d'utilité (Seed, etc.)
```
