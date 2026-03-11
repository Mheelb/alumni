import type { FastifyInstance } from 'fastify';
import { Event } from '../models/Event';
import { EventAttendance } from '../models/EventAttendance';
import { requireAuth, requireAdmin } from '../lib/middleware';
import { EventSchema, EventUpdateSchema, AttendanceStatusEnum } from '@alumni/shared-schema';

function computeEventStatus(startDate: Date, endDate: Date): 'upcoming' | 'ongoing' | 'past' {
  const now = new Date();
  if (startDate > now) return 'upcoming';
  if (endDate < now) return 'past';
  return 'ongoing';
}

export async function eventRoutes(fastify: FastifyInstance) {
  // ─── GET /events ─────────────────────────────────────────────────────────────
  fastify.get('/events', {
    preHandler: requireAuth,
    schema: {
      tags: ['Événements'],
      summary: 'Lister les événements',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const session = (request as { session?: { user?: { id?: string } } }).session;
    const userId = session?.user?.id;

    const events = await Event.find().sort({ startDate: 1 }).lean();

    const attendanceCounts = await EventAttendance.aggregate<{
      _id: string;
      going: number;
      interested: number;
    }>([
      { $match: { eventId: { $in: events.map(e => e._id) } } },
      {
        $group: {
          _id: '$eventId',
          going: { $sum: { $cond: [{ $eq: ['$status', 'going'] }, 1, 0] } },
          interested: { $sum: { $cond: [{ $eq: ['$status', 'interested'] }, 1, 0] } },
        },
      },
    ]);

    const countsMap = new Map(attendanceCounts.map(a => [a._id.toString(), a]));

    let myAttendanceMap = new Map<string, string>();
    if (userId) {
      const myAttendances = await EventAttendance.find({ userId }).lean();
      myAttendanceMap = new Map(myAttendances.map(a => [a.eventId.toString(), a.status]));
    }

    const data = events.map(e => {
      const counts = countsMap.get(e._id.toString());
      return {
        ...e,
        status: computeEventStatus(e.startDate, e.endDate),
        attendanceCounts: { going: counts?.going ?? 0, interested: counts?.interested ?? 0 },
        myAttendance: myAttendanceMap.get(e._id.toString()) ?? null,
      };
    });

    return reply.send({ status: 'success', data });
  });

  // ─── GET /events/:id ──────────────────────────────────────────────────────────
  fastify.get('/events/:id', {
    preHandler: requireAuth,
    schema: {
      tags: ['Événements'],
      summary: 'Récupérer un événement',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = (request as { session?: { user?: { id?: string } } }).session;
    const userId = session?.user?.id;

    const event = await Event.findById(id).lean();
    if (!event) return reply.status(404).send({ status: 'error', message: 'Événement non trouvé' });

    const [counts, myRecord] = await Promise.all([
      EventAttendance.aggregate<{ going: number; interested: number }>([
        { $match: { eventId: event._id } },
        {
          $group: {
            _id: null,
            going: { $sum: { $cond: [{ $eq: ['$status', 'going'] }, 1, 0] } },
            interested: { $sum: { $cond: [{ $eq: ['$status', 'interested'] }, 1, 0] } },
          },
        },
      ]),
      userId ? EventAttendance.findOne({ eventId: id, userId }).lean() : null,
    ]);

    return reply.send({
      status: 'success',
      data: {
        ...event,
        status: computeEventStatus(event.startDate, event.endDate),
        attendanceCounts: { going: counts[0]?.going ?? 0, interested: counts[0]?.interested ?? 0 },
        myAttendance: myRecord?.status ?? null,
      },
    });
  });

  // ─── POST /events ─────────────────────────────────────────────────────────────
  fastify.post('/events', {
    preHandler: requireAdmin,
    schema: {
      tags: ['Événements'],
      summary: 'Créer un événement',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const result = EventSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ status: 'error', message: 'Données invalides', issues: result.error.issues });
    }

    const event = await new Event({
      ...result.data,
      startDate: new Date(result.data.startDate),
      endDate: new Date(result.data.endDate),
    }).save();

    return reply.status(201).send({ status: 'success', data: event });
  });

  // ─── PUT /events/:id ──────────────────────────────────────────────────────────
  fastify.put('/events/:id', {
    preHandler: requireAdmin,
    schema: {
      tags: ['Événements'],
      summary: 'Mettre à jour un événement',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = EventUpdateSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ status: 'error', message: 'Données invalides', issues: result.error.issues });
    }

    const update: Record<string, unknown> = { ...result.data };
    if (result.data.startDate) update.startDate = new Date(result.data.startDate);
    if (result.data.endDate) update.endDate = new Date(result.data.endDate);

    const event = await Event.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!event) return reply.status(404).send({ status: 'error', message: 'Événement non trouvé' });

    return reply.send({ status: 'success', data: event });
  });

  // ─── DELETE /events/:id ───────────────────────────────────────────────────────
  fastify.delete('/events/:id', {
    preHandler: requireAdmin,
    schema: {
      tags: ['Événements'],
      summary: 'Supprimer un événement',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const event = await Event.findByIdAndDelete(id);
    if (!event) return reply.status(404).send({ status: 'error', message: 'Événement non trouvé' });

    await EventAttendance.deleteMany({ eventId: id });

    return reply.send({ status: 'success' });
  });

  // ─── POST /events/:id/attendance ──────────────────────────────────────────────
  fastify.post('/events/:id/attendance', {
    preHandler: requireAuth,
    schema: {
      tags: ['Événements'],
      summary: 'Marquer sa participation à un événement',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = (request as { session?: { user?: { id?: string } } }).session;
    const userId = session?.user?.id;

    if (!userId) return reply.status(401).send({ status: 'error', message: 'Non authentifié' });

    const parsed = AttendanceStatusEnum.safeParse((request.body as { status: string }).status);
    if (!parsed.success) {
      return reply.status(400).send({ status: 'error', message: 'Statut invalide', issues: parsed.error.issues });
    }

    const event = await Event.findById(id).lean();
    if (!event) return reply.status(404).send({ status: 'error', message: 'Événement non trouvé' });

    const record = await EventAttendance.findOneAndUpdate(
      { eventId: id, userId },
      { status: parsed.data },
      { upsert: true, new: true },
    );

    return reply.send({ status: 'success', data: record });
  });

  // ─── GET /events/:id/attendance ───────────────────────────────────────────────
  fastify.get('/events/:id/attendance', {
    preHandler: requireAdmin,
    schema: {
      tags: ['Événements'],
      summary: 'Lister les participants d\'un événement',
      security: [{ cookieAuth: [] }],
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const attendances = await EventAttendance.find({ eventId: id }).lean();
    return reply.send({ status: 'success', data: attendances });
  });
}
