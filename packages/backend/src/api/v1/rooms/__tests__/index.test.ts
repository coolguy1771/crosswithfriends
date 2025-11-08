import {describe, it, expect, beforeEach} from 'vitest';
import {getTestApp} from '../../../../test/helpers/app';
import type {FastifyInstance} from 'fastify';
import {createUserJoinEvent} from '../../../../test/fixtures/rooms';
import {RoomService} from '../../../../services';
import {RoomEventRepository} from '../../../../repositories';

describe('Rooms API', () => {
  let app: FastifyInstance;
  let roomService: RoomService;

  beforeEach(async () => {
    app = await getTestApp();
    const roomEventRepo = new RoomEventRepository();
    roomService = new RoomService(roomEventRepo);
  });

  describe('POST /api/v1/rooms', () => {
    it('should create a room with generated rid', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/rooms',
        payload: {},
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.rid).toBeDefined();
      expect(typeof body.rid).toBe('string');
    });

    it('should create a room with custom rid', async () => {
      const customRid = 'custom-room-123';
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/rooms',
        payload: {rid: customRid},
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.rid).toBe(customRid);
    });
  });

  describe('GET /api/v1/rooms/:rid', () => {
    it('should return 404 for non-existent room', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/rooms/non-existent-room',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return room state', async () => {
      const rid = 'test-room-get';
      await roomService.addRoomEvent(rid, createUserJoinEvent('user1', 'User 1'));

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/rooms/${rid}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.room).toBeDefined();
      expect(body.room.rid).toBe(rid);
      expect(body.room.users).toHaveLength(1);
    });
  });

  describe('GET /api/v1/rooms/:rid/events', () => {
    it('should return empty array for non-existent room', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/rooms/non-existent-room/events',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.events).toEqual([]);
    });

    it('should return room events', async () => {
      const rid = 'test-room-events';
      await roomService.addRoomEvent(rid, createUserJoinEvent('user1', 'User 1'));

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/rooms/${rid}/events`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.events).toHaveLength(1);
      expect(body.events[0]?.type).toBe('user_join');
    });
  });
});
