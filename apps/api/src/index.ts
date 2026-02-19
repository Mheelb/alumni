import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import mongoose from 'mongoose';
import { Alumni } from './models/Alumni';
import { auth } from './lib/auth';

const fastify = Fastify({ logger: true });
const BASE_URL = process.env.BETTER_AUTH_BASE_URL || 'http://localhost:3000';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/alumni';

fastify.register(helmet);
fastify.register(cors, {
  origin: process.env.WEB_URL || 'http://localhost:5173',
  credentials: true,
});

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
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  };
});

fastify.get('/alumni/:id', async (request, reply) => {
  try {
    const { id } = request.params as { id: string };
    const alumni = await Alumni.findById(id);
    if (!alumni) {
      return reply.status(404).send({ message: 'Alumni not found' });
    }
    return alumni;
  } catch (err: any) {
    fastify.log.error(err);
    return reply.status(400).send({ message: 'Invalid ID format' });
  }
});

fastify.get('/users/check-email/:email', async (request, reply) => {
  try {
    const { email } = request.params as { email: string };
    const user = await mongoose.connection.db?.collection('user').findOne({ email });
    return { exists: !!user };
  } catch (err) {
    return { exists: false };
  }
});

fastify.post('/alumni', async (request, reply) => {
  try {
    const alumni = new Alumni(request.body as any);
    await alumni.save();
    return { message: 'Alumni created successfully!', data: alumni };
  } catch (err: any) {
    fastify.log.error(err);
    return reply.status(400).send({ message: err.message });
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
