# @crosswithfriends/backend

Backend server for CrossWithFriends using Fastify, Drizzle ORM, and Socket.IO.

## Development

```bash
# Install dependencies (from project root)
pnpm install

# Run development server
pnpm --filter='./packages/backend' dev
# Or from project root:
pnpm run dev:backend

# Type check
pnpm --filter='./packages/backend' typecheck

# Run tests
pnpm --filter='./packages/backend' test

# Run tests in watch mode
pnpm --filter='./packages/backend' test:watch

# Run tests with UI
pnpm --filter='./packages/backend' test:ui

# Run tests with coverage
pnpm --filter='./packages/backend' test:coverage

# Build
pnpm --filter='./packages/backend' build

# Lint
pnpm --filter='./packages/backend' lint

# Lint and fix
pnpm --filter='./packages/backend' lint:fix
```

## Database

```bash
# Generate migrations (after schema changes)
pnpm --filter='./packages/backend' db:generate

# Run migrations
pnpm --filter='./packages/backend' db:migrate
# Or from project root:
pnpm run db:migrate

# Open Drizzle Studio (database GUI)
pnpm --filter='./packages/backend' db:studio

# Seed database with sample data
pnpm --filter='./packages/backend' db:seed
# Or from project root:
pnpm run db:seed
```

## Environment Variables

Create a `.env` file in `packages/backend/`:

```env
# Environment
NODE_ENV=development

# Server Configuration
PORT=3021

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/dfac

# Redis (optional, for Socket.IO scaling and distributed rate limiting)
REDIS_URL=redis://localhost:6379

# CORS
CORS_ORIGIN=*

# Logging
LOG_LEVEL=info
```

**Note:** `REDIS_URL` is optional. If not provided:

- Socket.IO will use in-memory adapter (not suitable for horizontal scaling)
- Rate limiting will use in-memory store (limits won't be shared across instances)

For production, ensure all required environment variables are set and use secure values for credentials.

## API Schema

All endpoints are prefixed with `/api/v1`.

### Puzzles

#### `GET /api/v1/puzzles`

List puzzles with pagination and filtering.

**Query Parameters:**

- `filter.sizeFilter.Mini` (boolean): Filter by Mini puzzles
- `filter.sizeFilter.Standard` (boolean): Filter by Standard puzzles
- `filter.nameOrTitleFilter` (string): Filter by name or title
- `page` (number, required): Page number (positive integer)
- `pageSize` (number, required): Items per page (1-100)

**Response:**

```json
{
  "puzzles": [...],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 100
  }
}
```

#### `GET /api/v1/puzzles/:pid`

Get puzzle by ID.

**Response:**

```json
{
  "puzzle": {
    "pid": "string",
    "grid": [["string"]],
    "solution": [["string"]],
    "info": {
      "type": "string",
      "title": "string",
      "author": "string",
      "copyright": "string",
      "description": "string"
    },
    "circles": ["string"],
    "shades": ["string"],
    "clues": {
      "across": ["string"],
      "down": ["string"]
    },
    "private": false,
    "isPublic": true
  }
}
```

#### `POST /api/v1/puzzles`

Create a new puzzle.

**Request Body:**

```json
{
  "puzzle": {
    "grid": [["string"]],
    "solution": [["string"]],
    "info": {
      "type": "string",
      "title": "string",
      "author": "string",
      "copyright": "string",
      "description": "string"
    },
    "circles": ["string"],
    "shades": ["string"],
    "clues": {
      "across": ["string"],
      "down": ["string"]
    },
    "private": false
  },
  "pid": "string",
  "isPublic": true
}
```

**Response:** `201 Created`

```json
{
  "pid": "string",
  "puzzle": {...}
}
```

#### `PUT /api/v1/puzzles/:pid`

Update an existing puzzle.

**Request Body:**

```json
{
  "content": {
    "grid": [["string"]],
    "solution": [["string"]],
    "info": {...},
    "clues": {...}
  },
  "isPublic": true
}
```

**Response:**

```json
{
  "success": true
}
```

#### `DELETE /api/v1/puzzles/:pid`

Delete a puzzle.

**Response:**

```json
{
  "success": true
}
```

### Games

#### `POST /api/v1/games`

Create a new game session.

**Request Body:**

```json
{
  "gid": "string",
  "pid": "string"
}
```

**Response:** `201 Created`

```json
{
  "gid": "string",
  "pid": "string"
}
```

#### `GET /api/v1/games/:gid`

Get game information.

**Response:**

```json
{
  "gid": "string",
  "pid": "string",
  "info": {
    "title": "string",
    "author": "string"
  }
}
```

#### `GET /api/v1/games/:gid/state`

Get current game state.

**Response:**

```json
{
  "state": {
    "gid": "string",
    "pid": "string",
    "grid": [["string"]],
    "players": [...]
  }
}
```

### Solves

#### `POST /api/v1/solves/:pid`

Record a puzzle solve.

**Request Body:**

```json
{
  "gid": "string",
  "time_to_solve": 123
}
```

**Response:** `201 Created`

```json
{}
```

#### `GET /api/v1/solves`

List solves with filtering (Not implemented).

**Query Parameters:**

- `pid` (string, optional): Filter by puzzle ID
- `gid` (string, optional): Filter by game ID

**Response:** `501 Not Implemented`

#### `GET /api/v1/solves/stats`

Get aggregate statistics (Not implemented).

**Response:** `501 Not Implemented`

### Rooms

#### `POST /api/v1/rooms`

Create a new room.

**Request Body:**

```json
{
  "rid": "string"
}
```

**Response:** `201 Created`

```json
{
  "rid": "string"
}
```

#### `GET /api/v1/rooms/:rid`

Get room information.

**Response:**

```json
{
  "room": {
    "rid": "string",
    "state": {...}
  }
}
```

#### `GET /api/v1/rooms/:rid/events`

Get room event history.

**Response:**

```json
{
  "events": [
    {
      "id": "string",
      "type": "string",
      "params": {...},
      "timestamp": "string"
    }
  ]
}
```

### Counters

#### `POST /api/v1/counters/gid`

Increment game ID counter.

**Request Body:**

```json
{}
```

**Response:**

```json
{
  "gid": "string"
}
```

#### `POST /api/v1/counters/pid`

Increment puzzle ID counter.

**Request Body:**

```json
{}
```

**Response:**

```json
{
  "pid": "string"
}
```

### oEmbed

#### `GET /api/v1/oembed`

oEmbed endpoint for link previews.

**Query Parameters:**

- `author` (string, optional): Author name

**Response:**

```json
{
  "type": "link",
  "version": "1.0",
  "author_name": "string"
}
```

### Link Preview

#### `GET /api/v1/link-preview`

Get link preview information for game or puzzle URLs.

**Query Parameters:**

- `url` (string, required): URL to preview (must be a valid URL)

**Response:**

```json
{
  "title": "string",
  "author": "string"
}
```

**Note:** Returns special format for LinkExpander bot and Facebook Messenger crawler user agents.

### Health Checks

#### `GET /health`

Health check endpoint.

**Response:**

```json
{
  "status": "ok"
}
```

#### `GET /ready`

Readiness check endpoint (includes database connection check).

**Response:**

```json
{
  "status": "ready"
}
```

**Error Response:** `503 Service Unavailable`

```json
{
  "status": "unready",
  "error": "Database connection failed"
}
```

### Error Responses

All endpoints may return error responses in the following format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "requestId": "uuid",
    "details": {}
  }
}
```

Common error codes:

- `PUZZLE_NOT_FOUND`: Puzzle with given ID not found
- `GAME_NOT_FOUND`: Game with given ID not found
- `NOT_FOUND`: Resource not found

## Project Structure

```text
src/
├── api/              # API routes
│   └── v1/          # API version 1
│       ├── puzzles/  # Puzzle endpoints
│       ├── games/    # Game endpoints
│       ├── solves/   # Solve endpoints
│       ├── rooms/    # Room endpoints
│       └── counters/ # Counter endpoints
├── config/          # Configuration
│   ├── database.ts  # Database configuration
│   ├── redis.ts     # Redis configuration
│   └── server.ts    # Server configuration
├── middleware/      # Fastify middleware
│   ├── cors.ts      # CORS configuration
│   ├── error-handler.ts # Error handling
│   ├── rate-limit.ts # Rate limiting
│   └── validation.ts # Request validation
├── models/          # Drizzle schema
│   ├── puzzle.ts    # Puzzle model
│   ├── game.ts      # Game model
│   └── solve.ts     # Solve model
├── repositories/    # Data access layer
│   ├── puzzle.repository.ts
│   ├── game.repository.ts
│   └── solve.repository.ts
├── services/        # Business logic
│   ├── puzzle.service.ts
│   ├── game.service.ts
│   └── solve.service.ts
├── websocket/       # Socket.IO handlers
│   ├── handlers/    # Socket event handlers
│   └── types.ts     # WebSocket types
├── scripts/         # Utility scripts
│   └── seed.ts      # Database seeding script
└── server.ts        # Entry point
```

## Testing

The backend uses Vitest for testing. Tests are located in the `src/` directory alongside the source code.

```bash
# Run all tests
pnpm --filter='./packages/backend' test

# Run tests in watch mode
pnpm --filter='./packages/backend' test:watch

# Run tests with coverage
pnpm --filter='./packages/backend' test:coverage

# Run only changed tests
pnpm --filter='./packages/backend' test:changed

# Open test UI
pnpm --filter='./packages/backend' test:ui
```

## Health Check Endpoints

The backend provides health check endpoints:

- `GET /health` - Health check
- `GET /ready` - Readiness check

These endpoints are useful for:

- Kubernetes liveness/readiness probes
- Load balancer health checks
- Monitoring and alerting

## WebSocket Events

The backend uses Socket.IO for real-time communication. See the WebSocket handlers in `src/websocket/` for available events.

## Production Deployment

For production deployment:

1. Build the application:

   ```bash
   pnpm --filter='./packages/backend' build
   ```

2. Set production environment variables

3. Run migrations:

   ```bash
   pnpm run db:migrate
   ```

4. Start the server:

   ```bash
   pnpm --filter='./packages/backend' start
   ```

