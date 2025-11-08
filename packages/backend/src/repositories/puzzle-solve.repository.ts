import {eq, and, desc} from 'drizzle-orm';
import {getDatabase} from '../config/database.js';
import {puzzleSolves} from '../models/schema.js';
import type {PuzzleSolve, NewPuzzleSolve} from '../models/schema.js';

type Database = ReturnType<typeof getDatabase>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export class PuzzleSolveRepository {
  private db = getDatabase();

  async create(data: NewPuzzleSolve, tx?: Transaction): Promise<PuzzleSolve> {
    const db = tx ?? this.db;
    const result = await db.insert(puzzleSolves).values(data).returning();
    if (!result[0]) {
      throw new Error(`Failed to create puzzle solve for pid: ${data.pid}, gid: ${data.gid}`);
    }
    return result[0];
  }

  async findByGid(gid: string, tx?: Transaction): Promise<PuzzleSolve | null> {
    const db = tx ?? this.db;
    const result = await db.select().from(puzzleSolves).where(eq(puzzleSolves.gid, gid)).limit(1);

    return result[0] ?? null;
  }

  async findByPid(pid: string): Promise<PuzzleSolve[]> {
    return this.db
      .select()
      .from(puzzleSolves)
      .where(eq(puzzleSolves.pid, pid))
      .orderBy(desc(puzzleSolves.solvedAt));
  }

  async findByPidAndGid(pid: string, gid: string, tx?: Transaction): Promise<PuzzleSolve | null> {
    const db = tx ?? this.db;
    const result = await db
      .select()
      .from(puzzleSolves)
      .where(and(eq(puzzleSolves.pid, pid), eq(puzzleSolves.gid, gid)))
      .limit(1);

    return result[0] ?? null;
  }

  async isGidSolved(gid: string): Promise<boolean> {
    const result = await this.findByGid(gid);
    return result !== null;
  }
}
