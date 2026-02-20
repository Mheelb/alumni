import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import mongoose from 'mongoose';
import { Alumni } from './models/Alumni';
import { User } from './models/User'; // Add this import
import { auth } from './lib/auth';
import { AlumniProfileSchema, AlumniUpdateSchema } from '@alumni/shared-schema';
import { scraperRoutes } from './routes/scraper';
import { dashboardRoutes } from './routes/dashboard';
import { profileUpdateRequestRoutes } from './routes/profile-update-requests';
import { requireAdmin, requireAuth } from './lib/middleware';

const fastify = Fastify({ logger: true, bodyLimit: 5 * 1024 * 1024 });
const BASE_URL = process.env.BETTER_AUTH_BASE_URL || 'http://localhost:3000';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/alumni';

// ─── Shared JSON Schema fragments ────────────────────────────────────────────

const AlumniProperties = {
  _id:            { type: 'string' },
  firstName:      { type: 'string' },
  lastName:       { type: 'string' },
  email:          { type: 'string', format: 'email' },
  status:         { type: 'string', enum: ['unlinked', 'invited', 'registered'] },
  isActive:       { type: 'boolean' },
  graduationYear: { type: 'number', nullable: true },
  diploma:        { type: 'string', nullable: true },
  city:           { type: 'string', nullable: true },
  company:        { type: 'string', nullable: true },
  jobTitle:       { type: 'string', nullable: true },
  phone:          { type: 'string', nullable: true },
  linkedinUrl:    { type: 'string', nullable: true },
  avatarUrl:      { type: 'string', nullable: true },
  createdAt:      { type: 'string' },
  updatedAt:      { type: 'string' },
};

const AlumniObj = { type: 'object', properties: AlumniProperties };

const AlumniInputBody = {
  type: 'object',
  required: ['firstName', 'lastName', 'email', 'isActive'],
  properties: {
    firstName:      { type: 'string', minLength: 2 },
    lastName:       { type: 'string', minLength: 2 },
    email:          { type: 'string', format: 'email' },
    graduationYear: { type: 'number', nullable: true },
    diploma:        { type: 'string', nullable: true },
    city:           { type: 'string', nullable: true },
    company:        { type: 'string', nullable: true },
    jobTitle:       { type: 'string', nullable: true },
    phone:          { type: 'string', nullable: true },
    linkedinUrl:    { type: 'string', nullable: true },
    status:         { type: 'string', enum: ['unlinked', 'invited', 'registered'] },
    isActive:       { type: 'boolean' },
  },
};

const AlumniUpdateBody = {
  type: 'object',
  properties: {
    firstName:      { type: 'string', minLength: 2 },
    lastName:       { type: 'string', minLength: 2 },
    graduationYear: { type: 'number', nullable: true },
    diploma:        { type: 'string', nullable: true },
    city:           { type: 'string', nullable: true },
    company:        { type: 'string', nullable: true },
    jobTitle:       { type: 'string', nullable: true },
    phone:          { type: 'string', nullable: true },
    linkedinUrl:    { type: 'string', nullable: true },
    status:         { type: 'string', enum: ['unlinked', 'invited', 'registered'] },
  },
};

const IdParam = {
  type: 'object',
  required: ['id'],
  properties: { id: { type: 'string', description: 'MongoDB ObjectId' } },
};

const BulkIdsBody = {
  type: 'object',
  required: ['ids'],
  properties: {
    ids: { type: 'array', items: { type: 'string' }, minItems: 1, description: 'Liste des ObjectId à traiter' },
  },
};

const AlumniFiltersQuery = {
  type: 'object',
  properties: {
    search:       { type: 'string', description: 'Recherche sur prénom, nom, email' },
    graduationYear: { type: 'string', description: 'Année de promotion' },
    diploma:      { type: 'string', description: 'Diplôme (recherche partielle)' },
    status:       { type: 'string', enum: ['unlinked', 'invited', 'registered'], description: 'Statut du compte' },
    city:         { type: 'string', description: 'Ville (recherche partielle)' },
    company:      { type: 'string', description: 'Entreprise (recherche partielle)' },
    showInactive: { type: 'string', enum: ['true', 'false'], description: 'Inclure les profils désactivés' },
    page:         { type: 'string', description: 'Numéro de page (défaut : 1)' },
    limit:        { type: 'string', description: 'Résultats par page (défaut : 20, max : 100)' },
  },
};

