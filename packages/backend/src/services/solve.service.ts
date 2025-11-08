import {randomUUID} from 'crypto';
import {PuzzleSolveRepository, PuzzleRepository, GameEventRepository} from '../repositories';
import {getDatabase} from '../config/database.js';
import type {RecordSolveRequest, RecordSolveResponse, GameEvent} from '@crosswithfriends/shared';

export class SolveService {
  private db = getDatabase();

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
    // Get game events to calculate revealed/checked squares (outside transaction for performance)
    const events = await this.gameEventRepo.getEvents(request.gid);
    const {revealedSquaresCount, checkedSquaresCount} = this.calculateSquareCounts(events);

    // Wrap the entire read/insert/increment flow in a transaction to ensure atomicity
    // and prevent race conditions where two simultaneous requests both insert and increment
    try {
      return await this.db.transaction(
        async (tx) => {
          // Check if already solved (idempotency) - within transaction
          const existing = await this.solveRepo.findByPidAndGid(pid, request.gid, tx);
          if (existing) {
            return {}; // Already recorded
          }

          const id = randomUUID();

          // Insert solve record within transaction
          await this.solveRepo.create(
            {
              id,
              pid,
              gid: request.gid,
              timeTakenSeconds: request.time_to_solve,
              solvedAt: new Date(),
              revealedSquaresCount,
              checkedSquaresCount,
            },
            tx
          );

          // Increment puzzle solve count within the same transaction
          await this.puzzleRepo.incrementSolveCount(pid, tx);

          return {};
        },
        {
          isolationLevel: 'read committed',
        }
      );
    } catch (error) {
      // Handle unique constraint violation (PostgreSQL error code 23505)
      // If a unique index on (pid, gid) exists and another request inserted first,
      // this transaction will fail and rollback, preventing double increment
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        // Unique constraint violation - transaction has rolled back
        // Check again outside transaction to confirm it exists (idempotency)
        const existingAfterError = await this.solveRepo.findByPidAndGid(pid, request.gid);
        if (existingAfterError) {
          return {}; // Already recorded by another request
        }
      }
      // Re-throw other errors
      throw error;
    }
  }

  async getSolvesByPid(pid: string) {
    return this.solveRepo.findByPid(pid);
  }

  async isGidSolved(gid: string): Promise<boolean> {
    return this.solveRepo.isGidSolved(gid);
  }
}
