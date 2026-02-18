import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import mongoose from 'mongoose';

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
