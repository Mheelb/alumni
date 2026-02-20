import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import mongoose from 'mongoose';
import { Alumni } from './models/Alumni';
import { auth } from './lib/auth';
import { AlumniProfileSchema, AlumniUpdateSchema } from '@alumni/shared-schema';

const fastify = Fastify({ logger: true });
const BASE_URL = process.env.BETTER_AUTH_BASE_URL || 'http://localhost:3000';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/alumni';

fastify.register(helmet);
fastify.register(cors, {
  origin: process.env.WEB_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});

// Helper to get session from request
async function getSession(request: any) {
  try {
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (value) {
        if (Array.isArray(value)) {
          headers.set(key, value.join(', '));
        } else {
          headers.set(key, String(value));
        }
      }
    }
    
    // BetterAuth expect standard Request object for its helpers sometimes
    // But auth.api.getSession usually takes headers directly
    const session = await auth.api.getSession({
      headers: headers,
    });
    return session;
  } catch (error) {
    fastify.log.error('Error in getSession:');
    fastify.log.error(error);
    return null;
  }
}

// Middleware: Require Logged In
const requireAuth = async (request: any, reply: any) => {
  const session = await getSession(request);
  if (!session) {
    return reply.status(401).send({ status: 'error', message: 'Non authentifié' });
  }
  request.session = session;
};

// Middleware: Require Admin
const requireAdmin = async (request: any, reply: any) => {
  const session = await getSession(request);
  if (!session) {
    return reply.status(401).send({ status: 'error', message: 'Non authentifié' });
  }
  if (session.user.role !== 'admin') {
    return reply.status(403).send({ status: 'error', message: 'Accès refusé : Administrateur uniquement' });
  }
  request.session = session;
};

// BetterAuth handler
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

fastify.get('/health', async () => {
  return {
    status: 'ok',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  };
});

// fastify.get('/alumni/:id', async (request, reply) => {
//   try {
//     const { id } = request.params as { id: string };
//     const alumni = await Alumni.findById(id);
//     if (!alumni) {
//       return reply.status(404).send({ message: 'Alumni not found' });
//     }
//     return alumni;
//   } catch (err: any) {
//     fastify.log.error(err);
//     return reply.status(400).send({ message: 'Invalid ID format' });
//   }
// });

fastify.get('/users/check-email/:email', async (request, reply) => {
  try {
    const { email } = request.params as { email: string };
    const user = await mongoose.connection.db?.collection('user').findOne({ email });
    return { exists: !!user };
  } catch (err) {
    return { exists: false };
  }
});

// Admin: List all users
fastify.get('/admin/users', { preHandler: requireAdmin }, async (request, reply) => {
  try {
    const query = request.query as Record<string, string | undefined>;
    const filter: Record<string, any> = {};

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
    // Return users with their ban status from better-auth
    return { status: 'success', data: users };
  } catch (err) {
    fastify.log.error(err);
    return reply.status(500).send({ status: 'error', message: 'Erreur lors de la récupération des utilisateurs' });
  }
});

// Admin: Toggle user status (Active/Inactive)
fastify.patch('/admin/users/:id/toggle-status', { preHandler: requireAdmin }, async (request, reply) => {
  try {
    const { id } = request.params as { id: string };
    
    // Better-Auth usually uses a string 'id' field. 
    // We search by 'id' OR '_id' (converting to ObjectId if valid)
    const query: any = { $or: [{ id: id }] };
    if (mongoose.Types.ObjectId.isValid(id)) {
      query.$or.push({ _id: new mongoose.Types.ObjectId(id) });
    }

    const user = await mongoose.connection.db?.collection('user').findOne(query);
    
    if (!user) {
      return reply.status(404).send({ status: 'error', message: 'Utilisateur introuvable' });
    }

    // Better-Auth uses the 'id' field for its internal API calls
    const betterAuthId = user.id || user._id.toString();
    const isBanned = !!user.banned || !!(user as any).isBanned;

    if (isBanned) {
      await auth.api.unbanUser({
        headers: request.headers, // Pass request headers to maintain context
        body: { userId: betterAuthId }
      });
      return { status: 'success', message: 'Compte réactivé avec succès' };
    } else {
      await auth.api.banUser({
        headers: request.headers,
        body: { 
          userId: betterAuthId,
          reason: "Désactivé par l'administrateur" 
        }
      });
      return { status: 'success', message: 'Compte désactivé avec succès' };
    }
  } catch (err) {
    fastify.log.error(err);
    return reply.status(500).send({ status: 'error', message: 'Erreur lors du changement de statut du compte' });
  }
});
// Helper: build filter query from query params
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

// GET /alumni/export — must be declared BEFORE /alumni/:id
fastify.get('/alumni/export', { preHandler: requireAdmin }, async (request, reply) => {
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
  return reply.send('\uFEFF' + csv); // BOM for Excel compatibility
});

// GET /alumni
fastify.get('/alumni', { preHandler: requireAuth }, async (request, reply) => {
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

// GET /alumni/:id
fastify.get('/alumni/:id', { preHandler: requireAuth }, async (request, reply) => {
  const { id } = request.params as { id: string };
  const alumni = await Alumni.findById(id).lean();
  if (!alumni) {
    return reply.status(404).send({ status: 'error', message: 'Profil introuvable' });
  }
  return reply.send({ status: 'success', data: alumni });
});

// POST /alumni
fastify.post('/alumni', { preHandler: requireAdmin }, async (request, reply) => {
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

  const alumniData = {
    ...result.data,
    status: result.data.status || 'invited'
  };

  const alumni = new Alumni(alumniData);
  await alumni.save();
  return reply.status(201).send({ status: 'success', data: alumni });
});

// PUT /alumni/:id
fastify.put('/alumni/:id', { preHandler: requireAdmin }, async (request, reply) => {
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
fastify.patch('/alumni/:id/deactivate', { preHandler: requireAdmin }, async (request, reply) => {
  const { id } = request.params as { id: string };
  const alumni = await Alumni.findByIdAndUpdate(id, { isActive: false }, { new: true }).lean();
  if (!alumni) {
    return reply.status(404).send({ status: 'error', message: 'Profil introuvable' });
  }
  return reply.send({ status: 'success', data: alumni });
});

// DELETE /alumni/:id
fastify.delete('/alumni/:id', { preHandler: requireAdmin }, async (request, reply) => {
  const { id } = request.params as { id: string };

  try {
    // Find the user associated with this alumni profile
    const user = await mongoose.connection.db?.collection('user').findOne({ alumniId: id });
    
    if (user) {
      // Ban the associated user account
      const betterAuthId = user.id || user._id.toString();
      await auth.api.banUser({
        headers: request.headers,
        body: { 
          userId: betterAuthId,
          reason: "Profil alumni supprimé par l'administrateur" 
        }
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
