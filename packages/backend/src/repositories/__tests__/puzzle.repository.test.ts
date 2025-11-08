import {describe, it, expect, beforeEach} from 'vitest';
import {PuzzleRepository} from '../puzzle.repository';
import {createTestPuzzle, createMiniPuzzle, createStandardPuzzle} from '../../test/fixtures/puzzles';

describe('PuzzleRepository', () => {
  let repo: PuzzleRepository;

  beforeEach(() => {
    repo = new PuzzleRepository();
  });

  describe('create', () => {
    it('should create a puzzle', async () => {
      const puzzle = createTestPuzzle();
      const id = 'test-id-1';
      const pid = 'test-pid-1';

      const result = await repo.create({
        id,
        pid,
        isPublic: true,
        content: puzzle,
        timesSolved: 0,
        uploadedAt: new Date(),
      });

      expect(result.id).toBe(id);
      expect(result.pid).toBe(pid);
      expect(result.isPublic).toBe(true);
    });
  });

  describe('findById', () => {
    it('should return null for non-existent puzzle', async () => {
      const result = await repo.findById('non-existent-id');
      expect(result).toBeNull();
    });

    it('should find puzzle by id', async () => {
      const puzzle = createTestPuzzle();
      const id = 'test-id-2';
      const pid = 'test-pid-2';

      await repo.create({
        id,
        pid,
        isPublic: true,
        content: puzzle,
        timesSolved: 0,
        uploadedAt: new Date(),
      });

      const found = await repo.findById(id);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(id);
      expect(found?.pid).toBe(pid);
    });
  });

  describe('findByPid', () => {
    it('should return null for non-existent puzzle', async () => {
      const puzzle = await repo.findByPid('non-existent-pid');
      expect(puzzle).toBeNull();
    });

    it('should return puzzle content by pid', async () => {
      const puzzle = createTestPuzzle();
      const pid = 'test-pid-3';

      await repo.create({
        id: 'test-id-3',
        pid,
        isPublic: true,
        content: puzzle,
        timesSolved: 0,
        uploadedAt: new Date(),
      });

      const found = await repo.findByPid(pid);
      expect(found).not.toBeNull();
      expect(found?.info.title).toBe(puzzle.info.title);
    });
  });

  describe('update', () => {
    it('should return null for non-existent puzzle', async () => {
      const result = await repo.update('non-existent', {isPublic: true});
      expect(result).toBeNull();
    });

    it('should update puzzle', async () => {
      const puzzle = createTestPuzzle();
      const pid = 'test-pid-4';

      await repo.create({
        id: 'test-id-4',
        pid,
        isPublic: false,
        content: puzzle,
        timesSolved: 0,
        uploadedAt: new Date(),
      });

      const updated = await repo.update(pid, {isPublic: true});
      expect(updated).not.toBeNull();
      expect(updated?.isPublic).toBe(true);
    });
  });

  describe('delete', () => {
    it('should return false for non-existent puzzle', async () => {
      const result = await repo.delete('non-existent');
      expect(result).toBe(false);
    });

    it('should delete puzzle', async () => {
      const puzzle = createTestPuzzle();
      const id = 'test-id-5';
      const pid = 'test-pid-5';

      await repo.create({
        id,
        pid,
        isPublic: true,
        content: puzzle,
        timesSolved: 0,
        uploadedAt: new Date(),
      });

      const deleted = await repo.delete(pid);
      expect(deleted).toBe(true);

      const found = await repo.findById(id);
      expect(found).toBeNull();
    });
  });

  describe('listPublic', () => {
    it('should return empty array when no public puzzles exist', async () => {
      const result = await repo.listPublic({}, 10, 0);
      expect(result).toEqual([]);
    });

    it('should list only public puzzles', async () => {
      const puzzle1 = createTestPuzzle();
      const puzzle2 = createTestPuzzle();

      await repo.create({
        id: 'test-id-6',
        pid: 'public-1',
        isPublic: true,
        content: puzzle1,
        timesSolved: 0,
        uploadedAt: new Date(),
      });

      await repo.create({
        id: 'test-id-7',
        pid: 'private-1',
        isPublic: false,
        content: puzzle2,
        timesSolved: 0,
        uploadedAt: new Date(),
      });

      const result = await repo.listPublic({}, 10, 0);
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.every((p) => p.pid === 'public-1')).toBe(true);
    });

    it('should filter by size', async () => {
      const miniPuzzle = createMiniPuzzle();
      const standardPuzzle = createStandardPuzzle();

      await repo.create({
        id: 'test-id-8',
        pid: 'mini-1',
        isPublic: true,
        content: miniPuzzle,
        timesSolved: 0,
        uploadedAt: new Date(),
      });

      await repo.create({
        id: 'test-id-9',
        pid: 'standard-1',
        isPublic: true,
        content: standardPuzzle,
        timesSolved: 0,
        uploadedAt: new Date(),
      });

      const result = await repo.listPublic({sizeFilter: ['Mini Puzzle']}, 10, 0);
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.some((p) => p.pid === 'mini-1')).toBe(true);
    });

    it('should paginate results', async () => {
      // Create multiple puzzles
      for (let i = 0; i < 5; i++) {
        await repo.create({
          id: `test-id-${i}`,
          pid: `puzzle-${i}`,
          isPublic: true,
          content: createTestPuzzle(),
          timesSolved: 0,
          uploadedAt: new Date(),
        });
      }

      const page1 = await repo.listPublic({}, 2, 0);
      const page2 = await repo.listPublic({}, 2, 2);

      expect(page1.length).toBeLessThanOrEqual(2);
      expect(page2.length).toBeLessThanOrEqual(2);
      // Pages should have different puzzles
      const page1Pids = new Set(page1.map((p) => p.pid));
      const page2Pids = new Set(page2.map((p) => p.pid));
      expect([...page1Pids].some((pid) => page2Pids.has(pid))).toBe(false);
    });
  });

  describe('incrementSolveCount', () => {
    it('should increment solve count', async () => {
      const puzzle = createTestPuzzle();
      const id = 'test-id-solves';
      const pid = 'test-pid-solves';

      await repo.create({
        id,
        pid,
        isPublic: true,
        content: puzzle,
        timesSolved: 5,
        uploadedAt: new Date(),
      });

      await repo.incrementSolveCount(pid);

      const found = await repo.findById(id);
      expect(found?.timesSolved).toBe(6);
    });
  });
});
