import {describe, it, expect} from 'vitest';
import {buildMinimalTestApp} from '../../test/helpers/app';
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
} from '../../lib/errors';
import {z} from 'zod';

describe('Error Handler Middleware', () => {
  describe('ZodError handling', () => {
    it('should return 400 for Zod validation errors', async () => {
      const app = await buildMinimalTestApp();
      app.get('/test-zod-error', async () => {
        const schema = z.object({name: z.string().min(5)});
        // Parse will throw ZodError, which Fastify will catch and pass to error handler
        schema.parse({name: 'ab'});
      });
      await app.ready();

      const response = await app.inject({
        method: 'GET',
        url: '/test-zod-error',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.details).toBeDefined();
      expect(Array.isArray(body.error.details)).toBe(true);
    });
  });

  describe('NotFoundError handling', () => {
    it('should return 404 for NotFoundError', async () => {
      const app = await buildMinimalTestApp();
      app.get('/test-not-found', async () => {
        throw new NotFoundError('Resource not found');
      });
      await app.ready();

      const response = await app.inject({
        method: 'GET',
        url: '/test-not-found',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('NOT_FOUND');
      expect(body.error.message).toBe('Resource not found');
      expect(body.error.requestId).toBeDefined();
    });
  });

  describe('ValidationError handling', () => {
    it('should return 400 for ValidationError', async () => {
      const app = await buildMinimalTestApp();
      app.get('/test-validation', async () => {
        throw new ValidationError('Invalid input', {field: 'email'});
      });
      await app.ready();

      const response = await app.inject({
        method: 'GET',
        url: '/test-validation',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toBe('Invalid input');
      expect(body.error.details).toEqual({field: 'email'});
    });
  });

  describe('ConflictError handling', () => {
    it('should return 409 for ConflictError', async () => {
      const app = await buildMinimalTestApp();
      app.get('/test-conflict', async () => {
        throw new ConflictError('Resource already exists');
      });
      await app.ready();

      const response = await app.inject({
        method: 'GET',
        url: '/test-conflict',
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('CONFLICT');
      expect(body.error.message).toBe('Resource already exists');
    });
  });

  describe('UnauthorizedError handling', () => {
    it('should return 401 for UnauthorizedError', async () => {
      const app = await buildMinimalTestApp();
      app.get('/test-unauthorized', async () => {
        throw new UnauthorizedError('Invalid token');
      });
      await app.ready();

      const response = await app.inject({
        method: 'GET',
        url: '/test-unauthorized',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toBe('Invalid token');
    });
  });

  describe('ForbiddenError handling', () => {
    it('should return 403 for ForbiddenError', async () => {
      const app = await buildMinimalTestApp();
      app.get('/test-forbidden', async () => {
        throw new ForbiddenError('Insufficient permissions');
      });
      await app.ready();

      const response = await app.inject({
        method: 'GET',
        url: '/test-forbidden',
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('FORBIDDEN');
      expect(body.error.message).toBe('Insufficient permissions');
    });
  });

  describe('Generic error handling', () => {
    it('should return 500 for unexpected errors in test mode', async () => {
      const app = await buildMinimalTestApp();
      app.get('/test-generic-error', async () => {
        throw new Error('Unexpected error');
      });
      await app.ready();

      const response = await app.inject({
        method: 'GET',
        url: '/test-generic-error',
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
      // In test mode, error message should be visible
      expect(body.error.message).toBe('Unexpected error');
    });
  });
});
