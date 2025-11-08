import type {FastifyInstance, FastifyError, FastifyRequest, FastifyReply} from 'fastify';
import {ZodError} from 'zod';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
} from '../lib/errors.js';
import {getEnv} from '../config/env.js';

export function setupErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError | Error, request: FastifyRequest, reply: FastifyReply) => {
    const requestId = request.id;

    // Log error
    request.log.error(
      {
        err: error,
        requestId,
        method: request.method,
        url: request.url,
      },
      'Request error'
    );

    // Handle Zod validation errors
    // Check both direct instance and wrapped error (Fastify may wrap errors)
    let zodError: ZodError | null = null;
    if (error instanceof ZodError) {
      zodError = error;
    } else {
      const cause = (error as {cause?: unknown}).cause;
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (cause instanceof ZodError) {
        zodError = cause;
      }
    }
    if (zodError) {
      const details = 'errors' in zodError ? zodError.errors : 'issues' in zodError ? zodError.issues : [];
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details,
          requestId,
        },
      });
    }

    // Handle custom application errors
    if (error instanceof NotFoundError) {
      return reply.status(404).send({
        error: {
          code: 'NOT_FOUND',
          message: error.message,
          requestId,
        },
      });
    }

    if (error instanceof ValidationError) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
          details: error.details,
          requestId,
        },
      });
    }

    if (error instanceof ConflictError) {
      return reply.status(409).send({
        error: {
          code: 'CONFLICT',
          message: error.message,
          requestId,
        },
      });
    }

    if (error instanceof UnauthorizedError) {
      return reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: error.message,
          requestId,
        },
      });
    }

    if (error instanceof ForbiddenError) {
      return reply.status(403).send({
        error: {
          code: 'FORBIDDEN',
          message: error.message,
          requestId,
        },
      });
    }

    // Handle Fastify errors with statusCode
    const fastifyError = error as FastifyError;
    if (fastifyError.statusCode) {
      return reply.status(fastifyError.statusCode).send({
        error: {
          code: fastifyError.code || 'APPLICATION_ERROR',
          message: fastifyError.message,
          requestId,
        },
      });
    }

    // Handle unexpected errors
    const statusCode = fastifyError.statusCode ?? 500;
    const env = getEnv();
    const isProduction = env.NODE_ENV === 'production';
    return reply.status(statusCode).send({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: isProduction ? 'Internal server error' : error.message,
        requestId,
      },
    });
  });
}