const ErrorResp = {
  type: 'object',
  properties: {
    status:  { type: 'string', enum: ['error'] },
    message: { type: 'string' },
  },
};

const SuccessMsg = {
  type: 'object',
  properties: {
    status:  { type: 'string', enum: ['success'] },
    message: { type: 'string' },
  },
};

// ─── Plugins ─────────────────────────────────────────────────────────────────

fastify.register(helmet);
fastify.register(cors, {
  origin: process.env.WEB_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});

fastify.register(fastifySwagger, {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: 'Alumni Manager API',
      description:
        'API REST de la plateforme Alumni Manager.\n\n' +
        '**Authentification** : toutes les routes protégées lisent le cookie de session ' +
        '`better-auth.session_token` émis par `/api/auth/sign-in/email`.\n\n' +
        '🔒 **Auth** — accessible à tout utilisateur connecté  \n' +
        '🛡️ **Admin** — réservé aux comptes avec le rôle `admin`',
      version: '1.0.0',
    },
    externalDocs: { description: 'Dépôt GitHub', url: 'https://github.com' },
    tags: [
      { name: 'Alumni',       description: 'Gestion des profils alumni' },
      { name: 'Utilisateurs', description: 'Gestion des comptes utilisateurs (🛡️ admin)' },
      { name: 'Statistiques', description: 'Tableau de bord et statistiques (🛡️ admin)' },
      { name: 'Scraper',      description: 'Import / synchronisation LinkedIn (🛡️ admin)' },
      { name: 'Santé',        description: 'Disponibilité du serveur' },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey' as const,
          in: 'cookie' as const,
          name: 'better-auth.session_token',
          description: 'Cookie de session BetterAuth — obtenu via POST /api/auth/sign-in/email',
        },
      },
    },
    security: [{ cookieAuth: [] }],
  },
});

fastify.register(fastifySwaggerUi, {
  routePrefix: '/docs',
  uiConfig: { docExpansion: 'list', deepLinking: true },
});

fastify.register(scraperRoutes);
fastify.register(dashboardRoutes);
fastify.register(profileUpdateRequestRoutes);

// ─── BetterAuth handler ───────────────────────────────────────────────────────

fastify.all('/api/auth/*', async (request, reply) => {
  const url = new URL(request.url, BASE_URL);
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }

  const webRequest = new Request(url.toString(), {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : JSON.stringify(request.body),
  });

  const response = await auth.handler(webRequest);
  reply.status(response.status);
  response.headers.forEach((value, key) => {
    reply.header(key, value);
  });
  return reply.send(await response.text());
});

// ─── Santé ───────────────────────────────────────────────────────────────────

fastify.get('/health', {
  schema: {
    tags: ['Santé'],
    summary: 'Vérification de santé',
    description: 'Retourne l\'état du serveur et de la connexion MongoDB.',
    security: [],
    response: {
      200: {
        type: 'object',
        properties: {
          status:  { type: 'string', enum: ['ok'] },
          mongodb: { type: 'string', enum: ['connected', 'disconnected'] },
        },
      },
    },
  },
}, async () => ({
  status: 'ok',
  mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
}));

// ─── Utilisateurs ─────────────────────────────────────────────────────────────

fastify.get('/users/check-email/:email', {
  schema: {
    tags: ['Utilisateurs'],
    summary: 'Vérifier l\'existence d\'un email',
    description: 'Indique si une adresse email est déjà associée à un compte utilisateur. Aucune authentification requise.',
    security: [],
    params: {
      type: 'object',
      required: ['email'],
      properties: { email: { type: 'string', format: 'email' } },
    },
    response: {
      200: {
        type: 'object',
        properties: { exists: { type: 'boolean' } },
      },
    },
  },
}, async (request, reply) => {
  try {
    const { email } = request.params as { email: string };
    const user = await mongoose.connection.db?.collection('user').findOne({ email });
    return { exists: !!user };
  } catch {
    return { exists: false };
  }
});

