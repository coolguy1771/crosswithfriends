import {describe, it, expect, beforeEach} from 'vitest';
import {GameService} from '../game.service';
import {GameEventRepository, PuzzleRepository} from '../../repositories';
import {createTestPuzzle} from '../../test/fixtures/puzzles';
import {createChatMessageEvent, createClockUpdateEvent} from '../../test/fixtures/games';

describe('GameService', () => {
  let gameService: GameService;
  let gameEventRepo: GameEventRepository;
  let puzzleRepo: PuzzleRepository;

  beforeEach(() => {
    gameEventRepo = new GameEventRepository();
    puzzleRepo = new PuzzleRepository();
    gameService = new GameService(gameEventRepo, puzzleRepo);
  });

  describe('createGame', () => {
    it('should create a game with generated gid when not provided', async () => {
      // First create a puzzle
      const puzzle = createTestPuzzle();
      const pid = 'test-puzzle-1';
      await puzzleRepo.create({
        id: 'puzzle-id-1',
        pid,
        isPublic: true,
        content: puzzle,
        timesSolved: 0,
        uploadedAt: new Date(),
      });

      const result = await gameService.createGame({pid});
      expect(result.gid).toBeDefined();
      expect(typeof result.gid).toBe('string');
    });

    it('should create a game with custom gid when provided', async () => {
      const puzzle = createTestPuzzle();
      const pid = 'test-puzzle-2';
      await puzzleRepo.create({
        id: 'puzzle-id-2',
        pid,
        isPublic: true,
        content: puzzle,
        timesSolved: 0,
        uploadedAt: new Date(),
      });

      const customGid = 'custom-game-id';
      const result = await gameService.createGame({gid: customGid, pid});
      expect(result.gid).toBe(customGid);
    });

    it('should throw NotFoundError when puzzle does not exist', async () => {
      await expect(gameService.createGame({pid: 'non-existent-puzzle'})).rejects.toThrow(
        'Puzzle non-existent-puzzle not found'
      );
    });

    it('should create initial create event', async () => {
      const puzzle = createTestPuzzle();
      const pid = 'test-puzzle-3';
      await puzzleRepo.create({
        id: 'puzzle-id-3',
        pid,
        isPublic: true,
        content: puzzle,
        timesSolved: 0,
        uploadedAt: new Date(),
      });

      const result = await gameService.createGame({pid});
      const events = await gameService.getGameEvents(result.gid);
      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe('create');
    });
  });

  describe('getGameState', () => {
    it('should return null for non-existent game', async () => {
      const state = await gameService.getGameState('non-existent-game');
      expect(state).toBeNull();
    });

    it('should reconstruct game state from events', async () => {
      const puzzle = createTestPuzzle();
      const pid = 'test-puzzle-4';
      await puzzleRepo.create({
        id: 'puzzle-id-4',
        pid,
        isPublic: true,
        content: puzzle,
        timesSolved: 0,
        uploadedAt: new Date(),
      });

      const result = await gameService.createGame({pid});
      const state = await gameService.getGameState(result.gid);

      expect(state).not.toBeNull();
      expect(state?.gid).toBe(result.gid);
      expect(state?.pid).toBe(pid);
      expect(state?.game).toBeDefined();
      expect(state?.solved).toBe(false);
    });

    it('should handle chat message events', async () => {
      const puzzle = createTestPuzzle();
      const pid = 'test-puzzle-5';
      await puzzleRepo.create({
        id: 'puzzle-id-5',
        pid,
        isPublic: true,
        content: puzzle,
        timesSolved: 0,
        uploadedAt: new Date(),
      });

      const result = await gameService.createGame({pid});
      await gameService.addGameEvent(result.gid, createChatMessageEvent('user1', 'Hello!', 'User 1'));

      const state = await gameService.getGameState(result.gid);
      expect(state?.chat.messages).toHaveLength(1);
      expect(state?.chat.messages[0]?.message).toBe('Hello!');
    });

    it('should handle clock update events', async () => {
      const puzzle = createTestPuzzle();
      const pid = 'test-puzzle-6';
      await puzzleRepo.create({
        id: 'puzzle-id-6',
        pid,
        isPublic: true,
        content: puzzle,
        timesSolved: 0,
        uploadedAt: new Date(),
      });

      const result = await gameService.createGame({pid});
      await gameService.addGameEvent(result.gid, createClockUpdateEvent('start'));

      const state = await gameService.getGameState(result.gid);
      expect(state?.clock.paused).toBe(false);
    });
  });

  describe('addGameEvent', () => {
    it('should add game event successfully', async () => {
      const puzzle = createTestPuzzle();
      const pid = 'test-puzzle-7';
      await puzzleRepo.create({
        id: 'puzzle-id-7',
        pid,
        isPublic: true,
        content: puzzle,
        timesSolved: 0,
        uploadedAt: new Date(),
      });

      const result = await gameService.createGame({pid});
      const event = createChatMessageEvent('user1', 'Test message', 'User 1');

      await gameService.addGameEvent(result.gid, event);

      const events = await gameService.getGameEvents(result.gid);
      expect(events).toHaveLength(2); // create + chat_message
      expect(events[1]?.type).toBe('chat_message');
    });
  });

  describe('getGameEvents', () => {
    it('should return empty array for non-existent game', async () => {
      const events = await gameService.getGameEvents('non-existent-game');
      expect(events).toEqual([]);
    });

    it('should return events in order', async () => {
      const puzzle = createTestPuzzle();
      const pid = 'test-puzzle-8';
      await puzzleRepo.create({
        id: 'puzzle-id-8',
        pid,
        isPublic: true,
        content: puzzle,
        timesSolved: 0,
        uploadedAt: new Date(),
      });

      const result = await gameService.createGame({pid});
      await gameService.addGameEvent(result.gid, createChatMessageEvent('user1', 'First', 'User 1'));
      await gameService.addGameEvent(result.gid, createChatMessageEvent('user1', 'Second', 'User 1'));

      const events = await gameService.getGameEvents(result.gid);
      expect(events).toHaveLength(3); // create + 2 chat messages
      expect(events[0]?.type).toBe('create');
    });
  });
});
