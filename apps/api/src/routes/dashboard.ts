import type { FastifyInstance } from 'fastify';
import { Alumni } from '../models/Alumni';
import { Event } from '../models/Event';
import { JobAnnouncement } from '../models/JobAnnouncement';
import { requireAdmin } from '../lib/middleware';

const FREELANCE_PATTERN = 'freelance|self.?employed|independant|auto.?entrepreneur|autoentrepreneur';
const FREELANCE_OPTIONS = 'i';

export async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.get('/dashboard/stats', {
    preHandler: requireAdmin,
    schema: {
      tags: ['Statistiques'],
      summary: 'Statistiques du tableau de bord',
      description: 'Retourne les statistiques agrégées des alumni actifs : totaux, répartitions par statut, promotion, ville, entreprise, diplôme et évolution des inscriptions.',
      security: [{ cookieAuth: [] }],
      response: {
        200: {
          description: 'Statistiques récupérées avec succès',
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            data: {
              type: 'object',
              properties: {
                total: { type: 'number', description: 'Nombre total d\'alumni actifs' },
                byStatus: {
                  type: 'object',
                  properties: {
                    unlinked: { type: 'number' },
                    invited: { type: 'number' },
                    registered: { type: 'number' },
                  },
                },
                activationRate: { type: 'number', description: 'Taux d\'activation (%)' },
                employmentRate: { type: 'number', description: 'Taux d\'emploi (%)' },
                freelanceRate: { type: 'number', description: 'Taux de freelance (%)' },
                byGraduationYear: {
                  type: 'array',
                  items: { type: 'object', properties: { year: { type: 'number' }, count: { type: 'number' } } },
                },
                byCity: {
                  type: 'array',
                  items: { type: 'object', properties: { city: { type: 'string' }, count: { type: 'number' } } },
                },
                byCompany: {
                  type: 'array',
                  items: { type: 'object', properties: { company: { type: 'string' }, count: { type: 'number' } } },
                },
                byDiploma: {
                  type: 'array',
                  items: { type: 'object', properties: { diploma: { type: 'string' }, count: { type: 'number' } } },
                },
                byCreatedYear: {
                  type: 'array',
                  items: { type: 'object', properties: { year: { type: 'number' }, count: { type: 'number' } } },
                },
                recentAlumni: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      firstName: { type: 'string' },
                      lastName: { type: 'string' },
                      email: { type: 'string' },
                      status: { type: 'string' },
                      createdAt: { type: 'string', format: 'date-time' },
                    },
                  },
                },
                events: {
                  type: 'object',
                  properties: {
                    total: { type: 'number' },
                    upcoming: { type: 'number' },
                    ongoing: { type: 'number' },
                    past: { type: 'number' },
                    byMonth: {
                      type: 'array',
                      items: { type: 'object', properties: { month: { type: 'string' }, count: { type: 'number' } } },
                    },
                  },
                },
                jobs: {
                  type: 'object',
                  properties: {
                    total: { type: 'number' },
                    byStatus: {
                      type: 'object',
                      properties: {
                        draft: { type: 'number' },
                        active: { type: 'number' },
                        closed: { type: 'number' },
                      },
                    },
                    byType: {
                      type: 'array',
                      items: { type: 'object', properties: { type: { type: 'string' }, count: { type: 'number' } } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, async (_request, reply) => {
    const baseMatch = { isActive: true };

    const now = new Date();

    const [
      total,
      byStatusRaw,
      byGraduationYearRaw,
      byCityRaw,
      byCompanyRaw,
      byDiplomaRaw,
      byCreatedYearRaw,
      employedCount,
      freelanceCount,
      recentAlumni,
      eventsTotal,
      eventsUpcoming,
      eventsOngoing,
      eventsPast,
      eventsByMonth,
      jobsTotal,
      jobsByStatusRaw,
      jobsByType,
    ] = await Promise.all([
      Alumni.countDocuments(baseMatch),

      Alumni.aggregate<{ _id: string; count: number }>([
        { $match: baseMatch },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      Alumni.aggregate<{ year: number; count: number }>([
        { $match: { ...baseMatch, graduationYear: { $exists: true, $ne: null } } },
        { $group: { _id: '$graduationYear', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { year: '$_id', count: 1, _id: 0 } },
      ]),

      Alumni.aggregate<{ city: string; count: number }>([
        { $match: { ...baseMatch, city: { $exists: true, $nin: [null, ''] } } },
        { $group: { _id: '$city', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { city: '$_id', count: 1, _id: 0 } },
      ]),

      Alumni.aggregate<{ company: string; count: number }>([
        { $match: { ...baseMatch, company: { $exists: true, $nin: [null, ''] } } },
        { $group: { _id: '$company', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { company: '$_id', count: 1, _id: 0 } },
      ]),

      Alumni.aggregate<{ diploma: string; count: number }>([
        { $match: { ...baseMatch, diploma: { $exists: true, $nin: [null, ''] } } },
        { $group: { _id: '$diploma', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $project: { diploma: '$_id', count: 1, _id: 0 } },
      ]),

      Alumni.aggregate<{ year: number; count: number }>([
        { $match: baseMatch },
        { $group: { _id: { $year: '$createdAt' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { year: '$_id', count: 1, _id: 0 } },
      ]),

      Alumni.countDocuments({
        ...baseMatch,
        company: { $exists: true, $nin: [null, ''] },
        jobTitle: { $exists: true, $nin: [null, ''] },
      }),

      Alumni.countDocuments({
        ...baseMatch,
        $or: [
          { company: { $regex: FREELANCE_PATTERN, $options: FREELANCE_OPTIONS } },
          { jobTitle: { $regex: FREELANCE_PATTERN, $options: FREELANCE_OPTIONS } },
        ],
      }),

      Alumni.find(baseMatch)
        .sort({ createdAt: -1 })
        .limit(5)
        .select('firstName lastName email status createdAt')
        .lean(),

      Event.countDocuments({}),
      Event.countDocuments({ startDate: { $gt: now } }),
      Event.countDocuments({ startDate: { $lte: now }, endDate: { $gte: now } }),
      Event.countDocuments({ endDate: { $lt: now } }),
      Event.aggregate<{ month: string; count: number }>([
        { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$startDate' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { month: '$_id', count: 1, _id: 0 } },
      ]),

      JobAnnouncement.countDocuments({}),
      JobAnnouncement.aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      JobAnnouncement.aggregate<{ type: string; count: number }>([
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $project: { type: '$_id', count: 1, _id: 0 } },
      ]),
    ]);

    const byStatus = { unlinked: 0, invited: 0, registered: 0 };
    for (const row of byStatusRaw) {
      if (row._id === 'unlinked') byStatus.unlinked = row.count;
      else if (row._id === 'invited') byStatus.invited = row.count;
      else if (row._id === 'registered') byStatus.registered = row.count;
    }

    const activationRate = total > 0 ? Math.round((byStatus.registered / total) * 100) : 0;
    const employmentRate = total > 0 ? Math.round((employedCount / total) * 100) : 0;
    const freelanceRate = total > 0 ? Math.round((freelanceCount / total) * 100) : 0;

    const jobsByStatus = { draft: 0, active: 0, closed: 0 };
    for (const row of jobsByStatusRaw) {
      if (row._id === 'draft') jobsByStatus.draft = row.count;
      else if (row._id === 'active') jobsByStatus.active = row.count;
      else if (row._id === 'closed') jobsByStatus.closed = row.count;
    }

    return reply.send({
      status: 'success',
      data: {
        total,
        byStatus,
        activationRate,
        employmentRate,
        freelanceRate,
        byGraduationYear: byGraduationYearRaw,
        byCity: byCityRaw,
        byCompany: byCompanyRaw,
        byDiploma: byDiplomaRaw,
        byCreatedYear: byCreatedYearRaw,
        recentAlumni,
        events: {
          total: eventsTotal,
          upcoming: eventsUpcoming,
          ongoing: eventsOngoing,
          past: eventsPast,
          byMonth: eventsByMonth,
        },
        jobs: {
          total: jobsTotal,
          byStatus: jobsByStatus,
          byType: jobsByType,
        },
      },
    });
  });
}