// Admin: List all users
fastify.get('/admin/users', {
  schema: {
    tags: ['Utilisateurs'],
    summary: 'Lister tous les comptes utilisateurs',
    description: '🛡️ **Admin** — Retourne la liste des comptes BetterAuth avec leur statut de bannissement.',
    querystring: {
      type: 'object',
      properties: {
        role:   { type: 'string', enum: ['admin', 'alumni'], description: 'Filtrer par rôle' },
        status: { type: 'string', enum: ['active', 'inactive'], description: 'Filtrer par statut (active = non banni, inactive = banni)' },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id:        { type: 'string' },
                name:      { type: 'string' },
                email:     { type: 'string' },
                role:      { type: 'string' },
                alumniId:  { type: 'string', nullable: true },
                banned:    { type: 'boolean', nullable: true },
              },
            },
          },
        },
      },
      500: ErrorResp,
    },
  },
  preHandler: requireAdmin,
}, async (request, reply) => {
  try {
    const query = request.query as Record<string, string | undefined>;
    const filter: Record<string, unknown> = {};

    if (query.role) {
      filter.role = query.role;
    }

    if (query.status === 'active') {
      filter.$or = [
        { banned: { $ne: true } },
        { banned: { $exists: false } }
      ];
    } else if (query.status === 'inactive') {
      filter.banned = true;
    }

    const users = await mongoose.connection.db?.collection('user').find(filter).toArray();
    return { status: 'success', data: users };
  } catch (err) {
    fastify.log.error(err);
    return reply.status(500).send({ status: 'error', message: 'Erreur lors de la récupération des utilisateurs' });
  }
});

// Admin: Toggle user status (Active/Inactive)
fastify.patch('/admin/users/:id/toggle-status', {
  schema: {
    tags: ['Utilisateurs'],
    summary: 'Basculer le statut d\'un compte',
    description: '🛡️ **Admin** — Banni ou réactive un compte utilisateur. Utilise l\'API BetterAuth `banUser` / `unbanUser`.',
    params: IdParam,
    response: {
      200: SuccessMsg,
      404: ErrorResp,
      500: ErrorResp,
    },
  },
  preHandler: requireAdmin,
}, async (request, reply) => {
  try {
    const { id } = request.params as { id: string };

    const query: Record<string, unknown> = { $or: [{ id: id }] };
    if (mongoose.Types.ObjectId.isValid(id)) {
      (query.$or as unknown[]).push({ _id: new mongoose.Types.ObjectId(id) });
    }

    const user = await mongoose.connection.db?.collection('user').findOne(query);

    if (!user) {
      return reply.status(404).send({ status: 'error', message: 'Utilisateur introuvable' });
    }

    const betterAuthId = user.id || user._id.toString();
    const isBanned = !!user.banned || !!(user as Record<string, unknown>).isBanned;

    if (isBanned) {
      await auth.api.unbanUser({
        headers: request.headers,
        body: { userId: betterAuthId }
      });
      return { status: 'success', message: 'Compte réactivé avec succès' };
    } else {
      await auth.api.banUser({
        headers: request.headers,
        body: { userId: betterAuthId }
      });
      return { status: 'success', message: 'Compte désactivé avec succès' };
    }
  } catch (err) {
    fastify.log.error(err);
    return reply.status(500).send({ status: 'error', message: 'Erreur lors du changement de statut du compte' });
  }
});

// ─── Alumni helpers ───────────────────────────────────────────────────────────

function buildAlumniFilter(query: Record<string, string | undefined>) {
  const filter: Record<string, unknown> = {};

  if (query.search) {
    const re = new RegExp(query.search, 'i');
    filter.$or = [{ firstName: re }, { lastName: re }, { email: re }];
  }
  if (query.graduationYear) filter.graduationYear = Number(query.graduationYear);
  if (query.diploma) filter.diploma = new RegExp(query.diploma, 'i');
  if (query.status) filter.status = query.status;
  if (query.city) filter.city = new RegExp(query.city, 'i');
  if (query.company) filter.company = new RegExp(query.company, 'i');
  if (query.showInactive !== 'true') filter.isActive = true;

  return filter;
}

