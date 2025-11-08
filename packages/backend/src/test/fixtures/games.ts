import type {
  GameEvent,
  CreateGameEvent,
  ChatMessageGameEvent,
  ClockUpdateGameEvent,
  UserId,
} from '@crosswithfriends/shared';
import {createTestPuzzle} from './puzzles';

/**
 * Create a create game event
 */
export function createGameEvent(
  _gid: string,
  pid: string,
  overrides?: Partial<CreateGameEvent>
): CreateGameEvent {
  const puzzle = createTestPuzzle();
  // Initialize grid as GridData (CellData[][]) - empty cells for new game
  const grid = puzzle.solution.map((row) =>
    row.map((cell) => {
      const cellData: Record<string, unknown> = {};
      if (cell === '.') {
        cellData.black = true;
      }
      return cellData;
    })
  );

  return {
    type: 'create',
    timestamp: Date.now(),
    params: {
      pid,
      version: '1.0',
      game: {
        info: puzzle.info,
        grid,
        solution: puzzle.solution,
        clues: puzzle.clues,
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        circles: (puzzle.circles ?? []) as unknown as import('@crosswithfriends/shared').CellIndex[],
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        shades: (puzzle.shades ?? []) as unknown as import('@crosswithfriends/shared').CellIndex[],
      },
      ...overrides?.params,
    },
    ...overrides,
  };
}

/**
 * Create a chat message game event
 */
export function createChatMessageEvent(
  userId: string,
  message: string,
  displayName: string,
  overrides?: Partial<ChatMessageGameEvent>
): ChatMessageGameEvent {
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
 * Create a clock update game event
 */
export function createClockUpdateEvent(
  action: 'start' | 'pause' | 'resume',
  totalTime?: number,
  overrides?: Partial<ClockUpdateGameEvent>
): ClockUpdateGameEvent {
  return {
    type: 'clock_update',
    timestamp: Date.now(),
    params: {
      action,
      ...(totalTime !== undefined ? {totalTime} : {}),
    },
    ...overrides,
  };
}

/**
 * Create a sequence of game events for testing
 */
export function createGameEventSequence(gid: string, pid: string): GameEvent[] {
  return [
    createGameEvent(gid, pid),
    createChatMessageEvent('user1', 'Hello!', 'User 1'),
    createClockUpdateEvent('start'),
  ];
}
