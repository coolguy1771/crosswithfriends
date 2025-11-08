import type {FastifyInstance, FastifyPluginOptions} from 'fastify';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {GameId, CreateGameEvent} from '@crosswithfriends/shared';
import {GameEventRepository, PuzzleRepository} from '../../../repositories';
import {GameService} from '../../../services';
import {NotFoundError} from '../../../lib/errors.js';

const createGameSchema = z.object({
  gid: z.string().optional(),
  pid: z.string(),
});

const gameParamsSchema = z.object({
  gid: z.string().min(1),
});

export default function gamesRouter(app: FastifyInstance, _options: FastifyPluginOptions) {
  // Initialize services
  const gameEventRepo = new GameEventRepository();
  const puzzleRepo = new PuzzleRepository();
  const gameService = new GameService(gameEventRepo, puzzleRepo);

  // POST /api/v1/games - Create game session
  app.post<{
    Body: z.infer<typeof createGameSchema>;
  }>('/', async (request, reply) => {
    const validated = createGameSchema.parse(request.body);
    const result = await gameService.createGame({
      pid: validated.pid,
      gid: validated.gid ?? randomUUID(),
    });
    return reply.status(201).send(result);
  });

  // GET /api/v1/games/:gid - Get game info
  app.get<{Params: z.infer<typeof gameParamsSchema>}>('/:gid', async (request, reply) => {
    const {gid} = gameParamsSchema.parse(request.params);
    const events = await gameService.getGameEvents(gid as GameId);

    if (events.length === 0) {
      throw new NotFoundError(`Game ${gid} not found`);
    }

    // Get create event for basic info
    const createEvent = events.find((e): e is CreateGameEvent => e.type === 'create');
    if (!createEvent) {
      throw new NotFoundError(`Game ${gid} not found`);
    }

    return reply.send({
      gid,
      pid: createEvent.params.pid,
      info: createEvent.params.game.info,
    });
  });

  // GET /api/v1/games/:gid/state - Get current game state
  app.get<{Params: z.infer<typeof gameParamsSchema>}>('/:gid/state', async (_request, reply) => {
    const {gid} = gameParamsSchema.parse(_request.params);
    const state = await gameService.getGameState(gid as GameId);

    if (!state) {
      throw new NotFoundError(`Game ${gid} not found`);
    }

    return reply.send({state});
  });
}
