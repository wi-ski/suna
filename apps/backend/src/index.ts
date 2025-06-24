import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { agentRoutes } from './routes/agent.js';
import { toolRoutes } from './routes/tools.js';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
});

// Register plugins
await fastify.register(cors, {
  origin: true,
  credentials: true
});

await fastify.register(multipart);

// Health check
fastify.get('/health', async (request, reply) => {
  return { 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    implementation: 'TypeScript'
  };
});

// Register routes
await fastify.register(agentRoutes, { prefix: '/api/agent' });
await fastify.register(toolRoutes, { prefix: '/api' });

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '8000');
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    console.log();
    console.log();
    console.log();
    console.log();
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
