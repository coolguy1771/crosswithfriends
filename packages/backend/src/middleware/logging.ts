import type {FastifyInstance, FastifyRequest} from 'fastify';

// Extend FastifyRequest to include startTime
declare module 'fastify' {
  interface FastifyRequest {
    startTime?: number;
  }
}

export function setupLogging(app: FastifyInstance) {
  // Request logging middleware
  app.addHook('onRequest', (request: FastifyRequest) => {
    // Store start time for response time calculation
    request.startTime = Date.now();

    request.log.info(
      {
        method: request.method,
        url: request.url,
        headers: request.headers,
      },
      'Incoming request'
    );
  });

  // Response logging middleware
  app.addHook('onResponse', async (request: FastifyRequest, reply) => {
    const responseTime = request.startTime ? Date.now() - request.startTime : undefined;

    request.log.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: responseTime ? `${responseTime}ms` : undefined,
      },
      'Request completed'
    );
  });
}
