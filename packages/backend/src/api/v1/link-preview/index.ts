import type {FastifyInstance, FastifyPluginOptions} from 'fastify';
import {z} from 'zod';
import type {CreateGameEvent} from '@crosswithfriends/shared';
import {GameEventRepository, PuzzleRepository} from '../../../repositories';
import {GameService} from '../../../services';

const linkPreviewQuerySchema = z.object({
  url: z.string().url(),
});

/**
 * Type guard to validate that an unknown value is a CreateGameEvent
 * with the required structure for link preview (title and author).
 */
function isCreateGameEventWithInfo(value: unknown): value is CreateGameEvent {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const event = value as Record<string, unknown>;

  // Check type is 'create'
  if (event.type !== 'create') {
    return false;
  }

  // Check params exists and is an object
  if (!event.params || typeof event.params !== 'object') {
    return false;
  }

  const params = event.params as Record<string, unknown>;

  // Check game exists and is an object
  if (!params.game || typeof params.game !== 'object') {
    return false;
  }

  const game = params.game as Record<string, unknown>;

  // Check info exists and is an object
  if (!game.info || typeof game.info !== 'object') {
    return false;
  }

  const info = game.info as Record<string, unknown>;

  // Check title and author are strings
  if (typeof info.title !== 'string' || typeof info.author !== 'string') {
    return false;
  }

  return true;
}

export default function linkPreviewRouter(app: FastifyInstance, _options: FastifyPluginOptions) {
  const gameEventRepo = new GameEventRepository();
  const puzzleRepo = new PuzzleRepository();
  const gameService = new GameService(gameEventRepo, puzzleRepo);

  // GET /api/v1/link-preview - Link preview endpoint
  app.get<{
    Querystring: z.infer<typeof linkPreviewQuerySchema>;
  }>('/', async (request, reply) => {
    const validated = linkPreviewQuerySchema.parse(request.query);
    const url = new URL(validated.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    let info: {title?: string; author?: string} | null = null;

    if (pathParts[0] === 'game' && pathParts[1]) {
      const gid = pathParts[1];
      const events = await gameService.getGameEvents(gid);
      const createEvent = events.find(isCreateGameEventWithInfo);
      if (createEvent) {
        info = {
          title: createEvent.params.game.info.title,
          author: createEvent.params.game.info.author,
        };
      }
    } else if (pathParts[0] === 'play' && pathParts[1]) {
      const pid = pathParts[1];
      const puzzle = await puzzleRepo.findByPid(pid);
      if (puzzle) {
        info = {
          title: puzzle.info.title,
          author: puzzle.info.author,
        };
      }
    }

    if (!info || Object.keys(info).length === 0) {
      return reply.status(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Game or puzzle not found',
          requestId: request.id,
        },
      });
    }

    const userAgent = request.headers['user-agent'] ?? '';
    const isLinkExpanderBot = userAgent.includes('linkexpander');
    const isFBMessengerCrawler = userAgent.includes('facebookexternalhit');

    if (isLinkExpanderBot || isFBMessengerCrawler) {
      return reply.send({
        title: info.title,
        author: info.author,
      });
    }

    return reply.send(info);
  });
}
