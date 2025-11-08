import {eq, sql} from 'drizzle-orm';
import {getDatabase, getPostgresClient} from '../config/database.js';
import {puzzles} from '../models/schema.js';
import type {PuzzleJson} from '@crosswithfriends/shared';
import type {Puzzle, NewPuzzle} from '../models/schema.js';

type Database = ReturnType<typeof getDatabase>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export class PuzzleRepository {
  private db = getDatabase();

  async findById(id: string): Promise<Puzzle | null> {
    const result = await this.db.select().from(puzzles).where(eq(puzzles.id, id)).limit(1);

    return result[0] ?? null;
  }

  async findByPid(pid: string): Promise<PuzzleJson | null> {
    const result = await this.db
      .select({content: puzzles.content})
      .from(puzzles)
      .where(eq(puzzles.pid, pid))
      .limit(1);

    return result[0]?.content ?? null;
  }

  async create(data: NewPuzzle): Promise<Puzzle> {
    const result = await this.db.insert(puzzles).values(data).returning();
    if (!result[0]) {
      throw new Error(`Failed to create puzzle with pid: ${data.pid}`);
    }
    return result[0];
  }

  async update(pid: string, data: Partial<NewPuzzle>): Promise<Puzzle | null> {
    const result = await this.db.update(puzzles).set(data).where(eq(puzzles.pid, pid)).returning();

    return result[0] ?? null;
  }

  async delete(pid: string): Promise<boolean> {
    const result = await this.db.delete(puzzles).where(eq(puzzles.pid, pid)).returning();
    return result.length > 0;
  }

  async listPublic(
    filters: {
      sizeFilter?: string[];
      nameOrTitleFilter?: string;
    },
    limit: number,
    offset: number
  ): Promise<Array<{pid: string; content: PuzzleJson; timesSolved: number}>> {
    // Use raw SQL for complex JSONB queries (per technical spec hybrid approach)
    const pool = getPostgresClient();
    const params: unknown[] = [];
    let paramIndex = 1;

    // Build WHERE clause
    const whereConditions: string[] = ['is_public = true'];

    // Size filter (type filter)
    if (filters.sizeFilter && filters.sizeFilter.length > 0) {
      params.push(filters.sizeFilter);
      whereConditions.push(`(content->'info'->>'type') = ANY($${paramIndex})`);
      paramIndex++;
    }

    // Title/Author filter - build ILIKE conditions for each search term
    const searchConditions: string[] = [];
    if (filters.nameOrTitleFilter?.trim()) {
      const searchTerms = filters.nameOrTitleFilter.split(/\s+/).map((s) => `%${s}%`);
      searchTerms.forEach((term) => {
        params.push(term);
        searchConditions.push(
          `((content->'info'->>'title') || ' ' || (content->'info'->>'author')) ILIKE $${paramIndex}`
        );
        paramIndex++;
      });
    }

    if (searchConditions.length > 0) {
      whereConditions.push(`(${searchConditions.join(' AND ')})`);
    }

    // Add limit and offset
    params.push(limit, offset);
    const limitParam = paramIndex;
    const offsetParam = paramIndex + 1;

    const query = `
      SELECT pid, content, times_solved
      FROM puzzles
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY pid_numeric DESC NULLS LAST
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    const result = await pool.unsafe<
      Array<{
        pid: string;
        content: PuzzleJson;
        times_solved: number;
      }>
    >(query, params as never[]);

    return result.map((row) => ({
      pid: row.pid,
      content: row.content,
      timesSolved: row.times_solved,
    }));
  }

  async incrementSolveCount(pid: string, tx?: Transaction): Promise<void> {
    const db = tx ?? this.db;
    await db
      .update(puzzles)
      .set({timesSolved: sql`${puzzles.timesSolved} + 1`})
      .where(eq(puzzles.pid, pid));
  }
}
