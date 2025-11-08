import {randomUUID} from 'crypto';
import {GameEventRepository, PuzzleRepository} from '../repositories';
import {NotFoundError} from '../lib/errors.js';
import type {
  GameEvent,
  CreateGameRequest,
  CreateGameResponse,
  GameState,
  GameId,
} from '@crosswithfriends/shared';
import type {CreateGameEvent} from '@crosswithfriends/shared';

export class GameService {
  constructor(
    private gameEventRepo: GameEventRepository,
    private puzzleRepo: PuzzleRepository
  ) {}

  async createGame(request: CreateGameRequest): Promise<CreateGameResponse> {
    const gid = request.gid || randomUUID();

    // Get puzzle to create initial game state
    const puzzle = await this.puzzleRepo.findByPid(request.pid);
    if (!puzzle) {
      throw new NotFoundError(`Puzzle ${request.pid} not found`);
    }

    // Create initial game event
    const initialEvent: CreateGameEvent = {
      type: 'create',
      timestamp: Date.now(),
      params: {
        pid: request.pid,
        version: '1.0',
        game: {
          info: puzzle.info,
          grid: this.initializeGrid(puzzle),
          solution: puzzle.solution,
          clues: puzzle.clues,
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          circles: (puzzle.circles ?? []) as unknown as import('@crosswithfriends/shared').CellIndex[],
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          shades: (puzzle.shades ?? []) as unknown as import('@crosswithfriends/shared').CellIndex[],
        },
      },
    };

    await this.gameEventRepo.addEvent({
      gid,
      eventType: 'create',
      eventPayload: initialEvent,
      userId: undefined,
      timestamp: new Date(),
      version: 1,
    });

    return {gid};
  }

  async getGameState(gid: GameId): Promise<GameState | null> {
    const events = await this.gameEventRepo.getEvents(gid);
    if (events.length === 0) {
      return null;
    }

    // Reconstruct game state from events (event sourcing)
    return this.reconstructGameState(gid, events);
  }

  async addGameEvent(gid: string, event: GameEvent): Promise<void> {
    await this.gameEventRepo.addEvent({
      gid,
      eventType: event.type,
      eventPayload: event,
      userId: event.userId,
      timestamp: new Date(event.timestamp),
      version: 1,
    });
  }

  async getGameEvents(gid: string): Promise<GameEvent[]> {
    return this.gameEventRepo.getEvents(gid);
  }

  private initializeGrid(puzzle: import('@crosswithfriends/shared').PuzzleJson) {
    // Initialize grid from solution - convert solution to grid format
    // This is a simplified version - full implementation would use gameUtils.makeGrid
    // to properly align clues and create the grid structure
    const rows = puzzle.solution.length;
    const cols = rows > 0 && puzzle.solution[0] ? puzzle.solution[0].length : 0;

    const grid: import('@crosswithfriends/shared').GridData = [];
    for (let r = 0; r < rows; r++) {
      const row: import('@crosswithfriends/shared').CellData[] = [];
      for (let c = 0; c < cols; c++) {
        const cell: import('@crosswithfriends/shared').CellData = {};
        if (puzzle.solution[r]?.[c] === '.') {
          cell.black = true;
        }
        row.push(cell);
      }
      grid.push(row);
    }

    return grid;
  }

  private reconstructGameState(gid: GameId, events: GameEvent[]): GameState {
    // Find create event
    const createEvent = events.find((e) => e.type === 'create');
    if (!createEvent) {
      throw new Error('Game state cannot be reconstructed without create event');
    }

    // Initialize state from create event
    const state: GameState = {
      gid,
      pid: createEvent.params.pid,
      game: createEvent.params.game,
      users: {},
      solved: false,
      clock: {
        lastUpdated: createEvent.timestamp,
        totalTime: 0,
        trueTotalTime: 0,
        paused: true,
      },
      chat: {
        messages: [],
      },
    };

    // Apply subsequent events to reconstruct state
    // This is a simplified version - full implementation would apply all event reducers
    for (const event of events) {
      if (event.type === 'puzzle_solved') {
        state.solved = true;
      } else if (event.type === 'chat_message' && 'params' in event) {
        state.chat.messages.push({
          message: event.params.message,
          userId: event.params.userId,
          displayName: event.params.displayName,
          timestamp: event.timestamp,
        });
      } else if (event.type === 'clock_update' && 'params' in event) {
        const action = event.params.action;
        if (action === 'start' || action === 'resume') {
          state.clock.paused = false;
        } else {
          // action must be 'pause' at this point
          state.clock.paused = true;
        }
        if (event.params.totalTime !== undefined) {
          state.clock.totalTime = event.params.totalTime;
        }
      }
    }

    return state;
  }
}
