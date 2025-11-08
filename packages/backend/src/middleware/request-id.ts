import type {FastifyInstance, FastifyRequest, FastifyReply} from 'fastify';

/**
 * Middleware to ensure request ID is set
 */
export function setupRequestId(app: FastifyInstance) {
  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Request ID is already set by Fastify's genReqId, but we can add it to headers
    if (request.id) {
      reply.header('X-Request-ID', request.id);
    }
  });
}