// ─── Alumni ───────────────────────────────────────────────────────────────────

// GET /alumni/export — must be declared BEFORE /alumni/:id
fastify.get('/alumni/export', {
  schema: {
    tags: ['Alumni'],
    summary: 'Exporter les alumni en CSV',
    description: '🛡️ **Admin** — Génère et télécharge un fichier CSV avec les mêmes filtres que la liste.',
    querystring: AlumniFiltersQuery,
    response: {
      200: { type: 'string', description: 'Fichier CSV (Content-Disposition: attachment)' },
      500: ErrorResp,
    },
  },
  preHandler: requireAdmin,
}, async (request, reply) => {
  const query = request.query as Record<string, string | undefined>;
  const filter = buildAlumniFilter(query);

  const alumni = await Alumni.find(filter).sort({ lastName: 1, firstName: 1 }).lean();

  const headers = [
    'Prénom', 'Nom', 'Email', 'Promotion', 'Diplôme',
    'Ville', 'Entreprise', 'Poste', 'Téléphone', 'LinkedIn',
    'Statut', 'Actif', 'Créé le',
  ];

  const rows = alumni.map((a) => [
    a.firstName,
    a.lastName,
    a.email,
    a.graduationYear ?? '',
    a.diploma ?? '',
    a.city ?? '',
    a.company ?? '',
    a.jobTitle ?? '',
    a.phone ?? '',
    a.linkedinUrl ?? '',
    a.status,
    a.isActive ? 'Oui' : 'Non',
    a.createdAt ? new Date(a.createdAt as Date).toLocaleDateString('fr-FR') : '',
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    .join('\n');

  reply.header('Content-Type', 'text/csv; charset=utf-8');
  reply.header('Content-Disposition', 'attachment; filename="alumni-export.csv"');
  return reply.send('\uFEFF' + csv);
});

// GET /alumni
fastify.get('/alumni', {
  schema: {
    tags: ['Alumni'],
    summary: 'Lister les alumni',
    description: '🔒 **Auth** — Retourne la liste paginée des alumni actifs. Les admins peuvent voir tous les statuts et les profils désactivés via `showInactive=true`.',
    querystring: AlumniFiltersQuery,
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          data:   { type: 'array', items: AlumniObj },
          total:  { type: 'number' },
          page:   { type: 'number' },
          pages:  { type: 'number' },
        },
      },
    },
  },
  preHandler: requireAuth,
}, async (request, reply) => {
  const query = request.query as Record<string, string | undefined>;
  const filter = buildAlumniFilter(query);

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;

  const [alumni, total] = await Promise.all([
    Alumni.find(filter).sort({ lastName: 1, firstName: 1 }).skip(skip).limit(limit).lean(),
    Alumni.countDocuments(filter),
  ]);

  return reply.send({
    status: 'success',
    data: alumni,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
});

// GET /alumni/me — must be before /alumni/:id
fastify.get('/alumni/me', {
  schema: {
    tags: ['Alumni'],
    summary: 'Mon profil alumni',
    description: '🔒 **Auth** — Retourne le profil alumni lié au compte connecté (recherche par email de session).',
    response: {
      200: { type: 'object', properties: { status: { type: 'string' }, data: AlumniObj } },
      401: ErrorResp,
      404: ErrorResp,
    },
  },
  preHandler: requireAuth,
}, async (request, reply) => {
  const email = (request as any).session?.user?.email as string | undefined;
  if (!email) {
    return reply.status(401).send({ status: 'error', message: 'Non authentifié' });
  }
  const alumni = await Alumni.findOne({ email, isActive: true }).lean();
  if (!alumni) {
    return reply.status(404).send({ status: 'error', message: 'Profil introuvable' });
  }
  return reply.send({ status: 'success', data: alumni });
});

// GET /alumni/:id
fastify.get('/alumni/:id', {
  schema: {
    tags: ['Alumni'],
    summary: 'Obtenir un profil alumni',
    description: '🔒 **Auth** — Retourne le profil complet d\'un alumni par son identifiant MongoDB.',
    params: IdParam,
    response: {
      200: { type: 'object', properties: { status: { type: 'string' }, data: AlumniObj } },
      404: ErrorResp,
    },
  },
  preHandler: requireAuth,
}, async (request, reply) => {
  const { id } = request.params as { id: string };
  const alumni = await Alumni.findById(id).lean();
  if (!alumni) {
    return reply.status(404).send({ status: 'error', message: 'Profil introuvable' });
  }
  return reply.send({ status: 'success', data: alumni });
});

// POST /alumni
fastify.post('/alumni', {
  schema: {
    tags: ['Alumni'],
    summary: 'Créer un profil alumni',
    description: '🛡️ **Admin** — Crée manuellement un nouveau profil alumni. Le statut est automatiquement mis à `unlinked`.',
    body: AlumniInputBody,
    response: {
      201: { type: 'object', properties: { status: { type: 'string' }, data: AlumniObj } },
      400: ErrorResp,
      409: { ...ErrorResp, description: 'Email déjà utilisé' },
    },
  },
  preHandler: requireAdmin,
}, async (request, reply) => {
  const result = AlumniProfileSchema.safeParse(request.body);
  if (!result.success) {
    return reply.status(400).send({
      status: 'error',
      message: 'Données invalides',
      issues: result.error.issues,
    });
  }

  const existing = await Alumni.findOne({ email: result.data.email });
  if (existing) {
    return reply.status(409).send({ status: 'error', message: 'Cette adresse email est déjà utilisée' });
  }

  const alumniData = { ...result.data, status: result.data.status || 'unlinked' };
  const alumni = new Alumni(alumniData);
  await alumni.save();
  return reply.status(201).send({ status: 'success', data: alumni });
});

// PUT /alumni/:id
fastify.put('/alumni/:id', {
  schema: {
    tags: ['Alumni'],
    summary: 'Mettre à jour un profil alumni',
    description: '🛡️ **Admin** — Remplace les champs fournis du profil. L\'email ne peut pas être modifié.',
    params: IdParam,
    body: AlumniUpdateBody,
    response: {
      200: { type: 'object', properties: { status: { type: 'string' }, data: AlumniObj } },
      400: ErrorResp,
      404: ErrorResp,
    },
  },
  preHandler: requireAdmin,
}, async (request, reply) => {
  const { id } = request.params as { id: string };
  const result = AlumniUpdateSchema.safeParse(request.body);
  if (!result.success) {
    return reply.status(400).send({
      status: 'error',
      message: 'Données invalides',
      issues: result.error.issues,
    });
  }

  const alumni = await Alumni.findByIdAndUpdate(id, result.data, { new: true }).lean();
  if (!alumni) {
    return reply.status(404).send({ status: 'error', message: 'Profil introuvable' });
  }
  return reply.send({ status: 'success', data: alumni });
});

// PATCH /alumni/:id/deactivate
fastify.patch('/alumni/:id/deactivate', {
  schema: {
    tags: ['Alumni'],
    summary: 'Désactiver un profil alumni',
    description: '🛡️ **Admin** — Passe `isActive` à `false` (soft-delete). Le profil reste en base de données.',
    params: IdParam,
    response: {
      200: { type: 'object', properties: { status: { type: 'string' }, data: AlumniObj } },
      404: ErrorResp,
    },
  },
  preHandler: requireAdmin,
}, async (request, reply) => {
  const { id } = request.params as { id: string };
  const alumni = await Alumni.findByIdAndUpdate(id, { isActive: false }, { new: true }).lean();
  if (!alumni) {
    return reply.status(404).send({ status: 'error', message: 'Profil introuvable' });
  }
  return reply.send({ status: 'success', data: alumni });
});

// GET /stats
fastify.get('/stats', {
  schema: {
    tags: ['Statistiques'],
    summary: 'Statistiques de base',
    description: '🛡️ **Admin** — Retourne le total d\'alumni, la répartition par statut, le taux d\'activation et les 5 derniers inscrits.',
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              total:          { type: 'number' },
              activationRate: { type: 'number', description: 'Pourcentage (0–100)' },
              byStatus: {
                type: 'object',
                properties: {
                  unlinked:   { type: 'number' },
                  invited:    { type: 'number' },
                  registered: { type: 'number' },
                },
              },
              recentAlumni: { type: 'array', items: AlumniObj },
            },
          },
        },
      },
    },
  },
  preHandler: requireAdmin,
}, async (_request, reply) => {
  const [total, byStatusRaw, recentAlumni] = await Promise.all([
    Alumni.countDocuments({ isActive: true }),
    Alumni.aggregate<{ _id: string; count: number }>([
      { $match: { isActive: true } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Alumni.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('firstName lastName email status createdAt')
      .lean(),
  ]);

  const byStatus = { unlinked: 0, invited: 0, registered: 0 };
  for (const row of byStatusRaw) {
    if (row._id === 'unlinked') byStatus.unlinked = row.count;
    else if (row._id === 'invited') byStatus.invited = row.count;
    else if (row._id === 'registered') byStatus.registered = row.count;
  }

  const activationRate = total > 0 ? Math.round((byStatus.registered / total) * 100) : 0;

  return reply.send({
    status: 'success',
    data: { total, byStatus, activationRate, recentAlumni },
  });
});

// DELETE /alumni/:id
fastify.delete('/alumni/:id', {
  schema: {
    tags: ['Alumni'],
    summary: 'Supprimer un profil alumni',
    description: '🛡️ **Admin** — Supprime définitivement le profil et banni le compte utilisateur associé si existant.',
    params: IdParam,
    response: {
      200: SuccessMsg,
      404: ErrorResp,
      500: ErrorResp,
    },
  },
  preHandler: requireAdmin,
}, async (request, reply) => {
  const { id } = request.params as { id: string };

  try {
    const user = await mongoose.connection.db?.collection('user').findOne({ alumniId: id });

    if (user) {
      const betterAuthId = user.id || user._id.toString();
      await auth.api.banUser({
        headers: request.headers,
        body: { userId: betterAuthId }
      });
      fastify.log.info(`User ${betterAuthId} banned due to alumni profile deletion`);
    }

    const alumni = await Alumni.findByIdAndDelete(id).lean();
    if (!alumni) {
      return reply.status(404).send({ status: 'error', message: 'Profil introuvable' });
    }

    return reply.send({ status: 'success', message: 'Profil supprimé et compte utilisateur désactivé' });
  } catch (err) {
    fastify.log.error(err);
    return reply.status(500).send({ status: 'error', message: 'Erreur lors de la suppression du profil' });
  }
});

// POST /alumni/bulk-deactivate
fastify.post('/alumni/bulk-deactivate', {
  schema: {
    tags: ['Alumni'],
    summary: 'Désactivation en masse',
    description: '🛡️ **Admin** — Désactive plusieurs profils alumni en une seule requête.',
    body: BulkIdsBody,
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          data: { type: 'object', properties: { updated: { type: 'number' } } },
        },
      },
      400: ErrorResp,
    },
  },
  preHandler: requireAdmin,
}, async (request, reply) => {
  const body = request.body as { ids?: unknown };
  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return reply.status(400).send({ status: 'error', message: 'Le champ "ids" doit être un tableau non vide' });
  }
  const ids = body.ids.filter((id): id is string => typeof id === 'string');
  const objectIds = ids.map(id => new mongoose.Types.ObjectId(id));
  const result = await Alumni.updateMany({ _id: { $in: objectIds } }, { isActive: false });
  return reply.send({ status: 'success', data: { updated: result.modifiedCount } });
});

