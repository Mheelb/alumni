import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import mongoose from 'mongoose';
import { Alumni } from './models/Alumni';

const fastify = Fastify({ logger: true });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/alumni';

fastify.register(helmet);
fastify.register(cors);

fastify.get('/health', async () => {
  return { 
    status: 'ok',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  };
});

fastify.get('/seed', async () => {
  const sampleAlumni = new Alumni({
    firstName: 'John',
    lastName: 'Doe',
    email: `john.doe.${Date.now()}@example.com`,
    graduationYear: 2024
  });
  await sampleAlumni.save();
  return { message: 'Sample alumni created!', data: sampleAlumni };
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
