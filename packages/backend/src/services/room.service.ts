import {randomUUID} from 'crypto';
import {RoomEventRepository} from '../repositories';
import type {
  RoomEvent,
  CreateRoomRequest,
  CreateRoomResponse,
  RoomState,
  RoomId,
} from '@crosswithfriends/shared';

export class RoomService {
  constructor(private roomEventRepo: RoomEventRepository) {}

  async createRoom(request: CreateRoomRequest): Promise<CreateRoomResponse> {
    const rid = request.rid ?? randomUUID();

    // Create initial room_settings_update event to persist the room
    const initialEvent: RoomEvent = {
      type: 'room_settings_update',
      timestamp: Date.now(),
      params: {
        settings: {},
      },
    };

    // Persist the initial event and await the write
    await this.roomEventRepo.addEvent({
      rid,
      eventType: initialEvent.type,
      eventPayload: initialEvent,
      userId: initialEvent.userId ?? undefined,
      timestamp: new Date(initialEvent.timestamp),
    });

    return {rid};
  }

  async getRoomState(rid: RoomId): Promise<RoomState | null> {
    const events = await this.roomEventRepo.getEvents(rid);
    if (events.length === 0) {
      return null;
    }

    return this.reconstructRoomState(rid, events);
  }

  async addRoomEvent(rid: RoomId, event: RoomEvent): Promise<void> {
    await this.roomEventRepo.addEvent({
      rid,
      eventType: event.type,
      eventPayload: event,
      userId: event.userId,
      timestamp: new Date(event.timestamp),
    });
  }

  async getRoomEvents(rid: RoomId | string): Promise<RoomEvent[]> {
    return this.roomEventRepo.getEvents(rid);
  }

  private reconstructRoomState(rid: RoomId, events: RoomEvent[]): RoomState {
    const state: RoomState = {
      rid,
      users: [],
      settings: {},
    };

    const userMap = new Map<
      string,
      {userId: import('@crosswithfriends/shared').UserId; displayName: string; joinedAt: number}
    >();

    for (const event of events) {
      if (event.type === 'user_join' && 'params' in event) {
        const params = event.params;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (params && 'userId' in params && 'displayName' in params) {
          userMap.set(params.userId, {
            userId: params.userId,
            displayName: params.displayName,
            joinedAt: event.timestamp,
          });
        }
      } else if (event.type === 'user_leave' && 'params' in event) {
        const params = event.params;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (params && 'userId' in params) {
          userMap.delete(params.userId);
        }
      } else if (event.type === 'room_settings_update' && 'params' in event) {
        const params = event.params;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (params && 'settings' in params) {
          state.settings = {...state.settings, ...params.settings};
        }
      }
    }

    state.users = Array.from(userMap.values());

    return state;
  }
}
