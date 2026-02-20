import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import mongoose from 'mongoose';
import { Alumni } from './models/Alumni';
import { auth } from './lib/auth';
import { AlumniProfileSchema, AlumniUpdateSchema } from '@alumni/shared-schema';
import { scraperRoutes } from './routes/scraper';
import { dashboardRoutes } from './routes/dashboard';
import { requireAdmin, requireAuth } from './lib/middleware';

const fastify = Fastify({ logger: true, bodyLimit: 5 * 1024 * 1024 });
const BASE_URL = process.env.BETTER_AUTH_BASE_URL || 'http://localhost:3000';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/alumni';

fastify.register(helmet);
fastify.register(cors, {
  origin: process.env.WEB_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});

fastify.register(scraperRoutes);
fastify.register(dashboardRoutes);

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
        body: { userId: betterAuthId }
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

// GET /alumni/me — must be before /alumni/:id
fastify.get('/alumni/me', { preHandler: requireAuth }, async (request: any, reply) => {
  const email = request.session?.user?.email
  if (!email) {
    return reply.status(401).send({ status: 'error', message: 'Non authentifié' })
  }
  const alumni = await Alumni.findOne({ email, isActive: true }).lean()
  if (!alumni) {
    return reply.status(404).send({ status: 'error', message: 'Profil introuvable' })
  }
  return reply.send({ status: 'success', data: alumni })
})

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
    status: result.data.status || 'unlinked'
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

// GET /stats
fastify.get('/stats', { preHandler: requireAdmin }, async (_request, reply) => {
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
  ])

  const byStatus = { unlinked: 0, invited: 0, registered: 0 }
  for (const row of byStatusRaw) {
    if (row._id === 'unlinked') byStatus.unlinked = row.count
    else if (row._id === 'invited') byStatus.invited = row.count
    else if (row._id === 'registered') byStatus.registered = row.count
  }

  const activationRate = total > 0 ? Math.round((byStatus.registered / total) * 100) : 0

  return reply.send({
    status: 'success',
    data: { total, byStatus, activationRate, recentAlumni },
  })
})

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
fastify.post('/alumni/bulk-deactivate', { preHandler: requireAdmin }, async (request, reply) => {
  const body = request.body as { ids?: unknown }
  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return reply.status(400).send({ status: 'error', message: 'Le champ "ids" doit être un tableau non vide' })
  }
  const ids = body.ids.filter((id): id is string => typeof id === 'string')
  const objectIds = ids.map(id => new mongoose.Types.ObjectId(id))
  const result = await Alumni.updateMany({ _id: { $in: objectIds } }, { isActive: false })
  return reply.send({ status: 'success', data: { updated: result.modifiedCount } })
})

// POST /alumni/bulk-delete
fastify.post('/alumni/bulk-delete', { preHandler: requireAdmin }, async (request, reply) => {
  const body = request.body as { ids?: unknown }
  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return reply.status(400).send({ status: 'error', message: 'Le champ "ids" doit être un tableau non vide' })
  }
  const ids = body.ids.filter((id): id is string => typeof id === 'string')
  const objectIds = ids.map(id => new mongoose.Types.ObjectId(id))

  // Ban associated auth users
  for (const id of ids) {
    const user = await mongoose.connection.db?.collection('user').findOne({ alumniId: id })
    if (user) {
      const betterAuthId = user.id || user._id.toString()
      try {
        await auth.api.banUser({ headers: request.headers, body: { userId: betterAuthId } })
      } catch { /* ignore if already banned */ }
    }
  }

  const result = await Alumni.deleteMany({ _id: { $in: objectIds } })
  return reply.send({ status: 'success', data: { deleted: result.deletedCount } })
})

// DELETE /admin/users/:id
fastify.delete('/admin/users/:id', { preHandler: requireAdmin }, async (request, reply) => {
  const { id } = request.params as { id: string };
  
  const user = await mongoose.connection.db?.collection('user').findOne({ 
    $or: [{ id: id }, { _id: new mongoose.Types.ObjectId(id) }] 
  });

  if (!user) {
    return reply.status(404).send({ status: 'error', message: 'Utilisateur introuvable' });
  }

  // If user has an alumniId, set the alumni status back to 'unlinked'
  if (user.alumniId) {
    await Alumni.findByIdAndUpdate(user.alumniId, { status: 'unlinked' });
  }

  await mongoose.connection.db?.collection('user').deleteOne({ 
    $or: [{ id: id }, { _id: new mongoose.Types.ObjectId(id) }] 
  });
  
  // Also delete associated sessions and accounts (BetterAuth structure)
  await mongoose.connection.db?.collection('session').deleteMany({ userId: user.id || user._id.toString() });
  await mongoose.connection.db?.collection('account').deleteMany({ userId: user.id || user._id.toString() });

  return reply.send({ status: 'success', message: 'Compte utilisateur supprimé avec succès' });
});

