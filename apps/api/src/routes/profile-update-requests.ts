import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { requireAuth, requireAdmin } from '../lib/middleware';
import { ProfileUpdateRequest } from '../models/ProfileUpdateRequest';
import { Alumni } from '../models/Alumni';
import { User } from '../models/User'; 
import { ProfileUpdateRequestSchema } from '@alumni/shared-schema';
import mongoose from 'mongoose';

export async function profileUpdateRequestRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  
  // Créer une demande (accessible par tout utilisateur connecté)
  fastify.post('/profile-update-requests', { preHandler: requireAuth }, async (request: any, reply) => {
    const userId = request.session.user.id;
    const body = { ...request.body, userId, status: 'pending' };
    
    const result = ProfileUpdateRequestSchema.safeParse(body);
    if (!result.success) {
      return reply.status(400).send({
        status: 'error',
        message: 'Données invalides',
        issues: result.error.issues,
      });
    }

    const requestDoc = new ProfileUpdateRequest(result.data);
    await requestDoc.save();

    return reply.status(201).send({ status: 'success', data: requestDoc });
  });

  // Liste des demandes (Admin seulement)
  fastify.get('/profile-update-requests', { preHandler: requireAdmin }, async (request: any, reply) => {
    const { status, search, date } = request.query as { status?: string; search?: string; date?: string };
    const query: any = {};
    
    if (status) query.status = status;
    
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    if (search) {
      // Find matching alumni first
      const alumniSearchRe = new RegExp(search, 'i');
      const matchingAlumni = await Alumni.find({
        $or: [
          { firstName: alumniSearchRe },
          { lastName: alumniSearchRe },
          { email: alumniSearchRe }
        ]
      }).select('_id').lean();
      
      const matchingAlumniIds = matchingAlumni.map(a => a._id);
      query.alumniId = { $in: matchingAlumniIds };
    }

    const requests = await ProfileUpdateRequest.find(query)
      .populate({ path: 'alumniId', model: Alumni, select: 'firstName lastName email' })
      .populate({ path: 'userId', model: User, select: 'name email' })
      .sort({ createdAt: -1 })
      .lean();

    return { status: 'success', data: requests };
  });

  // Détail d'une demande (Admin seulement)
  fastify.get('/profile-update-requests/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const requestDoc = await ProfileUpdateRequest.findById(id)
      .populate({ path: 'alumniId', model: Alumni })
      .populate({ path: 'userId', model: User, select: 'name email' })
      .lean();

    if (!requestDoc) {
      return reply.status(404).send({ status: 'error', message: 'Demande introuvable' });
    }

    return { status: 'success', data: requestDoc };
  });

  // Accepter une demande (Admin seulement)
  fastify.patch('/profile-update-requests/:id/accept', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const requestDoc = await ProfileUpdateRequest.findById(id);

    if (!requestDoc) {
      return reply.status(404).send({ status: 'error', message: 'Demande introuvable' });
    }

    if (requestDoc.status !== 'pending') {
      return reply.status(400).send({ status: 'error', message: 'Cette demande a déjà été traitée' });
    }

    // Mettre à jour le profil alumni
    const alumni = await Alumni.findByIdAndUpdate(requestDoc.alumniId, requestDoc.changes, { new: true });
    
    if (!alumni) {
      return reply.status(404).send({ status: 'error', message: 'Profil alumni introuvable' });
    }

    // Marquer la demande comme acceptée
    requestDoc.status = 'accepted';
    await requestDoc.save();

    return { status: 'success', message: 'Demande acceptée et profil mis à jour', data: alumni };
  });

  // Refuser une demande (Admin seulement)
  fastify.patch('/profile-update-requests/:id/refuse', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const requestDoc = await ProfileUpdateRequest.findById(id);

    if (!requestDoc) {
      return reply.status(404).send({ status: 'error', message: 'Demande introuvable' });
    }

    if (requestDoc.status !== 'pending') {
      return reply.status(400).send({ status: 'error', message: 'Cette demande a déjà été traitée' });
    }

    // Marquer la demande comme refusée
    requestDoc.status = 'refused';
    await requestDoc.save();

    return { status: 'success', message: 'Demande refusée' };
  });
}
