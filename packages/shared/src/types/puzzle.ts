import type {Brand} from 'utility-types';

// ============================================================================
// Core Puzzle Data Structures
// ============================================================================

/**
 * Puzzle metadata information
 */
export interface InfoJson {
  /** Optional puzzle type (sometimes set by the frontend, e.g. by the FileUpload module) */
  type?: string; // this is sometimes set by the frontend, e.g. by the FileUpload module
  /** The title of the puzzle */
  title: string;
  /** The author of the puzzle */
  author: string;
  /** Copyright information for the puzzle */
  copyright: string;
  /** Description or notes about the puzzle */
  description: string;
}

/**
 * Crossword clues organized by direction
 */
export interface CluesJson {
  /** Array of across clues, indexed by clue number */
  across: string[];
  /** Array of down clues, indexed by clue number */
  down: string[];
}

/**
 * Individual cell data in the puzzle grid
 */
export interface CellData {
  /** The current value entered in the cell */
  value?: string;
  /** Whether this is a black/blocked cell */
  black?: boolean;
  /** The clue number for this cell (if it's the start of a word) */
  number?: number;
  /** Whether the cell has been revealed (showing the correct answer) */
  revealed?: boolean;
  /** Whether the cell is marked as incorrect */
  bad?: boolean;
  /** Whether the cell is marked as correct */
  good?: boolean;
  /** Whether the value is in pencil mode (tentative entry) */
  pencil?: boolean;
  /** Used for fencing mode; if true, then player cannot access the cell at all */
  isHidden?: boolean; // used for fencing mode; if true, then player cannot access the cell at all
  /** Information about who solved this cell (for team-based gameplay) */
  solvedBy?: {
    /** The user ID who solved the cell */
    id: string;
    /** The team ID who solved the cell */
    teamId: number;
  };
  /** The parent clue numbers for this cell */
  parents?: {
    /** The across clue number this cell belongs to */
    across: number;
    /** The down clue number this cell belongs to */
    down: number;
  };
}

/**
 * Two-dimensional grid of cells
 */
export type GridData = CellData[][];

/**
 * PuzzleJson: the json format of puzzles stored in the db (both firebase & postgres)
 *
 * Fields are a bit messy & don't correspond perfectly with puzjs formats... see logic in FileUploader.js
 */
export interface PuzzleJson {
  /** The puzzle grid as a 2D array of strings (empty cells represented as empty strings) */
  grid: string[][];
  /** The solution grid as a 2D array of strings */
  solution: string[][];
  /** Puzzle metadata (title, author, copyright, description) */
  info: InfoJson;
  /** Array of cell coordinates that should be circled (format: "row,col") */
  circles: string[];
  /** Array of cell coordinates that should be shaded (format: "row,col") */
  shades: string[];
  /** Crossword clues organized by direction */
  clues: CluesJson;
  /** Whether the puzzle is private (not publicly visible) */
  private?: boolean;
}

/**
 * Statistics for a puzzle
 */
export interface PuzzleStatsJson {
  /** Total number of times this puzzle has been solved */
  numSolves: number;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Branded type for cell indices (row * cols + col)
 *
 * This provides type safety when working with cell indices in the puzzle grid.
 */
export type CellIndex = Brand<number, 'CellIndex'>;

/**
 * Converts row and column coordinates to a cell index
 *
 * @param r - Row index (0-indexed)
 * @param c - Column index (0-indexed)
 * @param cols - Total number of columns in the grid
 * @returns The cell index as a branded type
 */
export const toCellIndex = (r: number, c: number, cols: number): CellIndex => (r * cols + c) as CellIndex;

/**
 * Cell coordinates (row, column)
 */
export type CellCoords = {r: number; c: number};

// ============================================================================
// Branded ID Types
// ============================================================================

/**
 * Branded types for IDs to prevent mixing different ID types (per technical spec)
 *
 * These branded types provide compile-time type safety to prevent accidentally
 * using the wrong type of ID (e.g., passing a GameId where a PuzzleId is expected).
 */

/** Branded type for puzzle identifiers */
export type PuzzleId = Brand<string, 'PuzzleId'>;

/** Branded type for game identifiers */
export type GameId = Brand<string, 'GameId'>;

/** Branded type for room identifiers */
export type RoomId = Brand<string, 'RoomId'>;

/** Branded type for user identifiers */
export type UserId = Brand<string, 'UserId'>;

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request to add a new puzzle to the database
 */
export interface AddPuzzleRequest {
  /** The puzzle data to add */
  puzzle: PuzzleJson;
  /** Optional puzzle ID. If not provided, a new one is generated by the backend */
  pid?: string; // if not provided, a new one is generated by backend
  /** Whether the puzzle should be publicly visible */
  isPublic: boolean;
}

/**
 * Response after adding a puzzle
 */
export interface AddPuzzleResponse {
  /** The unique identifier of the added puzzle */
  pid: string;
}

/**
 * Request to list puzzles with filtering and pagination
 */
export interface ListPuzzleRequest {
  /** Filter criteria for the puzzle list */
  filter: ListPuzzleRequestFilters;
  /** Page number (1-indexed) */
  page: number;
  /** Number of puzzles per page */
  pageSize: number;
}

/**
 * Filter criteria for listing puzzles
 */
export interface ListPuzzleRequestFilters {
  /** Filter by puzzle size */
  sizeFilter: {
    /** Include mini puzzles */
    Mini: boolean;
    /** Include standard puzzles */
    Standard: boolean;
  };
  /** Filter by puzzle name or title (case-insensitive partial match) */
  nameOrTitleFilter: string;
}

/**
 * Response containing a list of puzzles
 */
export interface ListPuzzleResponse {
  /** Array of puzzles matching the request criteria */
  puzzles: {
    /** The unique identifier of the puzzle */
    pid: string;
    /** The puzzle content */
    content: PuzzleJson;
    /** Statistics for the puzzle */
    stats: PuzzleStatsJson;
  }[];
}

/**
 * Request to get puzzle statistics for a list of games
 */
export interface ListPuzzleStatsRequest {
  /** Array of game IDs to get statistics for */
  gids: string[];
}

/**
 * Response containing puzzle statistics and solve history
 */
export interface ListPuzzleStatsResponse {
  /** Aggregate statistics grouped by puzzle size */
  stats: {
    /** The puzzle size category */
    size: string;
    /** Number of puzzles solved in this size category */
    nPuzzlesSolved: number;
    /** Average solve time in milliseconds */
    avgSolveTime: number;
    /** Best (fastest) solve time in milliseconds */
    bestSolveTime: number;
    /** Game ID of the best solve time */
    bestSolveTimeGameId: string;
    /** Average number of squares checked */
    avgCheckedSquareCount: number;
    /** Average number of squares revealed */
    avgRevealedSquareCount: number;
  }[];
  /** History of puzzle solves */
  history: {
    /** The puzzle ID */
    puzzleId: string;
    /** The game ID */
    gameId: string;
    /** The puzzle title */
    title: string;
    /** The puzzle size */
    size: string;
    /** Date when the puzzle was solved (ISO 8601 format) */
    dateSolved: string;
    /** Time taken to solve in milliseconds */
    solveTime: number;
    /** Number of squares checked during solve */
    checkedSquareCount: number;
    /** Number of squares revealed during solve */
    revealedSquareCount: number;
  }[];
}

/**
 * Request to increment and get the next puzzle ID
 */
export type IncrementPidRequest = Record<string, never>;

/**
 * Response containing the next puzzle ID
 */
export interface IncrementPidResponse {
  /** The next available puzzle ID */
  pid: string;
}
