import {describe, it, expect, beforeEach} from 'vitest';
import {RoomEventRepository} from '../room-event.repository';
import {
  createUserJoinEvent,
  createUserLeaveEvent,
  createRoomChatMessageEvent,
} from '../../test/fixtures/rooms';

describe('RoomEventRepository', () => {
  let repo: RoomEventRepository;

  beforeEach(() => {
    repo = new RoomEventRepository();
  });

  describe('getEvents', () => {
    it('should return empty array for non-existent room', async () => {
      const events = await repo.getEvents('non-existent-room');
      expect(events).toEqual([]);
    });

    it('should return events in sequence order', async () => {
      const rid = 'test-room';
      const event1 = createUserJoinEvent('user1', 'User 1', {timestamp: 1000});
      const event2 = createUserJoinEvent('user2', 'User 2', {timestamp: 2000});

      await repo.addEvent({
        rid,
        eventType: 'user_join',
        eventPayload: event1,
        userId: event1.userId,
        timestamp: new Date(event1.timestamp),
      });
      await repo.addEvent({
        rid,
        eventType: 'user_join',
        eventPayload: event2,
        userId: event2.userId,
        timestamp: new Date(event2.timestamp),
      });

      const events = await repo.getEvents(rid);
      expect(events).toHaveLength(2);
      expect(events[0]?.timestamp).toBeLessThanOrEqual(events[1]?.timestamp || 0);
    });
  });

  describe('addEvent', () => {
    it('should add event and assign sequence number', async () => {
      const rid = 'test-room';
      const event = createUserJoinEvent('user1', 'User 1');

      const result = await repo.addEvent({
        rid,
        eventType: 'user_join',
        eventPayload: event,
        userId: event.userId,
        timestamp: new Date(event.timestamp),
      });

      expect(result.sequenceNumber).toBe(1);
      expect(result.rid).toBe(rid);
    });

    it('should increment sequence numbers correctly', async () => {
      const rid = 'test-room';
      const event1 = createUserJoinEvent('user1', 'User 1');
      const event2 = createUserLeaveEvent('user1');

      const result1 = await repo.addEvent({
        rid,
        eventType: 'user_join',
        eventPayload: event1,
        userId: event1.userId,
        timestamp: new Date(event1.timestamp),
      });

      const result2 = await repo.addEvent({
        rid,
        eventType: 'user_leave',
        eventPayload: event2,
        userId: event2.userId,
        timestamp: new Date(event2.timestamp),
      });

      expect(result2.sequenceNumber).toBeGreaterThan(result1.sequenceNumber);
    });

    it('should handle concurrent events with transactions', async () => {
      const rid = 'test-room';
      const event1 = createUserJoinEvent('user1', 'User 1');
      const event2 = createUserJoinEvent('user2', 'User 2');

      // Add events concurrently
      const [result1, result2] = await Promise.all([
        repo.addEvent({
          rid,
          eventType: 'user_join',
          eventPayload: event1,
          userId: event1.userId,
          timestamp: new Date(event1.timestamp),
        }),
        repo.addEvent({
          rid,
          eventType: 'user_join',
          eventPayload: event2,
          userId: event2.userId,
          timestamp: new Date(event2.timestamp),
        }),
      ]);

      // Both should have different sequence numbers
      expect(result1.sequenceNumber).not.toBe(result2.sequenceNumber);
    });
  });

  describe('getNextSequenceNumber', () => {
    it('should return 0 for room with no events', async () => {
      const next = await repo.getNextSequenceNumber('empty-room');
      expect(next).toBe(0);
    });

    it('should return max sequence number', async () => {
      const rid = 'test-room';
      const event1 = createUserJoinEvent('user1', 'User 1');
      const event2 = createUserJoinEvent('user2', 'User 2');

      await repo.addEvent({
        rid,
        eventType: 'user_join',
        eventPayload: event1,
        userId: event1.userId,
        timestamp: new Date(event1.timestamp),
      });

      await repo.addEvent({
        rid,
        eventType: 'user_join',
        eventPayload: event2,
        userId: event2.userId,
        timestamp: new Date(event2.timestamp),
      });

      const next = await repo.getNextSequenceNumber(rid);
      expect(next).toBe(2);
    });
  });

  describe('getEventsWithSequence', () => {
    it('should return events with sequence numbers', async () => {
      const rid = 'test-room';
      const event = createUserJoinEvent('user1', 'User 1');

      await repo.addEvent({
        rid,
        eventType: 'user_join',
        eventPayload: event,
        userId: event.userId,
        timestamp: new Date(event.timestamp),
      });

      const events = await repo.getEventsWithSequence(rid);
      expect(events).toHaveLength(1);
      expect(events[0]?.sequenceNumber).toBe(1);
      expect(events[0]?.eventType).toBe('user_join');
    });
  });
});
