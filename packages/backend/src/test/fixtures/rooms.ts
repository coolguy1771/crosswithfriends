import type {
  RoomEvent,
  UserJoinRoomEvent,
  UserLeaveRoomEvent,
  ChatMessageRoomEvent,
  RoomSettingsUpdateRoomEvent,
  UserId,
} from '@crosswithfriends/shared';

/**
 * Create a user join room event
 */
export function createUserJoinEvent(
  userId: string,
  displayName: string,
  overrides?: Partial<UserJoinRoomEvent>
): UserJoinRoomEvent {
  return {
    type: 'user_join',
    timestamp: Date.now(),
    userId: userId as UserId,
    params: {
      userId: userId as UserId,
      displayName,
    },
    ...overrides,
  };
}

/**
 * Create a user leave room event
 */
export function createUserLeaveEvent(
  userId: string,
  overrides?: Partial<UserLeaveRoomEvent>
): UserLeaveRoomEvent {
  return {
    type: 'user_leave',
    timestamp: Date.now(),
    userId: userId as UserId,
    params: {
      userId: userId as UserId,
    },
    ...overrides,
  };
}

/**
 * Create a chat message room event
 */
export function createRoomChatMessageEvent(
  userId: string,
  message: string,
  displayName: string,
  overrides?: Partial<ChatMessageRoomEvent>
): ChatMessageRoomEvent {
  return {
    type: 'chat_message',
    timestamp: Date.now(),
    userId: userId as UserId,
    params: {
      message,
      userId: userId as UserId,
      displayName,
    },
    ...overrides,
  };
}

/**
 * Create a room settings update event
 */
export function createRoomSettingsUpdateEvent(
  settings: Record<string, unknown>,
  overrides?: Partial<RoomSettingsUpdateRoomEvent>
): RoomSettingsUpdateRoomEvent {
  return {
    type: 'room_settings_update',
    timestamp: Date.now(),
    params: {
      settings,
    },
    ...overrides,
  };
}

/**
 * Create a sequence of room events for testing
 */
export function createRoomEventSequence(_rid: string): RoomEvent[] {
  return [
    createUserJoinEvent('user1', 'User 1', {timestamp: Date.now()}),
    createUserJoinEvent('user2', 'User 2', {timestamp: Date.now() + 1000}),
    createRoomChatMessageEvent('user1', 'Hello!', 'User 1', {timestamp: Date.now() + 2000}),
  ];
}
