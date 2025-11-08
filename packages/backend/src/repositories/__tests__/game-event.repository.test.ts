import {describe, it, expect, beforeEach} from 'vitest';
import {GameEventRepository} from '../game-event.repository';
import {createGameEvent, createChatMessageEvent} from '../../test/fixtures/games';

describe('GameEventRepository', () => {
  let repo: GameEventRepository;

  beforeEach(() => {
    repo = new GameEventRepository();
  });

  describe('getEvents', () => {
    it('should return empty array for non-existent game', async () => {
      const events = await repo.getEvents('non-existent-game');
      expect(events).toEqual([]);
    });

    it('should return events in sequence order', async () => {
      const gid = 'test-game';
      const pid = 'test-puzzle';
      const event1 = createGameEvent(gid, pid);
      const event2 = createChatMessageEvent('user1', 'Hello', 'User 1');

      await repo.addEvent({
        gid,
        eventType: 'create',
        eventPayload: event1,
        userId: event1.userId,
        timestamp: new Date(event1.timestamp),
        version: 1,
      });

      await repo.addEvent({
        gid,
        eventType: 'chat_message',
        eventPayload: event2,
        userId: event2.userId,
        timestamp: new Date(event2.timestamp),
        version: 1,
      });

      const events = await repo.getEvents(gid);
      expect(events).toHaveLength(2);
      expect(events[0]?.type).toBe('create');
      expect(events[1]?.type).toBe('chat_message');
    });
  });

  describe('addEvent', () => {
    it('should add event and assign sequence number', async () => {
      const gid = 'test-game';
      const pid = 'test-puzzle';
      const event = createGameEvent(gid, pid);

      const result = await repo.addEvent({
        gid,
        eventType: 'create',
        eventPayload: event,
        userId: event.userId,
        timestamp: new Date(event.timestamp),
        version: 1,
      });

      expect(result.sequenceNumber).toBe(1);
      expect(result.gid).toBe(gid);
    });

    it('should increment sequence numbers correctly', async () => {
      const gid = 'test-game';
      const pid = 'test-puzzle';
      const event1 = createGameEvent(gid, pid);
      const event2 = createChatMessageEvent('user1', 'Test', 'User 1');

      const result1 = await repo.addEvent({
        gid,
        eventType: 'create',
        eventPayload: event1,
        userId: event1.userId,
        timestamp: new Date(event1.timestamp),
        version: 1,
      });

      const result2 = await repo.addEvent({
        gid,
        eventType: 'chat_message',
        eventPayload: event2,
        userId: event2.userId,
        timestamp: new Date(event2.timestamp),
        version: 1,
      });

      expect(result2.sequenceNumber).toBeGreaterThan(result1.sequenceNumber);
    });
  });

  describe('getNextSequenceNumber', () => {
    it('should return 0 for game with no events', async () => {
      const next = await repo.getNextSequenceNumber('empty-game');
      expect(next).toBe(0);
    });

    it('should return max sequence number', async () => {
      const gid = 'test-game';
      const pid = 'test-puzzle';
      const event1 = createGameEvent(gid, pid);
      const event2 = createChatMessageEvent('user1', 'Test', 'User 1');

      await repo.addEvent({
        gid,
        eventType: 'create',
        eventPayload: event1,
        userId: event1.userId,
        timestamp: new Date(event1.timestamp),
        version: 1,
      });

      await repo.addEvent({
        gid,
        eventType: 'chat_message',
        eventPayload: event2,
        userId: event2.userId,
        timestamp: new Date(event2.timestamp),
        version: 1,
      });

      const next = await repo.getNextSequenceNumber(gid);
      expect(next).toBe(2);
    });
  });

  describe('getCreateEvent', () => {
    it('should return null for game with no create event', async () => {
      const createEvent = await repo.getCreateEvent('non-existent-game');
      expect(createEvent).toBeNull();
    });

    it('should return create event', async () => {
      const gid = 'test-game';
      const pid = 'test-puzzle';
      const event = createGameEvent(gid, pid);

      await repo.addEvent({
        gid,
        eventType: 'create',
        eventPayload: event,
        userId: event.userId,
        timestamp: new Date(event.timestamp),
        version: 1,
      });

      const createEvent = await repo.getCreateEvent(gid);
      expect(createEvent).not.toBeNull();
      expect(createEvent?.eventType).toBe('create');
    });
  });
});
