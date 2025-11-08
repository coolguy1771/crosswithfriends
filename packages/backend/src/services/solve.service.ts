import {randomUUID} from 'crypto';
import {PuzzleSolveRepository, PuzzleRepository, GameEventRepository} from '../repositories';
import type {RecordSolveRequest, RecordSolveResponse, GameEvent} from '@crosswithfriends/shared';

export class SolveService {
  constructor(
    private solveRepo: PuzzleSolveRepository,
    private puzzleRepo: PuzzleRepository,
    private gameEventRepo: GameEventRepository
  ) {}

  private calculateSquareCounts(events: GameEvent[]): {
    revealedSquaresCount: number;
    checkedSquaresCount: number;
  } {
    const revealedSquares = new Set<string>();
    const checkedSquares = new Set<string>();

    for (const event of events) {
      if (event.type === 'cell_reveal' && 'params' in event) {
        const params = event.params as {row: number; col: number; scope?: Array<{row: number; col: number}>};
        const scope = params.scope ?? [{row: params.row, col: params.col}];
        scope.forEach((cell) => {
          revealedSquares.add(`${cell.row},${cell.col}`);
        });
      } else if (event.type === 'cell_check' && 'params' in event) {
        const params = event.params as {row: number; col: number; scope?: Array<{row: number; col: number}>};
        const scope = params.scope ?? [{row: params.row, col: params.col}];
        scope.forEach((cell) => {
          checkedSquares.add(`${cell.row},${cell.col}`);
        });
      }
    }

    return {
      revealedSquaresCount: revealedSquares.size,
      checkedSquaresCount: checkedSquares.size,
    };
  }

  async recordSolve(pid: string, request: RecordSolveRequest): Promise<RecordSolveResponse> {
    // Check if already solved (idempotency)
    const existing = await this.solveRepo.findByPidAndGid(pid, request.gid);
    if (existing) {
      return {}; // Already recorded
    }

    // Get game events to calculate revealed/checked squares
    const events = await this.gameEventRepo.getEvents(request.gid);
    const {revealedSquaresCount, checkedSquaresCount} = this.calculateSquareCounts(events);

    // Use transaction to ensure atomicity
    // Note: Drizzle transactions would be used here in full implementation
    const id = randomUUID();

    await this.solveRepo.create({
      id,
      pid,
      gid: request.gid,
      timeTakenSeconds: request.time_to_solve,
      solvedAt: new Date(),
      revealedSquaresCount,
      checkedSquaresCount,
    });

    // Increment puzzle solve count
    await this.puzzleRepo.incrementSolveCount(pid);

    return {};
  }

  async getSolvesByPid(pid: string) {
    return this.solveRepo.findByPid(pid);
  }

  async isGidSolved(gid: string): Promise<boolean> {
    return this.solveRepo.isGidSolved(gid);
  }
}
