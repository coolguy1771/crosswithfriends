import type {FastifyInstance, FastifyPluginOptions} from 'fastify';
import {z} from 'zod';
import {PuzzleSolveRepository, PuzzleRepository, GameEventRepository} from '../../../repositories';
import {SolveService} from '../../../services';

const recordSolveSchema = z.object({
  gid: z.string().min(1),
  time_to_solve: z.number().int().positive(),
});

const solveParamsSchema = z.object({
  pid: z.string().min(1),
});

export default function solvesRouter(app: FastifyInstance, _options: FastifyPluginOptions) {
  // Initialize services
  const solveRepo = new PuzzleSolveRepository();
  const puzzleRepo = new PuzzleRepository();
  const gameEventRepo = new GameEventRepository();
  const solveService = new SolveService(solveRepo, puzzleRepo, gameEventRepo);

  // POST /api/v1/solves/:pid - Record solve
  app.post<{
    Params: z.infer<typeof solveParamsSchema>;
    Body: z.infer<typeof recordSolveSchema>;
  }>('/:pid', async (request, reply) => {
    const {pid} = solveParamsSchema.parse(request.params);
    const validated = recordSolveSchema.parse(request.body);

    await solveService.recordSolve(pid, validated);
    return reply.status(201).send({});
  });

  // GET /api/v1/solves - List solves (filtered)
  app.get<{
    Querystring: {
      pid?: string;
      gid?: string;
    };
  }>('/', async (_request, reply) => {
    // TODO: Implement list solves with filtering
    return reply.status(501).send({error: 'Not implemented'});
  });

  // GET /api/v1/solves/stats - Aggregate statistics
  app.get('/stats', async (_request, reply) => {
    // TODO: Implement stats endpoint
    return reply.status(501).send({error: 'Not implemented'});
  });
}