// POST /alumni/bulk-delete
fastify.post('/alumni/bulk-delete', {
  schema: {
    tags: ['Alumni'],
    summary: 'Suppression en masse',
    description: '🛡️ **Admin** — Supprime définitivement plusieurs profils alumni et banni leurs comptes associés.',
    body: BulkIdsBody,
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          data: { type: 'object', properties: { deleted: { type: 'number' } } },
        },
      },
      400: ErrorResp,
    },
  },
  preHandler: requireAdmin,
}, async (request, reply) => {
  const body = request.body as { ids?: unknown };
  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return reply.status(400).send({ status: 'error', message: 'Le champ "ids" doit être un tableau non vide' });
  }
  const ids = body.ids.filter((id): id is string => typeof id === 'string');
  const objectIds = ids.map(id => new mongoose.Types.ObjectId(id));

  for (const id of ids) {
    const user = await mongoose.connection.db?.collection('user').findOne({ alumniId: id });
    if (user) {
      const betterAuthId = user.id || user._id.toString();
      try {
        await auth.api.banUser({ headers: request.headers, body: { userId: betterAuthId } });
      } catch { /* ignore if already banned */ }
    }
  }

  const result = await Alumni.deleteMany({ _id: { $in: objectIds } });
  return reply.send({ status: 'success', data: { deleted: result.deletedCount } });
});

