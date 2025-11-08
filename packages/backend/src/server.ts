import {buildApp} from './app.js';
import {getEnv} from './config/env.js';
import {closeDatabase} from './config/database.js';
import {runMigrations} from './config/migrate.js';
import type {FastifyInstance} from 'fastify';
import type {SocketManager} from './websocket/socket-manager.js';

let app: FastifyInstance | null = null;
let socketManager: SocketManager | null = null;

async function start() {
  const env = getEnv();

  // Run migrations before starting the server
  try {
    await runMigrations();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Migration failed, exiting:', message);
    if (err instanceof Error && err.stack) {
      console.error('Stack:', err.stack);
    }
    process.exit(1);
  }

  const built = await buildApp();
  app = built.app;
  socketManager = built.socketManager;

  try {
    await app.listen({port: env.PORT, host: '0.0.0.0'});
    app.log.info(`Server listening on port ${env.PORT}`);
    app.log.info('Socket.IO server initialized');
  } catch (err: unknown) {
    app.log.error({err}, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
const shutdown = async (signal: string) => {
  if (app) {
    app.log.info(`Received ${signal}, shutting down gracefully...`);
    try {
      // Close Socket.IO server
      if (socketManager) {
        void socketManager.getIO().close();
      }
      // Close Fastify app
      await app.close();
      // Close database connections
      await closeDatabase();
      app.log.info('Shutdown complete');
    } catch (err: unknown) {
      app.log.error({err}, 'Error during shutdown');
    }
  }
  process.exit(0);
};

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

void start();
