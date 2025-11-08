import type {GameId, UserId, InfoJson, CluesJson, GridData, CellIndex} from './puzzle';

// ============================================================================
// Game Data Structures
// ============================================================================

/**
 * Game state representation with puzzle data and team information
 */
export interface GameJson {
  /** Puzzle metadata (title, author, copyright, description) */
  info: InfoJson;
  /** The main puzzle grid with cell data */
  grid: GridData;
  /** Optional per-team grids for team-based gameplay modes */
  teamGrids?: Record<number, GridData>; // TODO move to fencingState.teams[number].grid
  /** Optional per-team clue visibility settings */
  teamClueVisibility?: Record<
    number,
    {
      /** Array indicating which across clues are visible (true) or hidden (false) */
      across: boolean[]; // true --> visible, false --> hidden
      /** Array indicating which down clues are visible (true) or hidden (false) */
      down: boolean[];
    }
  >;
  /** The solution grid as a 2D array of strings */
  solution: string[][];
  /** Crossword clues organized by direction */
  clues: CluesJson;
  /** Optional array of cell indices that should be circled */
  circles?: CellIndex[];
  /** Optional array of cell indices that should be shaded */
  shades?: CellIndex[];
}

/**
 * User information in a game context
 */
export interface UserJson {
  /** The unique identifier of the user */
  id: string;
  /** The current cursor position of the user in the puzzle grid */
  cursor?: Cursor;
  /** The display name of the user */
  displayName: string;
  /** Optional team ID for team-based gameplay */
  teamId?: number;
  /** Optional score for the user in this game */
  score?: number;
  /** Optional count of incorrect entries */
  misses?: number;
}

/**
 * Cursor position for a user in the puzzle grid
 */
export interface Cursor {
  /** The unique identifier of the cursor/user */
  id: string;
  /** Row position in the puzzle grid (0-indexed) */
  r: number; // Row in puzzle
  /** Column position in the puzzle grid (0-indexed) */
  c: number; // Column in puzzle
  /** Timestamp when the cursor was last updated (Unix timestamp in milliseconds) */
  timestamp: number;
  /** Optional color for the cursor display */
  color?: string;
  /** Whether the cursor is currently active */
  active?: boolean;
  /** Optional display name associated with the cursor */
  displayName?: string;
}

// ============================================================================
// Game Event Types (Event Sourcing)
// ============================================================================

/**
 * All possible game event types (per technical spec)
 */
export type GameEventType =
  | 'create'
  | 'cell_fill'
  | 'cell_clear'
  | 'cell_check'
  | 'cell_reveal'
  | 'cursor_move'
  | 'chat_message'
  | 'clock_update'
  | 'puzzle_solved';

/**
 * Base interface for all game events
 * 
 * All game events follow the event sourcing pattern and include a type,
 * timestamp, and optional user ID for attribution.
 */
export interface BaseGameEvent<T extends GameEventType = GameEventType> {
  /** The type of game event */
  type: T;
  /** Timestamp when the event occurred (Unix timestamp in milliseconds) */
  timestamp: number;
  /** Optional user ID that triggered the event */
  userId?: UserId;
}

/**
 * Event emitted when a new game is created
 */
export interface CreateGameEvent extends BaseGameEvent<'create'> {
  params: {
    /** The puzzle ID this game is based on */
    pid: string;
    /** Version identifier for the game */
    version: string;
    /** The initial game state */
    game: GameJson;
  };
}

/**
 * Event emitted when a user fills a cell in the puzzle
 */
export interface CellFillGameEvent extends BaseGameEvent<'cell_fill'> {
  params: {
    /** Row index of the cell (0-indexed) */
    row: number;
    /** Column index of the cell (0-indexed) */
    col: number;
    /** The value entered into the cell */
    value: string;
  };
}

/**
 * Event emitted when a user clears a cell in the puzzle
 */
export interface CellClearGameEvent extends BaseGameEvent<'cell_clear'> {
  params: {
    /** Row index of the cell (0-indexed) */
    row: number;
    /** Column index of the cell (0-indexed) */
    col: number;
  };
}

/**
 * Event emitted when a user checks a cell for correctness
 */
export interface CellCheckGameEvent extends BaseGameEvent<'cell_check'> {
  params: {
    /** Row index of the cell (0-indexed) */
    row: number;
    /** Column index of the cell (0-indexed) */
    col: number;
  };
}

