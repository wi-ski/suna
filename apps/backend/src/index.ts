import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { config } from 'dotenv';
import { DBConnection } from '@suna/agentpress';
import { agentRoutes } from './routes/agent.js';
import { sandboxRoutes } from './routes/sandbox.js';
import { healthRoutes } from './routes/health.js';

// Load environment variables
config();

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true
      }
    }
  }
});

// Register plugins
await fastify.register(cors, {
  origin: true,
  credentials: true
});

await fastify.register(multipart);

// Initialize database connection
const db = DBConnection.getInstance();
await db.initialize();

// Register routes
await fastify.register(healthRoutes, { prefix: '/api' });
await fastify.register(agentRoutes, { prefix: '/api' });
await fastify.register(sandboxRoutes, { prefix: '/api' });

// Global error handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  reply.status(500).send({
    error: 'Internal Server Error',
    message: error.message,
    statusCode: 500
  });
});

// Health check endpoint
fastify.get('/api/health', async (request, reply) => {
  try {
    const dbHealthy = await db.testConnection();
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbHealthy ? 'connected' : 'disconnected',
      version: '1.0.0'
    };
  } catch (error) {
    reply.status(500);
    return {
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '8000');
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    fastify.log.info();
    fastify.log.info('📋 Available endpoints:');
    fastify.log.info('   GET  /api/health - Health check');
    fastify.log.info('   POST /api/agent/run - Run agent');
    fastify.log.info('   GET  /api/sandbox/status - Sandbox status');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  fastify.log.info('Received SIGINT, shutting down gracefully...');
  await fastify.close();
  await db.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  fastify.log.info('Received SIGTERM, shutting down gracefully...');
  await fastify.close();
  await db.close();
  process.exit(0);
});

start();
