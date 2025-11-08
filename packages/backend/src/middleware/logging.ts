import type {FastifyInstance, FastifyRequest} from 'fastify';
import {getEnv} from '../config/env.js';

// Extend FastifyRequest to include startTime
declare module 'fastify' {
  interface FastifyRequest {
    startTime?: number;
  }
}

/**
 * List of sensitive header keys that should be redacted from logs
 */
const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'proxy-authorization',
  'x-auth-token',
  'x-csrf-token',
  'x-session-token',
  'x-access-token',
  'x-refresh-token',
]);

/**
 * Sanitizes headers by redacting sensitive values
 * @param headers - The request headers object
 * @returns A new object with sensitive headers redacted
 */
function sanitizeHeaders(
  headers: Record<string, string | string[] | undefined>
): Record<string, string | string[] | undefined> {
  const sanitized: Record<string, string | string[] | undefined> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_HEADERS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export function setupLogging(app: FastifyInstance) {
  const env = getEnv();
  const isDebugLevel = env.LOG_LEVEL === 'debug' || env.LOG_LEVEL === 'trace';

  // Request logging middleware
  app.addHook('onRequest', (request: FastifyRequest) => {
    // Store start time for response time calculation
    request.startTime = Date.now();

    const sanitizedHeaders = sanitizeHeaders(request.headers);

    // Log sanitized headers at info level
    request.log.info(
      {
        method: request.method,
        url: request.url,
        headers: sanitizedHeaders,
      },
      'Incoming request'
    );

    // Log full headers (with sensitive data) only at debug/trace level
    if (isDebugLevel) {
      request.log.debug(
        {
          method: request.method,
          url: request.url,
          headers: request.headers,
        },
        'Incoming request (full headers)'
      );
    }
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