// DELETE /admin/users/:id
fastify.delete('/admin/users/:id', {
  schema: {
    tags: ['Utilisateurs'],
    summary: 'Supprimer un compte utilisateur',
    description: '🛡️ **Admin** — Supprime définitivement le compte BetterAuth, ses sessions, ses tokens OAuth et remet le profil alumni lié en statut `unlinked`.',
    params: IdParam,
    response: {
      200: SuccessMsg,
      404: ErrorResp,
    },
  },
  preHandler: requireAdmin,
}, async (request, reply) => {
  const { id } = request.params as { id: string };

  const user = await mongoose.connection.db?.collection('user').findOne({
    $or: [{ id: id }, { _id: new mongoose.Types.ObjectId(id) }]
  });

  if (!user) {
    return reply.status(404).send({ status: 'error', message: 'Utilisateur introuvable' });
  }

  if (user.alumniId) {
    await Alumni.findByIdAndUpdate(user.alumniId, { status: 'unlinked' });
  }

  await mongoose.connection.db?.collection('user').deleteOne({
    $or: [{ id: id }, { _id: new mongoose.Types.ObjectId(id) }]
  });

  await mongoose.connection.db?.collection('session').deleteMany({ userId: user.id || user._id.toString() });
  await mongoose.connection.db?.collection('account').deleteMany({ userId: user.id || user._id.toString() });

  return reply.send({ status: 'success', message: 'Compte utilisateur supprimé avec succès' });
});

