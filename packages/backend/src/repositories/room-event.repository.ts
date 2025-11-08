import {eq, asc, max} from 'drizzle-orm';
import {getDatabase} from '../config/database.js';
import {roomEvents} from '../models/schema.js';
import type {RoomEvent} from '@crosswithfriends/shared';
import type {RoomEventRecord, NewRoomEvent} from '../models/schema.js';

export class RoomEventRepository {
  private db = getDatabase();

  async getEvents(rid: string): Promise<RoomEvent[]> {
    const result = await this.db
      .select({
        eventPayload: roomEvents.eventPayload,
      })
      .from(roomEvents)
      .where(eq(roomEvents.rid, rid))
      .orderBy(asc(roomEvents.sequenceNumber));

    return result.map((row) => row.eventPayload);
  }

  async getEventsWithSequence(rid: string): Promise<RoomEventRecord[]> {
    return this.db
      .select()
      .from(roomEvents)
      .where(eq(roomEvents.rid, rid))
      .orderBy(asc(roomEvents.sequenceNumber));
  }

  async getNextSequenceNumber(rid: string): Promise<number> {
    const result = await this.db
      .select({
        maxSequence: max(roomEvents.sequenceNumber),
      })
      .from(roomEvents)
      .where(eq(roomEvents.rid, rid));

    // Handle null from max() when no rows exist, and ensure we return a number
    const maxSeq = result[0]?.maxSequence;
    return maxSeq != null ? Number(maxSeq) : 0;
  }

  async addEvent(data: Omit<NewRoomEvent, 'sequenceNumber' | 'id'>): Promise<RoomEventRecord> {
    // Use transaction to prevent race conditions
    // Explicitly set isolation level to READ COMMITTED to ensure commits are visible
    return this.db.transaction(
      async (tx) => {
        // Get max sequence number atomically within transaction
        const maxResult = await tx
          .select({
            maxSequence: max(roomEvents.sequenceNumber),
          })
          .from(roomEvents)
          .where(eq(roomEvents.rid, data.rid));

        // Handle null from max() when no rows exist, and ensure we get a number
        const maxSeq = maxResult[0]?.maxSequence;
        const sequenceNumber = (maxSeq != null ? Number(maxSeq) : 0) + 1;

        const result = await tx
          .insert(roomEvents)
          .values({
            ...data,
            sequenceNumber,
          })
          .returning();

        if (!result[0]) {
          throw new Error(`Failed to insert room event for rid: ${data.rid}`);
        }

        return result[0];
      },
      {
        isolationLevel: 'read committed',
      }
    );
  }
}
