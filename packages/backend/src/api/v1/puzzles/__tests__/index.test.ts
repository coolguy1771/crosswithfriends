import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {getTestApp} from '../../../../test/helpers/app';
import type {FastifyInstance} from 'fastify';
import {PuzzleService} from '../../../../services';
import {PuzzleRepository, PuzzleSolveRepository} from '../../../../repositories';
import {createTestPuzzle, createMiniPuzzle, createStandardPuzzle} from '../../../../test/fixtures/puzzles';
import type {ListPuzzleResponse} from '@crosswithfriends/shared';

describe('Puzzles API', () => {
  let app: FastifyInstance;
  let puzzleService: PuzzleService;

  beforeEach(async () => {
    app = await getTestApp();
    const puzzleRepo = new PuzzleRepository();
    const solveRepo = new PuzzleSolveRepository();
    puzzleService = new PuzzleService(puzzleRepo, solveRepo);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('GET /api/v1/puzzles', () => {
    it('should return empty list when no puzzles exist', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/puzzles?page=1&pageSize=20&filter[sizeFilter][Mini]=true&filter[sizeFilter][Standard]=true&filter[nameOrTitleFilter]=',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.puzzles).toEqual([]);
    });

    it('should list public puzzles', async () => {
      const puzzle1 = createTestPuzzle();
      const puzzle2 = createTestPuzzle();
      await puzzleService.createPuzzle({puzzle: puzzle1, pid: 'public-1', isPublic: true});
      await puzzleService.createPuzzle({puzzle: puzzle2, pid: 'private-1', isPublic: false});

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/puzzles?page=1&pageSize=20&filter[sizeFilter][Mini]=true&filter[sizeFilter][Standard]=true&filter[nameOrTitleFilter]=',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body) as ListPuzzleResponse;
      expect(body.puzzles.length).toBeGreaterThanOrEqual(1);
      expect(body.puzzles.some((p) => p.pid === 'public-1')).toBe(true);
      expect(body.puzzles.some((p) => p.pid === 'private-1')).toBe(false);
    });

    it('should filter by size', async () => {
      await puzzleService.createPuzzle({puzzle: createMiniPuzzle(), pid: 'mini-1', isPublic: true});
      await puzzleService.createPuzzle({puzzle: createStandardPuzzle(), pid: 'standard-1', isPublic: true});

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/puzzles?page=1&pageSize=20&filter[sizeFilter][Mini]=true&filter[sizeFilter][Standard]=false&filter[nameOrTitleFilter]=',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.puzzles.length).toBeGreaterThanOrEqual(1);
    });

    it('should paginate results', async () => {
      // Create multiple puzzles
      for (let i = 0; i < 3; i++) {
        await puzzleService.createPuzzle({
          puzzle: createTestPuzzle(),
          pid: `puzzle-page-${i}`,
          isPublic: true,
        });
      }

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/puzzles?page=1&pageSize=2&filter[sizeFilter][Mini]=true&filter[sizeFilter][Standard]=true&filter[nameOrTitleFilter]=',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.puzzles.length).toBeLessThanOrEqual(2);
    });
  });

  describe('GET /api/v1/puzzles/:pid', () => {
    it('should return 404 for non-existent puzzle', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/puzzles/non-existent-puzzle',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('PUZZLE_NOT_FOUND');
    });

    it('should return puzzle by pid', async () => {
      const puzzle = createTestPuzzle();
      const pid = 'test-puzzle-get';
      await puzzleService.createPuzzle({puzzle, pid, isPublic: true});

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/puzzles/${pid}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.puzzle).toBeDefined();
      expect(body.puzzle.info.title).toBe(puzzle.info.title);
    });
  });

  describe('POST /api/v1/puzzles', () => {
    it('should create a puzzle', async () => {
      const puzzle = createTestPuzzle();
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/puzzles',
        payload: {
          puzzle,
          isPublic: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.pid).toBeDefined();
    });

    it('should create a puzzle with custom pid', async () => {
      const puzzle = createTestPuzzle();
      const pid = 'custom-puzzle-id';
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/puzzles',
        payload: {
          puzzle,
          pid,
          isPublic: true,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.pid).toBe(pid);
    });

    it('should return 400 for invalid puzzle data', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/puzzles',
        payload: {
          puzzle: {invalid: 'data'},
          isPublic: true,
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('PUT /api/v1/puzzles/:pid', () => {
    it('should return 404 for non-existent puzzle', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/puzzles/non-existent',
        payload: {isPublic: true},
      });

      expect(response.statusCode).toBe(404);
    });

    it('should update puzzle visibility', async () => {
      const puzzle = createTestPuzzle();
      const pid = 'test-puzzle-update';
      await puzzleService.createPuzzle({puzzle, pid, isPublic: false});

      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/puzzles/${pid}`,
        payload: {isPublic: true},
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should update puzzle content', async () => {
      const puzzle = createTestPuzzle();
      const pid = 'test-puzzle-update-content';
      await puzzleService.createPuzzle({puzzle, pid, isPublic: true});

      const updatedPuzzle = createTestPuzzle();
      updatedPuzzle.info.title = 'Updated Title';

      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/puzzles/${pid}`,
        payload: {content: updatedPuzzle},
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });

  describe('DELETE /api/v1/puzzles/:pid', () => {
    it('should return 404 for non-existent puzzle', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/puzzles/non-existent',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should delete puzzle', async () => {
      const puzzle = createTestPuzzle();
      const pid = 'test-puzzle-delete';
      await puzzleService.createPuzzle({puzzle, pid, isPublic: true});

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/puzzles/${pid}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);

      // Verify it's deleted
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/v1/puzzles/${pid}`,
      });
      expect(getResponse.statusCode).toBe(404);
    });
  });
});
