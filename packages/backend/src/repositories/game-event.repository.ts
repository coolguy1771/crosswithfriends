import {eq, and, asc, max, gt} from 'drizzle-orm';
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
        maxSequence: max(gameEvents.sequenceNumber),
      })
      .from(gameEvents)
      .where(eq(gameEvents.gid, gid));

    // Handle null from max() when no rows exist, and ensure we return a number
    const maxSeq = result[0]?.maxSequence;
    return maxSeq != null ? Number(maxSeq) : 0;
  }

  async addEvent(data: Omit<NewGameEvent, 'sequenceNumber' | 'id'>): Promise<GameEventRecord> {
    // Use transaction to prevent race conditions
    // Explicitly set isolation level to READ COMMITTED to ensure commits are visible
    return this.db.transaction(
      async (tx) => {
        // Get max sequence number atomically within transaction
        const maxResult = await tx
          .select({
            maxSequence: max(gameEvents.sequenceNumber),
          })
          .from(gameEvents)
          .where(eq(gameEvents.gid, data.gid));

        // Handle null from max() when no rows exist, and ensure we get a number
        const maxSeq = maxResult[0]?.maxSequence;
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
