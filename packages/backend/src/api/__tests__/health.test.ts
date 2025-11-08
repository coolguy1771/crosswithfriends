import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {getTestApp} from '../../test/helpers/app';
import type {FastifyInstance} from 'fastify';

describe('Health Check Endpoints', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await getTestApp();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /health', () => {
    it('should return 200 with ok status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toEqual({status: 'ok'});
    });
  });

  describe('GET /ready', () => {
    it('should return 200 when database is ready', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/ready',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toEqual({status: 'ready'});
    });
  });
});
