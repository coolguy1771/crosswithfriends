import {describe, it, expect, beforeEach} from 'vitest';
import {RoomService} from '../room.service';
import {RoomEventRepository} from '../../repositories';
import {
  createUserJoinEvent,
  createUserLeaveEvent,
  createRoomSettingsUpdateEvent,
} from '../../test/fixtures/rooms';

describe('RoomService', () => {
  let roomService: RoomService;
  let roomEventRepo: RoomEventRepository;

  beforeEach(() => {
    roomEventRepo = new RoomEventRepository();
    roomService = new RoomService(roomEventRepo);
  });

  describe('createRoom', () => {
    it('should create a room with generated rid when not provided', async () => {
      const result = await roomService.createRoom({});
      expect(result.rid).toBeDefined();
      expect(typeof result.rid).toBe('string');
      expect(result.rid.length).toBeGreaterThan(0);
    });

    it('should create a room with custom rid when provided', async () => {
      const customRid = 'custom-room-id';
      const result = await roomService.createRoom({rid: customRid});
      expect(result.rid).toBe(customRid);
    });
  });

  describe('getRoomState', () => {
    it('should return null for non-existent room', async () => {
      const state = await roomService.getRoomState('non-existent-room');
      expect(state).toBeNull();
    });

    it('should reconstruct room state from events', async () => {
      const rid = 'test-room';
      const userId1 = 'user1';
      const userId2 = 'user2';

      // Add user join events
      await roomService.addRoomEvent(rid, createUserJoinEvent(userId1, 'User 1'));
      await roomService.addRoomEvent(rid, createUserJoinEvent(userId2, 'User 2'));

      const state = await roomService.getRoomState(rid);
      expect(state).not.toBeNull();
      expect(state?.rid).toBe(rid);
      expect(state?.users).toHaveLength(2);
      expect(state?.users.find((u) => u.userId === userId1)).toBeDefined();
      expect(state?.users.find((u) => u.userId === userId2)).toBeDefined();
    });

    it('should handle user leave events', async () => {
      const rid = 'test-room';
      const userId1 = 'user1';
      const userId2 = 'user2';

      await roomService.addRoomEvent(rid, createUserJoinEvent(userId1, 'User 1'));
      await roomService.addRoomEvent(rid, createUserJoinEvent(userId2, 'User 2'));
      await roomService.addRoomEvent(rid, createUserLeaveEvent(userId1));

      const state = await roomService.getRoomState(rid);
      expect(state?.users).toHaveLength(1);
      expect(state?.users[0]?.userId).toBe(userId2);
    });

    it('should handle room settings updates', async () => {
      const rid = 'test-room';
      await roomService.addRoomEvent(rid, createUserJoinEvent('user1', 'User 1'));
      await roomService.addRoomEvent(
        rid,
        createRoomSettingsUpdateEvent({maxPlayers: 4, gameMode: 'competitive'})
      );

      const state = await roomService.getRoomState(rid);
      expect(state?.settings).toEqual({
        maxPlayers: 4,
        gameMode: 'competitive',
      });
    });
  });

  describe('addRoomEvent', () => {
    it('should add room event successfully', async () => {
      const rid = 'test-room';
      const event = createUserJoinEvent('user1', 'User 1');

      await roomService.addRoomEvent(rid, event);

      const events = await roomService.getRoomEvents(rid);
      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe('user_join');
    });
  });

  describe('getRoomEvents', () => {
    it('should return empty array for non-existent room', async () => {
      const events = await roomService.getRoomEvents('non-existent-room');
      expect(events).toEqual([]);
    });

    it('should return events in order', async () => {
      const rid = 'test-room';
      const event1 = createUserJoinEvent('user1', 'User 1', {timestamp: 1000});
      const event2 = createUserJoinEvent('user2', 'User 2', {timestamp: 2000});

      await roomService.addRoomEvent(rid, event1);
      await roomService.addRoomEvent(rid, event2);

      const events = await roomService.getRoomEvents(rid);
      expect(events).toHaveLength(2);
      expect(events[0]?.timestamp).toBeLessThanOrEqual(events[1]?.timestamp || 0);
    });
  });
});
