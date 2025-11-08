import {randomUUID} from 'crypto';
import {PuzzleRepository, PuzzleSolveRepository} from '../repositories';
import type {
  PuzzleJson,
  AddPuzzleRequest,
  AddPuzzleResponse,
  ListPuzzleRequest,
  ListPuzzleResponse,
} from '@crosswithfriends/shared';

export class PuzzleService {
  constructor(
    private puzzleRepo: PuzzleRepository,
    // solveRepo is kept for future use but currently unused
    private _solveRepo?: PuzzleSolveRepository
  ) {
    // Intentionally unused, reserved for future functionality
    void this._solveRepo;
  }

  async createPuzzle(request: AddPuzzleRequest): Promise<AddPuzzleResponse> {
    const pid = request.pid ?? randomUUID();
    const id = randomUUID();

    await this.puzzleRepo.create({
      id,
      pid,
      pidNumeric: this.extractNumericPid(pid),
      isPublic: request.isPublic,
      content: request.puzzle,
      timesSolved: 0,
      uploadedAt: new Date(),
    });

    return {pid};
  }

  async getPuzzle(pid: string): Promise<PuzzleJson | null> {
    return this.puzzleRepo.findByPid(pid);
  }

  async listPuzzles(request: ListPuzzleRequest): Promise<ListPuzzleResponse> {
    const sizeFilter = this.mapSizeFilter(request.filter.sizeFilter);
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const nameOrTitleFilter = request.filter.nameOrTitleFilter ?? '';

    const results = await this.puzzleRepo.listPublic(
      {
        sizeFilter,
        nameOrTitleFilter,
      },
      request.pageSize,
      (request.page - 1) * request.pageSize
    );

    return {
      puzzles: results.map((p) => ({
        pid: p.pid,
        content: p.content,
        stats: {
          numSolves: p.timesSolved,
        },
      })),
    };
  }

  async updatePuzzle(
    pid: string,
    updates: Partial<{content: PuzzleJson; isPublic: boolean}>
  ): Promise<boolean> {
    const result = await this.puzzleRepo.update(pid, updates);
    return result !== null;
  }

  async deletePuzzle(pid: string): Promise<boolean> {
    return this.puzzleRepo.delete(pid);
  }

  async incrementSolveCount(pid: string): Promise<void> {
    await this.puzzleRepo.incrementSolveCount(pid);
  }

  private mapSizeFilter(filter: ListPuzzleRequest['filter']['sizeFilter']): string[] {
    const types: string[] = [];
    if (filter.Mini) {
      types.push('Mini Puzzle');
    }
    if (filter.Standard) {
      types.push('Daily Puzzle');
    }
    return types;
  }

  private extractNumericPid(pid: string): string | null {
    // Extract numeric part from PID if it exists (e.g., "123-abc" -> "123")
    const match = pid.match(/^(\d+)/);
    return match ? (match[1] ?? null) : null;
  }
}
