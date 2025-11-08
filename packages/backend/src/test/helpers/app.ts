import type {FastifyInstance} from 'fastify';
import Fastify from 'fastify';
import {buildApp} from '../../app';
import {setupErrorHandler} from '../../middleware/error-handler';

/**
 * Build a minimal test Fastify app for error handler testing
 * This creates a fresh app that hasn't been ready()'d yet, so routes can be added
 */
export async function buildMinimalTestApp(): Promise<FastifyInstance> {
  // Override NODE_ENV to test
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';

  try {
    const app = Fastify({
      logger: false, // Disable logging for error tests
    });

    // Setup error handler (this is what we're testing)
    setupErrorHandler(app);

    // Don't call app.ready() - let the test do it after adding routes
    return await Promise.resolve(app);
  } finally {
    if (originalEnv) {
      process.env.NODE_ENV = originalEnv;
    }
  }
}

/**
 * Build a test Fastify app without Socket.IO
 * Useful for API endpoint testing
 */
export async function buildTestApp(): Promise<FastifyInstance> {
  // Override NODE_ENV to test
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests

  try {
    const {app} = await buildApp();
    // App is already ready from buildApp(), return it
    return app;
  } finally {
    if (originalEnv) {
      process.env.NODE_ENV = originalEnv;
    }
  }
}

/**
 * Build a test app and return it ready for supertest
 */
export async function getTestApp(): Promise<FastifyInstance> {
  const app = await buildTestApp();
  // App is already ready from buildApp()
  return app;
}
