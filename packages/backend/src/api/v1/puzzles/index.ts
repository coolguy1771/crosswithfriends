import type {FastifyInstance, FastifyPluginOptions} from 'fastify';
import {z} from 'zod';
import type {InfoJson, PuzzleJson} from '@crosswithfriends/shared';
import {PuzzleRepository} from '../../../repositories';
import {PuzzleService} from '../../../services';

// Zod schemas for validation
const puzzleContentSchema = z.object({
  grid: z.array(z.array(z.string())),
  solution: z.array(z.array(z.string())),
  info: z.object({
    type: z.string().optional(),
    title: z.string(),
    author: z.string(),
    copyright: z.string().optional(),
    description: z.string().optional(),
  }),
  circles: z.array(z.string()).optional(),
  shades: z.array(z.string()).optional(),
  clues: z.object({
    across: z.array(z.string()),
    down: z.array(z.string()),
  }),
  private: z.boolean().optional(),
});

const addPuzzleSchema = z.object({
  puzzle: puzzleContentSchema,
  pid: z.string().optional(),
  isPublic: z.boolean(),
});

const updatePuzzleSchema = z.object({
  content: puzzleContentSchema.optional(),
  isPublic: z.boolean().optional(),
});

const listPuzzlesSchema = z.object({
  filter: z.object({
    sizeFilter: z.object({
      Mini: z.boolean(),
      Standard: z.boolean(),
    }),
    nameOrTitleFilter: z.string(),
  }),
  page: z.coerce.number().int().positive(),
  pageSize: z.coerce.number().int().positive().max(100),
});

export default function puzzlesRouter(app: FastifyInstance, _options: FastifyPluginOptions) {
  // Initialize services
  const puzzleRepo = new PuzzleRepository();
  const puzzleService = new PuzzleService(puzzleRepo);

  // Type for parsed query parameters
  type ParsedQuery = {
    page?: string | number;
    pageSize?: string | number;
    filter?: {
      sizeFilter?: {
        Mini?: string | boolean;
        Standard?: string | boolean;
      };
      nameOrTitleFilter?: string;
    };
    [key: string]: unknown;
  };

  // GET /api/v1/puzzles - List puzzles
  app.get<{
    Querystring: Record<string, unknown>;
  }>('/', async (request, reply) => {
    // Parse nested query parameters from flat format
    // Frontend sends: filter[sizeFilter][Mini]=true, filter[sizeFilter][Standard]=true, etc.
    const query = request.query;

    // Check if Fastify already parsed it as nested object, or if it's flat
    let parsedQuery: ParsedQuery;

    if (query.filter && typeof query.filter === 'object') {
      // Already parsed as nested object
      parsedQuery = query;
    } else {
      // Parse from flat format
      parsedQuery = {
        page: query.page ? Number(query.page) : 1,
        pageSize: query.pageSize ? Number(query.pageSize) : 20,
        filter: {
          sizeFilter: {
            Mini: query['filter[sizeFilter][Mini]'] === 'true' || query['filter[sizeFilter][Mini]'] === true,
            Standard:
              query['filter[sizeFilter][Standard]'] === 'true' ||
              query['filter[sizeFilter][Standard]'] === true,
          },
          nameOrTitleFilter: (query['filter[nameOrTitleFilter]'] as string) || '',
        },
      };
    }

    const validated = listPuzzlesSchema.parse(parsedQuery);
    const result = await puzzleService.listPuzzles(validated);
    return reply.send(result);
  });

  // GET /api/v1/puzzles/:pid - Get puzzle by ID
  app.get<{Params: {pid: string}}>('/:pid', async (request, reply) => {
    const {pid} = request.params;
    const puzzle = await puzzleService.getPuzzle(pid);

    if (!puzzle) {
      return reply.status(404).send({
        error: {
          code: 'PUZZLE_NOT_FOUND',
          message: `Puzzle ${pid} not found`,
          requestId: request.id,
        },
      });
    }

    return reply.send({puzzle});
  });

  // POST /api/v1/puzzles - Create puzzle
  app.post<{
    Body: z.infer<typeof addPuzzleSchema>;
  }>('/', async (request, reply) => {
    const validated = addPuzzleSchema.parse(request.body);
    // Build info object excluding undefined values to satisfy exactOptionalPropertyTypes
    const info: InfoJson = {
      title: validated.puzzle.info.title,
      author: validated.puzzle.info.author,
      copyright: validated.puzzle.info.copyright ?? '',
      description: validated.puzzle.info.description ?? '',
      ...(validated.puzzle.info.type !== undefined ? {type: validated.puzzle.info.type} : {}),
    };
    // Build puzzle object ensuring circles and shades are always arrays
    const puzzle: PuzzleJson = {
      grid: validated.puzzle.grid,
      solution: validated.puzzle.solution,
      info,
      circles: validated.puzzle.circles ?? [],
      shades: validated.puzzle.shades ?? [],
      clues: validated.puzzle.clues,
      ...(validated.puzzle.private !== undefined ? {private: validated.puzzle.private} : {}),
    };
    const result = await puzzleService.createPuzzle({
      puzzle,
      ...(validated.pid !== undefined ? {pid: validated.pid} : {}),
      isPublic: validated.isPublic,
    });
    return reply.status(201).send(result);
  });

  // PUT /api/v1/puzzles/:pid - Update puzzle
  app.put<{
    Params: {pid: string};
    Body: z.infer<typeof updatePuzzleSchema>;
  }>('/:pid', async (request, reply) => {
    const {pid} = request.params;

    // Validate request body before accessing nested properties
    const parseResult = updatePuzzleSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parseResult.error.issues,
          requestId: request.id,
        },
      });
    }

    const validated = parseResult.data;
    const updates: Partial<{content: PuzzleJson; isPublic: boolean}> = {};

    if (validated.content !== undefined) {
      // Build info object excluding undefined values to satisfy exactOptionalPropertyTypes
      const info: InfoJson = {
        title: validated.content.info.title,
        author: validated.content.info.author,
        copyright: validated.content.info.copyright ?? '',
        description: validated.content.info.description ?? '',
        ...(validated.content.info.type !== undefined ? {type: validated.content.info.type} : {}),
      };
      // Build puzzle content ensuring circles and shades are always arrays
      const content: PuzzleJson = {
        grid: validated.content.grid,
        solution: validated.content.solution,
        info,
        circles: validated.content.circles ?? [],
        shades: validated.content.shades ?? [],
        clues: validated.content.clues,
        ...(validated.content.private !== undefined ? {private: validated.content.private} : {}),
      };
      updates.content = content;
    }
    if (validated.isPublic !== undefined) {
      updates.isPublic = validated.isPublic;
    }

    const success = await puzzleService.updatePuzzle(pid, updates);

    if (!success) {
      return reply.status(404).send({
        error: {
          code: 'PUZZLE_NOT_FOUND',
          message: `Puzzle ${pid} not found`,
          requestId: request.id,
        },
      });
    }

    return reply.send({success: true});
  });

  // DELETE /api/v1/puzzles/:pid - Delete puzzle
  app.delete<{Params: {pid: string}}>('/:pid', async (request, reply) => {
    const {pid} = request.params;
    const success = await puzzleService.deletePuzzle(pid);

    if (!success) {
      return reply.status(404).send({
        error: {
          code: 'PUZZLE_NOT_FOUND',
          message: `Puzzle ${pid} not found`,
          requestId: request.id,
        },
      });
    }

    return reply.send({success: true});
  });
}