// POST /admin/users/bulk-ban
fastify.post('/admin/users/bulk-ban', { preHandler: requireAdmin }, async (request, reply) => {
  const body = request.body as { ids?: unknown }
  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return reply.status(400).send({ status: 'error', message: 'Le champ "ids" doit être un tableau non vide' })
  }
  const ids = body.ids.filter((id): id is string => typeof id === 'string')
  let banned = 0
  for (const id of ids) {
    try {
      await auth.api.banUser({ headers: request.headers, body: { userId: id } })
      banned++
    } catch { /* skip already banned or missing users */ }
  }
  return reply.send({ status: 'success', data: { banned } })
})

// POST /admin/users/bulk-delete
fastify.post('/admin/users/bulk-delete', { preHandler: requireAdmin }, async (request, reply) => {
  const body = request.body as { ids?: unknown }
  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return reply.status(400).send({ status: 'error', message: 'Le champ "ids" doit être un tableau non vide' })
  }
  const ids = body.ids.filter((id): id is string => typeof id === 'string')
  
  // Find users being deleted to unlink their alumni profiles
  const validObjectIds = ids.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id))
  const users = await mongoose.connection.db?.collection('user').find({
    $or: [{ id: { $in: ids } }, { _id: { $in: validObjectIds } }]
  }).toArray() ?? []

  const alumniIdsToUnlink = users.filter(u => u.alumniId).map(u => u.alumniId)
  if (alumniIdsToUnlink.length > 0) {
    await Alumni.updateMany({ _id: { $in: alumniIdsToUnlink } }, { status: 'unlinked' })
  }

  const result = await mongoose.connection.db?.collection('user').deleteMany({ $or: [{ id: { $in: ids } }, { _id: { $in: validObjectIds } }] })
  
  // Cleanup sessions and accounts
  const finalUserIds = users.map(u => u.id || u._id.toString())
  await mongoose.connection.db?.collection('session').deleteMany({ userId: { $in: finalUserIds } })
  await mongoose.connection.db?.collection('account').deleteMany({ userId: { $in: finalUserIds } })
  
  return reply.send({ status: 'success', data: { deleted: result?.deletedCount ?? 0 } })
})

// POST /alumni/import
fastify.post('/alumni/import', { preHandler: requireAdmin }, async (request, reply) => {
  const body = request.body as { rows?: unknown[] }

  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return reply.status(400).send({ status: 'error', message: 'Le champ "rows" doit être un tableau non vide' })
  }

  if (body.rows.length > 5000) {
    return reply.status(400).send({ status: 'error', message: 'Maximum 5000 lignes par import' })
  }

  let imported = 0
  let skipped = 0
  const errors: Array<{ row: number; email: string; reason: string }> = []
  const createdAlumni: Array<{ _id: string; email: string; firstName: string; lastName: string; graduationYear?: number }> = []

  for (let i = 0; i < body.rows.length; i++) {
    const rowNum = i + 2 // +2 : 1-indexed + header line
    const raw = body.rows[i]
    const result = AlumniProfileSchema.safeParse(raw)

    if (!result.success) {
      skipped++
      const email = typeof (raw as Record<string, unknown>).email === 'string'
        ? (raw as Record<string, unknown>).email as string
        : ''
      errors.push({ row: rowNum, email, reason: result.error.issues[0]?.message ?? 'Données invalides' })
      continue
    }

    const existing = await Alumni.findOne({ email: result.data.email })
    if (existing) {
      skipped++
      errors.push({ row: rowNum, email: result.data.email, reason: 'Email déjà existant' })
      continue
    }

    const alumniData = { ...result.data, status: result.data.status ?? 'unlinked' }
    const saved = await new Alumni(alumniData).save()
    imported++
    createdAlumni.push({
      _id: saved._id.toString(),
      email: saved.email,
      firstName: saved.firstName,
      lastName: saved.lastName,
      graduationYear: saved.graduationYear ?? undefined,
    })
  }

  return reply.send({ status: 'success', data: { imported, skipped, errors, createdAlumni } })
})

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
