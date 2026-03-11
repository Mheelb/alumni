import type { FastifyInstance } from 'fastify';
import { JobAnnouncement } from '../models/JobAnnouncement';
import { JobInterest } from '../models/JobInterest';
import { requireAuth, requireAdmin } from '../lib/middleware';
import { JobAnnouncementSchema, JobAnnouncementUpdateSchema, JobStatusEnum, JobInterestStatusEnum } from '@alumni/shared-schema';

export async function jobAnnouncementRoutes(fastify: FastifyInstance) {
  // ─── GET /job-announcements ───────────────────────────────────────────────────
  fastify.get('/job-announcements', {
    preHandler: requireAuth,
    schema: {
      tags: ['Annonces d\'emploi'],
      summary: 'Lister les annonces d\'emploi',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const session = (request as { session?: { user?: { id?: string; role?: string } } }).session;
    const userId = session?.user?.id;
    const isAdmin = session?.user?.role === 'admin';

    const query = request.query as { status?: string };
    let filter: Record<string, unknown> = {};

    if (isAdmin && query.status) {
      filter = { status: query.status };
    } else if (!isAdmin) {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      filter = {
        $or: [
          { status: 'active' },
          { status: 'closed', updatedAt: { $gte: twoWeeksAgo } },
        ],
      };
    }

    const jobs = await JobAnnouncement.find(filter).sort({ createdAt: -1 }).lean();

    let myInterestMap = new Map<string, string>();
    if (userId) {
      const myInterests = await JobInterest.find({ userId }).lean();
      myInterestMap = new Map(myInterests.map(i => [i.jobId.toString(), i.status]));
    }

    const data = jobs.map(j => ({
      ...j,
      myInterest: myInterestMap.get(j._id.toString()) ?? null,
    }));

    return reply.send({ status: 'success', data });
  });

  // ─── GET /job-announcements/:id ───────────────────────────────────────────────
  fastify.get('/job-announcements/:id', {
    preHandler: requireAuth,
    schema: {
      tags: ['Annonces d\'emploi'],
      summary: 'Récupérer une annonce d\'emploi',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = (request as { session?: { user?: { id?: string } } }).session;
    const userId = session?.user?.id;

    const job = await JobAnnouncement.findById(id).lean();
    if (!job) return reply.status(404).send({ status: 'error', message: 'Annonce non trouvée' });

    const myInterest = userId ? await JobInterest.findOne({ jobId: id, userId }).lean() : null;

    return reply.send({
      status: 'success',
      data: { ...job, myInterest: myInterest?.status ?? null },
    });
  });

  // ─── POST /job-announcements ──────────────────────────────────────────────────
  fastify.post('/job-announcements', {
    preHandler: requireAdmin,
    schema: {
      tags: ['Annonces d\'emploi'],
      summary: 'Créer une annonce d\'emploi',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const result = JobAnnouncementSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ status: 'error', message: 'Données invalides', issues: result.error.issues });
    }

    const job = await new JobAnnouncement(result.data).save();
    return reply.status(201).send({ status: 'success', data: job });
  });

  // ─── PUT /job-announcements/:id ───────────────────────────────────────────────
  fastify.put('/job-announcements/:id', {
    preHandler: requireAdmin,
    schema: {
      tags: ['Annonces d\'emploi'],
      summary: 'Mettre à jour une annonce d\'emploi',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = JobAnnouncementUpdateSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ status: 'error', message: 'Données invalides', issues: result.error.issues });
    }

    const job = await JobAnnouncement.findByIdAndUpdate(id, result.data, { new: true }).lean();
    if (!job) return reply.status(404).send({ status: 'error', message: 'Annonce non trouvée' });

    return reply.send({ status: 'success', data: job });
  });

  // ─── PATCH /job-announcements/:id/status ──────────────────────────────────────
  fastify.patch('/job-announcements/:id/status', {
    preHandler: requireAdmin,
    schema: {
      tags: ['Annonces d\'emploi'],
      summary: 'Changer le statut d\'une annonce',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = JobStatusEnum.safeParse((request.body as { status: string }).status);
    if (!parsed.success) {
      return reply.status(400).send({ status: 'error', message: 'Statut invalide', issues: parsed.error.issues });
    }

    const job = await JobAnnouncement.findByIdAndUpdate(id, { status: parsed.data }, { new: true }).lean();
    if (!job) return reply.status(404).send({ status: 'error', message: 'Annonce non trouvée' });

    return reply.send({ status: 'success', data: job });
  });

  // ─── DELETE /job-announcements/:id ────────────────────────────────────────────
  fastify.delete('/job-announcements/:id', {
    preHandler: requireAdmin,
    schema: {
      tags: ['Annonces d\'emploi'],
      summary: 'Supprimer une annonce d\'emploi',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const job = await JobAnnouncement.findByIdAndDelete(id);
    if (!job) return reply.status(404).send({ status: 'error', message: 'Annonce non trouvée' });

    await JobInterest.deleteMany({ jobId: id });

    return reply.send({ status: 'success' });
  });

  // ─── POST /job-announcements/:id/interest ─────────────────────────────────────
  fastify.post('/job-announcements/:id/interest', {
    preHandler: requireAuth,
    schema: {
      tags: ['Annonces d\'emploi'],
      summary: 'Marquer son intérêt pour une annonce',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = (request as { session?: { user?: { id?: string } } }).session;
    const userId = session?.user?.id;

    if (!userId) return reply.status(401).send({ status: 'error', message: 'Non authentifié' });

    const parsed = JobInterestStatusEnum.safeParse((request.body as { status: string }).status);
    if (!parsed.success) {
      return reply.status(400).send({ status: 'error', message: 'Statut invalide', issues: parsed.error.issues });
    }

    const job = await JobAnnouncement.findById(id).lean();
    if (!job) return reply.status(404).send({ status: 'error', message: 'Annonce non trouvée' });

    const record = await JobInterest.findOneAndUpdate(
      { jobId: id, userId },
      { status: parsed.data },
      { upsert: true, new: true },
    );

    return reply.send({ status: 'success', data: record });
  });
}
