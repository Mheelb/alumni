import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { extractProfileData } from '../services/scraper';
import { Alumni } from '../models/Alumni';
import { requireAdmin } from '../lib/middleware';

const ExtractSchema = z.object({
  url: z.string().url(),
});

export async function scraperRoutes(fastify: FastifyInstance) {

  // Extract data from URL (for form pre-fill)
  fastify.post('/scraper/extract', {
    preHandler: requireAdmin,
    schema: {
      tags: ['Scraper'],
      summary: 'Extraire des données LinkedIn',
      description: 'Scrape un profil LinkedIn et retourne les données extraites pour pré-remplir un formulaire.',
      security: [{ cookieAuth: [] }],
      body: {
        type: 'object',
        required: ['url'],
        properties: {
          url: { type: 'string', format: 'uri', description: 'URL du profil LinkedIn' },
        },
      },
      response: {
        200: {
          description: 'Données extraites avec succès',
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            data: {
              type: 'object',
              properties: {
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                jobTitle: { type: 'string' },
                company: { type: 'string' },
                city: { type: 'string' },
                avatarUrl: { type: 'string' },
              },
            },
          },
        },
        400: { description: 'URL invalide', type: 'object', properties: { message: { type: 'string' } } },
        500: { description: 'Erreur de scraping', type: 'object', properties: { message: { type: 'string' }, error: { type: 'string' } } },
      },
    },
  }, async (request, reply) => {
    const body = ExtractSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({ message: 'Invalid URL' });
    }

    try {
      const data = await extractProfileData(body.data.url);
      return reply.send({ status: 'success', data });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ message: 'Failed to scrape profile', error: String(error) });
    }
  });

  // Sync specific alumni (for bulk update loop)
  fastify.post('/scraper/sync/:id', {
    preHandler: requireAdmin,
    schema: {
      tags: ['Scraper'],
      summary: 'Synchroniser un alumni depuis LinkedIn',
      description: 'Scrape le profil LinkedIn d\'un alumni et met à jour ses données en base.',
      security: [{ cookieAuth: [] }],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Identifiant MongoDB de l\'alumni' },
        },
      },
      response: {
        200: {
          description: 'Synchronisation réussie',
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            data: { type: 'object', description: 'Document alumni mis à jour' },
          },
        },
        400: { description: 'Pas d\'URL LinkedIn', type: 'object', properties: { message: { type: 'string' } } },
        404: { description: 'Alumni introuvable', type: 'object', properties: { message: { type: 'string' } } },
        500: { description: 'Erreur de synchronisation', type: 'object', properties: { message: { type: 'string' }, error: { type: 'string' } } },
      },
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    
    try {
      const alumni = await Alumni.findById(id);
      if (!alumni) {
        return reply.status(404).send({ message: 'Alumni not found' });
      }

      if (!alumni.linkedinUrl) {
        return reply.status(400).send({ message: 'No LinkedIn URL for this alumni' });
      }

      const data = await extractProfileData(alumni.linkedinUrl);
      
      // Update fields if found
      if (data.firstName) alumni.firstName = data.firstName;
      if (data.lastName) alumni.lastName = data.lastName;
      if (data.jobTitle) alumni.jobTitle = data.jobTitle;
      if (data.company) alumni.company = data.company;
      if (data.city) alumni.city = data.city;
      if (data.avatarUrl) alumni.avatarUrl = data.avatarUrl;

      await alumni.save();

      return reply.send({ status: 'success', data: alumni });
    } catch (error) {
      request.log.error(error);
      return reply.status(500).send({ message: 'Sync failed', error: String(error) });
    }
  });
}
