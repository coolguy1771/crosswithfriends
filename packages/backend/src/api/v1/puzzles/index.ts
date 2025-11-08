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

/**
 * Builds a PuzzleJson from validated puzzle content.
 * Handles optional fields and provides defaults for circles/shades and copyright/description.
 */
function buildPuzzleJson(validatedContent: z.infer<typeof puzzleContentSchema>): PuzzleJson {
  // Build info object excluding undefined values to satisfy exactOptionalPropertyTypes
  const info: InfoJson = {
    title: validatedContent.info.title,
    author: validatedContent.info.author,
    copyright: validatedContent.info.copyright ?? '',
    description: validatedContent.info.description ?? '',
    ...(validatedContent.info.type !== undefined ? {type: validatedContent.info.type} : {}),
  };
  // Build puzzle object ensuring circles and shades are always arrays
  const puzzle: PuzzleJson = {
    grid: validatedContent.grid,
    solution: validatedContent.solution,
    info,
    circles: validatedContent.circles ?? [],
    shades: validatedContent.shades ?? [],
    clues: validatedContent.clues,
    ...(validatedContent.private !== undefined ? {private: validatedContent.private} : {}),
  };
  return puzzle;
}

export default function puzzlesRouter(app: FastifyInstance, _options: FastifyPluginOptions) {
  // Initialize services
  const puzzleRepo = new PuzzleRepository();
  const puzzleService = new PuzzleService(puzzleRepo);

  // GET /api/v1/puzzles - List puzzles
  app.get<{
    Querystring: Record<string, unknown>;
  }>('/', async (request, reply) => {
    // Fastify parses nested query parameters automatically
    // Build parsedQuery directly from request.query assuming nested structure
    const parsedQuery = request.query;

    // Validate with safeParse to handle validation errors gracefully
    const parseResult = listPuzzlesSchema.safeParse(parsedQuery);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: parseResult.error.issues,
          requestId: request.id,
        },
      });
    }

    const validated = parseResult.data;
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
    // Validate request body before accessing nested properties
    const parseResult = addPuzzleSchema.safeParse(request.body);
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
    const puzzle = buildPuzzleJson(validated.puzzle);
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
      updates.content = buildPuzzleJson(validated.content);
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
