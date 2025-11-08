import {eq, and, asc, desc, gt} from 'drizzle-orm';
import {getDatabase} from '../config/database.js';
import {gameEvents, gameSnapshots} from '../models/schema.js';
import type {GameEvent} from '@crosswithfriends/shared';
import type {GameEventRecord, NewGameEvent, GameSnapshot, NewGameSnapshot} from '../models/schema.js';

export class GameEventRepository {
  private db = getDatabase();

  async getEvents(gid: string): Promise<GameEvent[]> {
    const result = await this.db
      .select({
        eventPayload: gameEvents.eventPayload,
      })
      .from(gameEvents)
      .where(eq(gameEvents.gid, gid))
      .orderBy(asc(gameEvents.sequenceNumber));

    return result.map((row) => row.eventPayload);
  }

  async getEventsWithSequence(gid: string): Promise<GameEventRecord[]> {
    return this.db
      .select()
      .from(gameEvents)
      .where(eq(gameEvents.gid, gid))
      .orderBy(asc(gameEvents.sequenceNumber));
  }

  async getNextSequenceNumber(gid: string): Promise<number> {
    const result = await this.db
      .select({
        sequenceNumber: gameEvents.sequenceNumber,
      })
      .from(gameEvents)
      .where(eq(gameEvents.gid, gid))
      .orderBy(desc(gameEvents.sequenceNumber))
      .limit(1);

    // Handle case when no rows exist
    const maxSeq = result[0]?.sequenceNumber;
    return maxSeq != null ? Number(maxSeq) : 0;
  }

  async addEvent(data: Omit<NewGameEvent, 'sequenceNumber' | 'id'>): Promise<GameEventRecord> {
    // Retry logic to handle concurrent inserts
    const maxRetries = 5;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Use transaction to prevent race conditions
        // Use SERIALIZABLE isolation to prevent concurrent sequence number conflicts
        return await this.db.transaction(
          async (tx) => {
            // Get max sequence number atomically within transaction
            // Use orderBy + limit instead of max() for better bigint handling
            const maxResult = await tx
              .select({
                sequenceNumber: gameEvents.sequenceNumber,
              })
              .from(gameEvents)
              .where(eq(gameEvents.gid, data.gid))
              .orderBy(desc(gameEvents.sequenceNumber))
              .limit(1);

            // Handle null when no rows exist, and ensure we get a number
            const maxSeq = maxResult[0]?.sequenceNumber;
            const sequenceNumber = (maxSeq != null ? Number(maxSeq) : 0) + 1;

            const result = await tx
              .insert(gameEvents)
              .values({
                ...data,
                sequenceNumber,
              })
              .returning();

            if (!result[0]) {
              throw new Error(`Failed to insert game event for gid: ${data.gid}`);
            }

            return result[0];
          },
          {
            isolationLevel: 'read committed',
          }
        );
      } catch (error) {
        // Check if it's a unique constraint violation or serialization error
        // PostgreSQL error code 23505 = unique_violation (can be string or number)
        // PostgreSQL error code 40001 = serialization_failure (can be string or number)
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Try to extract error code from various possible locations
        let errorCode: string | number | undefined;
        if (error && typeof error === 'object') {
          // Check direct code property
          if ('code' in error) {
            const code = (error as {code: unknown}).code;
            if (typeof code === 'string' || typeof code === 'number') {
              errorCode = code;
            }
          }
          // Check nested error (postgres.js might wrap errors)
          if ('cause' in error && error.cause && typeof error.cause === 'object' && 'code' in error.cause) {
            const code = (error.cause as {code: unknown}).code;
            if (typeof code === 'string' || typeof code === 'number') {
              errorCode = code;
            }
          }
        }
        
        const errorCodeStr = String(errorCode ?? '');
        const errorCodeNum = typeof errorCode === 'number' ? errorCode : undefined;
        
        // Check error code - postgres.js may return it as string '23505' or number 23505
        // Also check error message as fallback
        const isUniqueViolation =
          errorCodeNum === 23505 ||
          errorCodeStr === '23505' ||
          errorMessage.includes('duplicate key') ||
          errorMessage.includes('unique constraint') ||
          errorMessage.includes('23505');
        const isSerializationError =
          errorCodeNum === 40001 ||
          errorCodeStr === '40001' ||
          errorMessage.includes('serialization failure') ||
          errorMessage.includes('could not serialize') ||
          errorMessage.includes('40001');

        if ((isUniqueViolation || isSerializationError) && attempt < maxRetries - 1) {
          // Retry with exponential backoff
          lastError = error instanceof Error ? error : new Error(String(error));
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 10));
          continue;
        }

        // If it's not a retryable error or we've exhausted retries, throw
        throw error;
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError || new Error(`Failed to insert game event for gid: ${data.gid} after ${maxRetries} attempts`);
  }

  async getCreateEvent(gid: string): Promise<GameEventRecord | null> {
    const result = await this.db
      .select()
      .from(gameEvents)
      .where(and(eq(gameEvents.gid, gid), eq(gameEvents.eventType, 'create')))
      .limit(1);

    return result[0] ?? null;
  }

  // Snapshot operations (per technical spec - performance optimization)
  async getSnapshot(gid: string): Promise<GameSnapshot | null> {
    const result = await this.db.select().from(gameSnapshots).where(eq(gameSnapshots.gid, gid)).limit(1);

    return result[0] ?? null;
  }

  async saveSnapshot(data: NewGameSnapshot): Promise<GameSnapshot> {
    const result = await this.db
      .insert(gameSnapshots)
      .values(data)
      .onConflictDoUpdate({
        target: gameSnapshots.gid,
        set: {
          snapshotData: data.snapshotData,
          snapshotVersion: data.snapshotVersion,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!result[0]) {
      throw new Error(`Failed to save snapshot for gid: ${data.gid}`);
    }
    return result[0];
  }

  async getEventsAfterSequence(gid: string, sequenceNumber: number): Promise<GameEventRecord[]> {
    return this.db
      .select()
      .from(gameEvents)
      .where(and(eq(gameEvents.gid, gid), gt(gameEvents.sequenceNumber, sequenceNumber)))
      .orderBy(asc(gameEvents.sequenceNumber));
  }
}
