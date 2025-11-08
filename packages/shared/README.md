# @crosswithfriends/shared

Shared TypeScript types and utilities used by both frontend and backend packages.

## Structure

```text
src/
├── types/        # TypeScript type definitions
│   ├── puzzle.ts  # Core puzzle data structures, branded IDs, puzzle API types
│   ├── game.ts    # Game state, events, and game API types
│   ├── room.ts    # Room state, events, and room API types
│   └── index.ts   # Central export point for all types
└── utils/         # Shared utility functions (currently empty)
    └── index.ts
```

## Usage

### Importing Types

All types can be imported from the main package:

```typescript
import {
  // Branded ID types
  PuzzleId,
  GameId,
  RoomId,
  UserId,

  // Puzzle types
  PuzzleJson,
  InfoJson,
  CluesJson,
  CellData,
  GridData,

  // Game types
  GameJson,
  GameState,
  GameEvent,
  UserJson,
  Cursor,

  // Room types
  RoomState,
  RoomEvent,

  // API types
  CreateGameRequest,
  CreateGameResponse,
  CreateRoomRequest,
  CreateRoomResponse,
} from '@crosswithfriends/shared';
```

### In Backend

```typescript
import type {PuzzleId, GameId, PuzzleJson, GameEvent} from '@crosswithfriends/shared';

// Example: Repository using types
async function getPuzzle(pid: PuzzleId): Promise<PuzzleJson> {
  // ...
}
```

### In Frontend

```typescript
import type {GameState, GameEvent, RoomState, GridData} from '@crosswithfriends/shared';

// Example: Store using types
const gameState: GameState = {
  gid: 'game-123' as GameId,
  // ...
};
```

## Development

```bash
# Build
pnpm run build

# Type check
pnpm run typecheck

# Watch mode
pnpm run dev
```

## Type Organization

### puzzle.ts

Core puzzle data structures and puzzle-related API types:

- **Data Structures**: `InfoJson`, `CluesJson`, `CellData`, `GridData`, `PuzzleJson`, `PuzzleStatsJson`
- **Utility Types**: `CellIndex`, `CellCoords`
- **Branded IDs**: `PuzzleId`, `GameId`, `RoomId`, `UserId`
- **API Types**: `AddPuzzleRequest`, `ListPuzzleRequest`, `ListPuzzleResponse`, etc.

### game.ts

Game state, events, and game-related API types:

- **Data Structures**: `GameJson`, `UserJson`, `Cursor`
- **Event Types**: `GameEventType`, `BaseGameEvent`, specific event interfaces, `GameEvent` union
- **State**: `GameState` (derived from events using event sourcing pattern)
- **API Types**: `CreateGameRequest`, `CreateGameResponse`, `RecordSolveRequest`, etc.

### room.ts

Room state, events, and room-related API types:

- **Event Types**: `RoomEventType`, `BaseRoomEvent`, specific event interfaces, `RoomEvent` union
- **State**: `RoomState` (derived from events using event sourcing pattern)
- **API Types**: `CreateRoomRequest`, `CreateRoomResponse`

## Key Type Categories

### Branded ID Types

Type-safe identifiers that prevent mixing different ID types:

- `PuzzleId`, `GameId`, `RoomId`, `UserId`

### Event Sourcing Types

Types for event-driven architecture:

- `GameEvent` - Union of all game events (create, cell_fill, cell_clear, etc.)
- `RoomEvent` - Union of all room events (user_join, user_leave, etc.)
- `GameState` / `RoomState` - State derived from events

### Puzzle Data Types

Core crossword puzzle structures:

- `PuzzleJson` - Complete puzzle data (grid, solution, clues, metadata)
- `CellData` - Individual cell state (value, black, number, etc.)
- `GridData` - Two-dimensional array of cells