/**
 * Event emitted when a cell is revealed (showing the correct answer)
 */
export interface CellRevealGameEvent extends BaseGameEvent<'cell_reveal'> {
  params: {
    /** Row index of the cell (0-indexed) */
    row: number;
    /** Column index of the cell (0-indexed) */
    col: number;
  };
}

/**
 * Event emitted when a user moves their cursor in the puzzle
 */
export interface CursorMoveGameEvent extends BaseGameEvent<'cursor_move'> {
  params: {
    /** The new cursor position and state */
    cursor: Cursor;
  };
}

/**
 * Event emitted when a chat message is sent in the game
 */
export interface ChatMessageGameEvent extends BaseGameEvent<'chat_message'> {
  params: {
    /** The chat message content */
    message: string;
    /** The unique identifier of the user sending the message */
    userId: UserId;
    /** The display name of the user sending the message */
    displayName: string;
  };
}

/**
 * Event emitted when the game clock is updated (started, paused, or resumed)
 */
export interface ClockUpdateGameEvent extends BaseGameEvent<'clock_update'> {
  params: {
    /** The action to perform on the clock */
    action: 'start' | 'pause' | 'resume';
    /** Optional total time elapsed (in milliseconds) */
    totalTime?: number;
  };
}

/**
 * Event emitted when the puzzle is solved
 */
export interface PuzzleSolvedGameEvent extends BaseGameEvent<'puzzle_solved'> {
  params: {
    /** Timestamp when the puzzle was solved (Unix timestamp in milliseconds) */
    solvedAt: number;
    /** Total time taken to solve the puzzle (in milliseconds) */
    timeTaken: number;
  };
}

/**
 * Union type for all game events
 */
export type GameEvent =
  | CreateGameEvent
  | CellFillGameEvent
  | CellClearGameEvent
  | CellCheckGameEvent
  | CellRevealGameEvent
  | CursorMoveGameEvent
  | ChatMessageGameEvent
  | ClockUpdateGameEvent
  | PuzzleSolvedGameEvent;

// ============================================================================
// Game State
// ============================================================================

/**
 * Game state derived from events (event sourcing pattern)
 * 
 * This state is computed by replaying all game events in order.
 */
export interface GameState {
  /** The unique identifier of the game */
  gid: GameId;
  /** The puzzle ID this game is based on */
  pid: string;
  /** The current game state with puzzle data */
  game: GameJson;
  /** Map of user IDs to user information */
  users: Record<string, UserJson>;
  /** Whether the puzzle has been solved */
  solved: boolean;
  /** Game clock state */
  clock: {
    /** Timestamp when the clock was last updated (Unix timestamp in milliseconds) */
    lastUpdated: number;
    /** Total time elapsed (accounting for pauses) in milliseconds */
    totalTime: number;
    /** True total time elapsed (including paused time) in milliseconds */
    trueTotalTime: number;
    /** Whether the clock is currently paused */
    paused: boolean;
  };
  /** Chat messages in the game */
  chat: {
    /** Array of chat messages */
    messages: Array<{
      /** The message content */
      message: string;
      /** The unique identifier of the user who sent the message */
      userId: UserId;
      /** The display name of the user who sent the message */
      displayName: string;
      /** Timestamp when the message was sent (Unix timestamp in milliseconds) */
      timestamp: number;
    }>;
  };
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request to create a new game
 */
export interface CreateGameRequest {
  /** The unique identifier for the game */
  gid: string;
  /** The puzzle ID to use for this game */
  pid: string;
}

/**
 * Response after creating a game
 */
export interface CreateGameResponse {
  /** The unique identifier of the created game */
  gid: string;
}

/**
 * Request to record a puzzle solve
 */
export interface RecordSolveRequest {
  /** The unique identifier of the game */
  gid: string;
  /** Time taken to solve the puzzle (in milliseconds) */
  time_to_solve: number;
}

/**
 * Response after recording a puzzle solve
 */
export interface RecordSolveResponse {}

/**
 * Request to increment and get the next game ID
 */
export interface IncrementGidRequest {}

/**
 * Response containing the next game ID
 */
export interface IncrementGidResponse {
  /** The next available game ID */
  gid: string;
}
