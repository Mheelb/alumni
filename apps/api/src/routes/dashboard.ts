import { FastifyInstance } from 'fastify';
import { Alumni } from '../models/Alumni';
import { requireAdmin } from '../lib/middleware';

const FREELANCE_PATTERN = 'freelance|self.?employed|independant|auto.?entrepreneur|autoentrepreneur';
const FREELANCE_OPTIONS = 'i';

export async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.get('/dashboard/stats', { preHandler: requireAdmin }, async (_request, reply) => {
    const baseMatch = { isActive: true };

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
      },
    });
  });
}
