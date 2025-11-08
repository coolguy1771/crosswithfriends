import Fastify from 'fastify';
import type {FastifyInstance} from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type {Server as HTTPServer} from 'http';
import {getEnv} from './config/env.js';
import {getDatabase} from './config/database.js';
import {getRedisClient} from './config/redis.js';
import {sql} from 'drizzle-orm';
import {setupLogging} from './middleware/logging.js';
import {setupErrorHandler} from './middleware/error-handler.js';
import {setupRequestId} from './middleware/request-id.js';
import {setupRoutes} from './api/router.js';
import {SocketManager} from './websocket/socket-manager.js';
import {GameEventRepository, RoomEventRepository} from './repositories';
import {GameService, RoomService} from './services';
import {PuzzleRepository} from './repositories';

export async function buildApp(): Promise<{app: FastifyInstance; socketManager: SocketManager}> {
  const env = getEnv();

  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      ...(env.NODE_ENV === 'development'
        ? {
            transport: {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            },
          }
        : {}),
    },
    requestIdLogLabel: 'requestId',
    genReqId: () => crypto.randomUUID(),
  });

  // Register plugins
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  });

  await app.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    credentials: true,
  });

  // Configure rate limiting with Redis store if available, otherwise in-memory
  const rateLimitConfig: Parameters<typeof rateLimit>[1] = {
    max: 100,
    timeWindow: '1 minute',
  };

  if (env.REDIS_URL) {
    try {
      const redis = getRedisClient();
      // @fastify/rate-limit supports redis option with ioredis client
      rateLimitConfig.redis = redis;
      rateLimitConfig.nameSpace = 'rate-limit';
      app.log.info('Rate limiting configured with Redis store');
    } catch (error) {
      app.log.warn({error}, 'Failed to configure Redis for rate limiting, using in-memory store');
    }
  } else {
    app.log.info('Rate limiting configured with in-memory store (not suitable for horizontal scaling)');
  }

  await app.register(rateLimit, rateLimitConfig);

  // Setup middleware
  setupLogging(app);
  setupErrorHandler(app);
  setupRequestId(app);

  // Register routes
  await app.register(setupRoutes, {prefix: '/api/v1'});

  // Health check endpoints
  app.get('/health', () => {
    return {status: 'ok'};
  });

  app.get('/ready', async (request, reply) => {
    try {
      // Check database connection
      const db = getDatabase();
      await db.execute(sql`SELECT 1`);
      return {status: 'ready'};
    } catch (error) {
      request.log.error({error}, 'Readiness check failed');
      return reply.status(503).send({status: 'unready', error: 'Database connection failed'});
    }
  });

  // Initialize Socket.IO
  await app.ready();
  const httpServer = app.server as unknown as HTTPServer;

  // Initialize repositories and services for Socket.IO
  const gameEventRepo = new GameEventRepository();
  const roomEventRepo = new RoomEventRepository();
  const puzzleRepo = new PuzzleRepository();
  const gameService = new GameService(gameEventRepo, puzzleRepo);
  const roomService = new RoomService(roomEventRepo);

  const socketManager = new SocketManager(httpServer, gameEventRepo, roomEventRepo, gameService, roomService);

  socketManager.listen();

  return {app, socketManager};
}
