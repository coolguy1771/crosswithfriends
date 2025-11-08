import type {FastifyInstance, FastifyPluginOptions} from 'fastify';
import puzzlesRouter from './v1/puzzles';
import gamesRouter from './v1/games';
import solvesRouter from './v1/solves';
import roomsRouter from './v1/rooms';
import oembedRouter from './v1/oembed';
import linkPreviewRouter from './v1/link-preview';

export async function setupRoutes(app: FastifyInstance, _options: FastifyPluginOptions) {
  // Register route modules
  await app.register(puzzlesRouter, {prefix: '/puzzles'});
  await app.register(gamesRouter, {prefix: '/games'});
  await app.register(solvesRouter, {prefix: '/solves'});
  await app.register(roomsRouter, {prefix: '/rooms'});
  await app.register(oembedRouter, {prefix: '/oembed'});
  await app.register(linkPreviewRouter, {prefix: '/link-preview'});
}
