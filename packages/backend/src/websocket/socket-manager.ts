import {Server as SocketIOServer} from 'socket.io';
import type {Server as HTTPServer} from 'http';
import {createAdapter} from '@socket.io/redis-adapter';
import {GameEventRepository, RoomEventRepository} from '../repositories';
import {GameService, RoomService} from '../services';
import {getEnv} from '../config/env.js';
import {getRedisClient} from '../config/redis.js';
import type {GameEvent, RoomEvent} from '@crosswithfriends/shared';
import type Redis from 'ioredis';

interface SocketEvent {
  [key: string]: unknown;
}

// Look for { .sv: 'timestamp' } and replace with Date.now()
function assignTimestamp(event: SocketEvent): SocketEvent | number {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (event && typeof event === 'object') {
    if (event['.sv'] === 'timestamp') {
      return Date.now();
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const result = event.constructor() as SocketEvent;

    for (const key in event) {
      result[key] = assignTimestamp(event[key] as SocketEvent);
    }
    return result;
  }
  return event;
}

export class SocketManager {
  private io: SocketIOServer;
  private gameEventRepo: GameEventRepository;
  private roomEventRepo: RoomEventRepository;
  private gameService: GameService;
  private roomService: RoomService;
  private redisClient: Redis | null = null;
  private redisSubClient: Redis | null = null;

  constructor(
    httpServer: HTTPServer,
    gameEventRepo: GameEventRepository,
    roomEventRepo: RoomEventRepository,
    gameService: GameService,
    roomService: RoomService
  ) {
    const env = getEnv();
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(','),
        methods: ['GET', 'POST'],
      },
      pingInterval: 2000,
      pingTimeout: 5000,
    });

    // Configure Redis adapter if REDIS_URL is provided
    if (env.REDIS_URL) {
      try {
        this.redisClient = getRedisClient();
        // Create a separate Redis client for subscriptions (required by Socket.IO adapter)
        this.redisSubClient = this.redisClient.duplicate();

        this.io.adapter(createAdapter(this.redisClient, this.redisSubClient));
        if (process.env.NODE_ENV !== 'test') {
          // eslint-disable-next-line no-console
          console.log('Socket.IO Redis adapter configured');
        }
      } catch (error) {
        if (process.env.NODE_ENV !== 'test') {
          console.warn('Failed to configure Redis adapter for Socket.IO:', error);
          console.warn('Falling back to in-memory adapter (not suitable for horizontal scaling)');
        }
      }
    }

    this.gameEventRepo = gameEventRepo;
    this.roomEventRepo = roomEventRepo;
    this.gameService = gameService;
    this.roomService = roomService;
  }

  async addGameEvent(gid: string, event: SocketEvent): Promise<void> {
    const gameEvent: GameEvent = assignTimestamp(event) as unknown as GameEvent;
    await this.gameEventRepo.addEvent({
      gid,
      eventType: gameEvent.type,
      eventPayload: gameEvent,
      userId: gameEvent.userId,
      timestamp: new Date(gameEvent.timestamp),
      version: 1,
    });
    void this.io.to(`game-${gid}`).emit('game_event', gameEvent);
  }

  async addRoomEvent(rid: string, event: SocketEvent): Promise<void> {
    const roomEvent: RoomEvent = assignTimestamp(event) as unknown as RoomEvent;
    await this.roomEventRepo.addEvent({
      rid,
      eventType: roomEvent.type,
      eventPayload: roomEvent,
      userId: roomEvent.userId,
      timestamp: new Date(roomEvent.timestamp),
    });
    void this.io.to(`room-${rid}`).emit('room_event', roomEvent);
  }

  listen(): void {
    this.io.on('connection', (socket) => {
      // ======== Game Events ========= //
      socket.on('join_game', (gid: string, ack?: () => void) => {
        try {
          const result = socket.join(`game-${gid}`);
          if (result instanceof Promise) {
            void result
              .then(() => {
                ack?.();
              })
              .catch(() => {
                socket.emit('error', {message: 'Failed to join game'});
                ack?.();
              });
          } else {
            ack?.();
          }
        } catch {
          socket.emit('error', {message: 'Failed to join game'});
          ack?.();
        }
      });

      socket.on('leave_game', (gid: string, ack?: () => void) => {
        try {
          const result = socket.leave(`game-${gid}`);
          if (result instanceof Promise) {
            void result
              .then(() => {
                ack?.();
              })
              .catch(() => {
                socket.emit('error', {message: 'Failed to leave game'});
                ack?.();
              });
          } else {
            ack?.();
          }
        } catch {
          socket.emit('error', {message: 'Failed to leave game'});
          ack?.();
        }
      });

      socket.on('sync_all_game_events', async (gid: string, ack?: (events: GameEvent[]) => void) => {
        try {
          const events = await this.gameService.getGameEvents(gid);
          ack?.(events);
        } catch {
          socket.emit('error', {message: 'Failed to sync game events'});
          ack?.([]);
        }
      });

      socket.on('game_event', async (message: {gid: string; event: SocketEvent}, ack?: () => void) => {
        try {
          await this.addGameEvent(message.gid, message.event);
          ack?.();
        } catch {
          socket.emit('error', {message: 'Failed to add game event'});
          ack?.();
        }
      });

      // ======== Room Events ========= //
      socket.on('join_room', (rid: string, ack?: () => void) => {
        try {
          const result = socket.join(`room-${rid}`);
          if (result instanceof Promise) {
            void result
              .then(() => {
                ack?.();
              })
              .catch(() => {
                socket.emit('error', {message: 'Failed to join room'});
                ack?.();
              });
          } else {
            ack?.();
          }
        } catch {
          socket.emit('error', {message: 'Failed to join room'});
          ack?.();
        }
      });

      socket.on('leave_room', (rid: string, ack?: () => void) => {
        try {
          const result = socket.leave(`room-${rid}`);
          if (result instanceof Promise) {
            void result
              .then(() => {
                ack?.();
              })
              .catch(() => {
                socket.emit('error', {message: 'Failed to leave room'});
                ack?.();
              });
          } else {
            ack?.();
          }
        } catch {
          socket.emit('error', {message: 'Failed to leave room'});
          ack?.();
        }
      });

      socket.on('sync_all_room_events', async (rid: string, ack?: (events: RoomEvent[]) => void) => {
        try {
          const events = await this.roomService.getRoomEvents(rid);
          ack?.(events);
        } catch {
          socket.emit('error', {message: 'Failed to sync room events'});
          ack?.([]);
        }
      });

      socket.on('room_event', async (message: {rid: string; event: SocketEvent}, ack?: () => void) => {
        try {
          await this.addRoomEvent(message.rid, message.event);
          ack?.();
        } catch {
          socket.emit('error', {message: 'Failed to add room event'});
          ack?.();
        }
      });
    });
  }

  getIO(): SocketIOServer {
    return this.io;
  }
}
