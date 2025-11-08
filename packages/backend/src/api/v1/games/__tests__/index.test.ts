import {describe, it, expect, beforeEach} from 'vitest';
import {getTestApp} from '../../../../test/helpers/app';
import type {FastifyInstance} from 'fastify';
import {GameService} from '../../../../services';
import {GameEventRepository, PuzzleRepository} from '../../../../repositories';
import {createTestPuzzle} from '../../../../test/fixtures/puzzles';

describe('Games API', () => {
  let app: FastifyInstance;
  let gameService: GameService;
  let puzzleRepo: PuzzleRepository;

  beforeEach(async () => {
    app = await getTestApp();
    const gameEventRepo = new GameEventRepository();
    puzzleRepo = new PuzzleRepository();
    gameService = new GameService(gameEventRepo, puzzleRepo);
  });

  describe('POST /api/v1/games', () => {
    it('should create a game', async () => {
      // First create a puzzle
      const puzzle = createTestPuzzle();
      const pid = 'test-puzzle-for-game';
      await puzzleRepo.create({
        id: 'puzzle-id-for-game',
        pid,
        isPublic: true,
        content: puzzle,
        timesSolved: 0,
        uploadedAt: new Date(),
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/games',
        payload: {pid},
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.gid).toBeDefined();
      expect(typeof body.gid).toBe('string');
    });

    it('should create a game with custom gid', async () => {
      const puzzle = createTestPuzzle();
      const pid = 'test-puzzle-for-game-2';
      await puzzleRepo.create({
        id: 'puzzle-id-for-game-2',
        pid,
        isPublic: true,
        content: puzzle,
        timesSolved: 0,
        uploadedAt: new Date(),
      });

      const customGid = 'custom-game-id';
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/games',
        payload: {gid: customGid, pid},
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.gid).toBe(customGid);
    });

    it('should return 400 for invalid request', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/games',
        payload: {}, // Missing required pid
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/games/:gid', () => {
    it('should return 404 for non-existent game', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/games/non-existent-game',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return game info', async () => {
      const puzzle = createTestPuzzle();
      const pid = 'test-puzzle-for-game-info';
      await puzzleRepo.create({
        id: 'puzzle-id-for-game-info',
        pid,
        isPublic: true,
        content: puzzle,
        timesSolved: 0,
        uploadedAt: new Date(),
      });

      const result = await gameService.createGame({pid});
      const gid = result.gid;

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/games/${gid}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.gid).toBe(gid);
      expect(body.pid).toBe(pid);
      expect(body.info).toBeDefined();
    });
  });

  describe('GET /api/v1/games/:gid/state', () => {
    it('should return 404 for non-existent game', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/games/non-existent-game/state',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return game state', async () => {
      const puzzle = createTestPuzzle();
      const pid = 'test-puzzle-for-game-state';
      await puzzleRepo.create({
        id: 'puzzle-id-for-game-state',
        pid,
        isPublic: true,
        content: puzzle,
        timesSolved: 0,
        uploadedAt: new Date(),
      });

      const result = await gameService.createGame({pid});
      const gid = result.gid;

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/games/${gid}/state`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.state).toBeDefined();
      expect(body.state.gid).toBe(gid);
      expect(body.state.pid).toBe(pid);
    });
  });
});
