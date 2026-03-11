import Fastify from 'fastify'
import type { FastifyRequest, FastifyReply } from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import mongoose from 'mongoose'
import { Alumni } from '../../models/Alumni'
import { AlumniProfileSchema, AlumniUpdateSchema } from '@alumni/shared-schema'

// Middleware no-op : simule un utilisateur admin authentifié
export const mockAdmin = async (_req: FastifyRequest, _reply: FastifyReply) => {}

export async function buildApp() {
  const app = Fastify({ logger: false })

  await app.register(helmet)
  await app.register(cors, { origin: '*', credentials: true })

  // GET /health
  app.get('/health', async () => ({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  }))

  // GET /alumni
  app.get('/alumni', { preHandler: mockAdmin }, async (_req, reply) => {
    const alumni = await Alumni.find({ isActive: true }).lean()
    return reply.send({ status: 'success', data: { alumni, total: alumni.length } })
  })

  // POST /alumni
  app.post('/alumni', { preHandler: mockAdmin }, async (req, reply) => {
    const result = AlumniProfileSchema.safeParse(req.body)
    if (!result.success) {
      return reply.status(400).send({ status: 'error', issues: result.error.issues })
    }
    const existing = await Alumni.findOne({ email: result.data.email })
    if (existing) {
      return reply.status(409).send({ status: 'error', message: 'Email déjà existant' })
    }
    const alumni = await new Alumni({ ...result.data, status: 'unlinked' }).save()
    return reply.status(201).send({ status: 'success', data: alumni })
  })

  // PUT /alumni/:id
  app.put('/alumni/:id', { preHandler: mockAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const result = AlumniUpdateSchema.safeParse(req.body)
    if (!result.success) {
      return reply.status(400).send({ status: 'error', issues: result.error.issues })
    }
    const alumni = await Alumni.findByIdAndUpdate(id, result.data, { new: true }).lean()
    if (!alumni) return reply.status(404).send({ status: 'error', message: 'Profil introuvable' })
    return reply.send({ status: 'success', data: alumni })
  })

  // PATCH /alumni/:id/deactivate
  app.patch('/alumni/:id/deactivate', { preHandler: mockAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const alumni = await Alumni.findByIdAndUpdate(id, { isActive: false }, { new: true }).lean()
    if (!alumni) return reply.status(404).send({ status: 'error', message: 'Profil introuvable' })
    return reply.send({ status: 'success', data: alumni })
  })

  // DELETE /alumni/:id
  app.delete('/alumni/:id', { preHandler: mockAdmin }, async (req, reply) => {
    const { id } = req.params as { id: string }
    const alumni = await Alumni.findByIdAndDelete(id).lean()
    if (!alumni) return reply.status(404).send({ status: 'error', message: 'Profil introuvable' })
    return reply.send({ status: 'success', message: 'Profil supprimé' })
  })

  await app.ready()
  return app
}