// POST /admin/users/bulk-ban
fastify.post('/admin/users/bulk-ban', {
  schema: {
    tags: ['Utilisateurs'],
    summary: 'Bannissement en masse',
    description: '🛡️ **Admin** — Banni plusieurs comptes utilisateurs en une seule requête.',
    body: BulkIdsBody,
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          data: { type: 'object', properties: { banned: { type: 'number' } } },
        },
      },
      400: ErrorResp,
    },
  },
  preHandler: requireAdmin,
}, async (request, reply) => {
  const body = request.body as { ids?: unknown };
  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return reply.status(400).send({ status: 'error', message: 'Le champ "ids" doit être un tableau non vide' });
  }
  const ids = body.ids.filter((id): id is string => typeof id === 'string');
  let banned = 0;
  for (const id of ids) {
    try {
      await auth.api.banUser({ headers: request.headers, body: { userId: id } });
      banned++;
    } catch { /* skip already banned or missing users */ }
  }
  return reply.send({ status: 'success', data: { banned } });
});

// POST /admin/users/bulk-delete
fastify.post('/admin/users/bulk-delete', {
  schema: {
    tags: ['Utilisateurs'],
    summary: 'Suppression en masse de comptes',
    description: '🛡️ **Admin** — Supprime plusieurs comptes BetterAuth et remet leurs profils alumni en statut `unlinked`.',
    body: BulkIdsBody,
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          data: { type: 'object', properties: { deleted: { type: 'number' } } },
        },
      },
      400: ErrorResp,
    },
  },
  preHandler: requireAdmin,
}, async (request, reply) => {
  const body = request.body as { ids?: unknown };
  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return reply.status(400).send({ status: 'error', message: 'Le champ "ids" doit être un tableau non vide' });
  }
  const ids = body.ids.filter((id): id is string => typeof id === 'string');

  const validObjectIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));
  const users = await mongoose.connection.db?.collection('user').find({
    $or: [{ id: { $in: ids } }, { _id: { $in: validObjectIds } }]
  }).toArray() ?? [];

  const alumniIdsToUnlink = users.filter(u => u.alumniId).map(u => u.alumniId);
  if (alumniIdsToUnlink.length > 0) {
    await Alumni.updateMany({ _id: { $in: alumniIdsToUnlink } }, { status: 'unlinked' });
  }

  const result = await mongoose.connection.db?.collection('user').deleteMany({ $or: [{ id: { $in: ids } }, { _id: { $in: validObjectIds } }] });

  const finalUserIds = users.map(u => u.id || u._id.toString());
  await mongoose.connection.db?.collection('session').deleteMany({ userId: { $in: finalUserIds } });
  await mongoose.connection.db?.collection('account').deleteMany({ userId: { $in: finalUserIds } });

  return reply.send({ status: 'success', data: { deleted: result?.deletedCount ?? 0 } });
});

