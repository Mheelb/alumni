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
    preHandler: requireAdmin
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
    preHandler: requireAdmin
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