// POST /alumni/import
fastify.post('/alumni/import', {
  schema: {
    tags: ['Alumni'],
    summary: 'Import en masse via CSV',
    description: '🛡️ **Admin** — Importe jusqu\'à 5 000 profils alumni depuis un tableau JSON. Les lignes en doublon (email existant) ou invalides sont comptées dans `skipped`.',
    body: {
      type: 'object',
      required: ['rows'],
      properties: {
        rows: {
          type: 'array',
          maxItems: 5000,
          description: 'Tableau de profils alumni à importer',
          items: AlumniInputBody,
        },
      },
    },
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              imported: { type: 'number' },
              skipped:  { type: 'number' },
              errors: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    row:    { type: 'number' },
                    email:  { type: 'string' },
                    reason: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
      400: ErrorResp,
    },
  },
  preHandler: requireAdmin,
}, async (request, reply) => {
  const body = request.body as { rows?: unknown[] };

  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return reply.status(400).send({ status: 'error', message: 'Le champ "rows" doit être un tableau non vide' });
  }

  if (body.rows.length > 5000) {
    return reply.status(400).send({ status: 'error', message: 'Maximum 5000 lignes par import' });
  }

  let imported = 0;
  let skipped = 0;
  const errors: Array<{ row: number; email: string; reason: string }> = [];
  const createdAlumni: Array<{ _id: string; email: string; firstName: string; lastName: string; graduationYear?: number }> = [];

  for (let i = 0; i < body.rows.length; i++) {
    const rowNum = i + 2;
    const raw = body.rows[i];
    const result = AlumniProfileSchema.safeParse(raw);

    if (!result.success) {
      skipped++;
      const email = typeof (raw as Record<string, unknown>).email === 'string'
        ? (raw as Record<string, unknown>).email as string
        : '';
      errors.push({ row: rowNum, email, reason: result.error.issues[0]?.message ?? 'Données invalides' });
      continue;
    }

    const existing = await Alumni.findOne({ email: result.data.email });
    if (existing) {
      skipped++;
      errors.push({ row: rowNum, email: result.data.email, reason: 'Email déjà existant' });
      continue;
    }

    const alumniData = { ...result.data, status: result.data.status ?? 'unlinked' };
    const saved = await new Alumni(alumniData).save();
    imported++;
    createdAlumni.push({
      _id: saved._id.toString(),
      email: saved.email,
      firstName: saved.firstName,
      lastName: saved.lastName,
      graduationYear: saved.graduationYear ?? undefined,
    });
  }

  return reply.send({ status: 'success', data: { imported, skipped, errors, createdAlumni } });
});

// ─── Start ────────────────────────────────────────────────────────────────────

const start = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    fastify.log.info('Connected to MongoDB');
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
