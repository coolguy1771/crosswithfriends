# Technical Specification: Backend Rewrite

## CrossWithFriends / Down for a Cross

**Version:** 1.0  
**Date:** 2024  
**Status:** Draft

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Goals and Objectives](#goals-and-objectives)
4. [Architecture Overview](#architecture-overview)
5. [Technology Stack](#technology-stack)
6. [API Design](#api-design)
7. [Database Design](#database-design)
8. [Real-Time Communication](#real-time-communication)
9. [Security](#security)
10. [Performance Requirements](#performance-requirements)
11. [Testing Strategy](#testing-strategy)
12. [Migration Strategy](#migration-strategy)
13. [Deployment Strategy](#deployment-strategy)
14. [Development Roadmap](#development-roadmap)

---

## Executive Summary

This document outlines a comprehensive rewrite of the CrossWithFriends backend system. The rewrite aims to modernize the technology stack, improve maintainability, enhance performance, and establish a solid foundation for future growth.

**Key Improvements:**

- Modern TypeScript-first architecture with strict typing
- Improved event sourcing implementation
- Better separation of concerns
- Enhanced error handling and observability
- Comprehensive testing infrastructure
- API versioning and documentation
- Improved scalability and performance

---

## Current State Analysis

### Existing Architecture

**Technology Stack:**

- Node.js with TypeScript
- Express.js for HTTP API
- Socket.IO v2.3.0 for WebSockets
- PostgreSQL for data persistence
- Joi for validation
- Basic connection pooling

**Key Components:**

1. **HTTP API** (`/api/*`): RESTful endpoints for puzzles, games, stats
2. **WebSocket Server**: Real-time game and room events
3. **Data Models**: Puzzles, Games, Solves, Rooms, Counters
4. **Event Sourcing**: Game state stored as event stream

### Identified Issues

1. **Type Safety:**
   - Extensive use of `any` types
   - Missing type definitions for game events
   - Incomplete TypeScript strict mode

2. **Architecture:**
   - Mixed concerns (business logic in API routes)
   - No clear service layer
   - Limited error handling
   - No request validation middleware

3. **Performance:**
   - Manual query performance logging (should use APM)
   - No caching layer
   - Potential N+1 query issues
   - No connection pooling optimization

4. **Code Quality:**
   - TODOs in production code
   - Deprecated endpoints still active
   - Inconsistent error handling
   - Limited test coverage

5. **Observability:**
   - Basic console.log statements
   - No structured logging
   - No metrics collection
   - No distributed tracing

6. **Security:**
   - No authentication/authorization
   - No rate limiting
   - No input sanitization beyond Joi
   - CORS configured permissively

7. **Scalability:**
   - Single server deployment
   - No horizontal scaling strategy
   - WebSocket connections not optimized for scale

---

## Goals and Objectives

### Primary Goals

1. **Maintainability**
   - Clear separation of concerns
   - Comprehensive type safety
   - Well-documented codebase
   - Consistent code style

2. **Performance**
   - Sub-100ms API response times (p95)
   - Efficient database queries
   - Optimized WebSocket message handling
   - Caching where appropriate

3. **Reliability**
   - 99.9% uptime target
   - Graceful error handling
   - Comprehensive error recovery
   - Data consistency guarantees

4. **Scalability**
   - Support for 10,000+ concurrent users
   - Horizontal scaling capability
   - Efficient resource utilization
   - Load balancing support

5. **Developer Experience**
   - Fast local development setup
   - Comprehensive testing tools
   - Clear API documentation
   - Easy debugging

### Success Metrics

- **Performance:** 95th percentile API response time < 100ms
- **Reliability:** < 0.1% error rate
- **Code Quality:** > 80% test coverage
- **Developer Velocity:** 50% reduction in time to add new features

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Load Balancer                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                           │
┌───────▼────────┐         ┌────────▼────────┐
│  HTTP API      │         │  WebSocket API   │
│  (Express)     │         │  (Socket.IO)     │
└───────┬────────┘         └────────┬────────┘
        │                           │
        └──────────────┬────────────┘
                       │
        ┌──────────────▼──────────────┐
        │     Service Layer           │
        │  - Puzzle Service           │
        │  - Game Service             │
        │  - Stats Service           │
        │  - Room Service            │
        └──────────────┬──────────────┘
                       │
        ┌──────────────▼──────────────┐
        │     Repository Layer        │
        │  - Puzzle Repository       │
        │  - Game Repository         │
        │  - Event Store             │
        └──────────────┬──────────────┘
                       │
        ┌──────────────▼──────────────┐
        │      PostgreSQL             │
        │  - Puzzles                  │
        │  - Game Events             │
        │  - Puzzle Solves           │
        │  - Room Events             │
        └─────────────────────────────┘
```

### Design Principles

1. **Layered Architecture**
   - **API Layer**: Request/response handling, validation
   - **Service Layer**: Business logic, orchestration
   - **Repository Layer**: Data access, persistence
   - **Domain Layer**: Core business entities

2. **Event Sourcing**
   - Game state derived from event stream
   - Event store as source of truth
   - Snapshot support for performance
   - Event replay capability

3. **CQRS (Command Query Responsibility Segregation)**
   - Separate read and write models
   - Optimized read queries
   - Event-driven updates

4. **Dependency Injection**
   - Loose coupling between components
   - Testable architecture
   - Configuration management

---

## Technology Stack

### Core Runtime

- **Node.js:** v20.x LTS
- **TypeScript:** 5.x with strict mode
- **Runtime:** Node.js (consider Deno/Bun for future)

### Web Framework

- **Express.js:** 4.x (mature, well-supported)
- **Alternative Consideration:** Fastify (better performance)

### WebSocket

- **Socket.IO:** 4.x (upgrade from 2.x)
  - Better TypeScript support
  - Improved performance
  - Better scaling support

### Database

- **PostgreSQL:** 15+ (current version)
- **ORM/Query Builder:** See [ORM Selection](#orm-selection) section for detailed analysis
  - **Recommended:** Drizzle ORM (lightweight, excellent TypeScript, JSONB support)
  - **Alternative:** Kysely (SQL-first, maximum control)
  - **Consideration:** Prisma (excellent DX, but heavier and JSONB limitations)

### Validation

- **Zod:** TypeScript-first schema validation
  - Better type inference than Joi
  - Native TypeScript support
  - Composable schemas

### Logging & Observability

- **Winston:** Structured logging
- **OpenTelemetry:** Distributed tracing
- **Prometheus:** Metrics collection
- **Grafana:** Visualization (optional)

### Testing

- **Jest:** Unit and integration tests
- **Supertest:** API testing
- **Testcontainers:** Database testing
- **Socket.IO Client:** WebSocket testing

### Development Tools

- **ESLint:** Code linting
- **Prettier:** Code formatting
- **Husky:** Git hooks
- **lint-staged:** Pre-commit checks

### Additional Libraries

- **uuid:** v9 (crypto.randomUUID() preferred where possible)
- **date-fns:** Modern date handling (replace moment.js)
- **class-validator:** DTO validation (if using class-based approach)

---

## ORM Selection

### Current State

The existing codebase uses **raw SQL queries** with the `pg` library. This approach provides:

- ✅ Full control over queries
- ✅ Direct PostgreSQL features (JSONB, trigram indexes, etc.)
- ✅ Performance optimization flexibility
- ❌ Manual type casting and mapping
- ❌ No compile-time type safety
- ❌ Repetitive boilerplate code
- ❌ Manual migration management

### Requirements Analysis

**Key Requirements:**

1. **JSONB Support**: Heavy use of JSONB columns (`content`, `event_payload`)
2. **Complex Queries**: Dynamic query building, trigram searches, aggregations
3. **Event Sourcing**: Sequential event storage and retrieval
4. **Type Safety**: Strong TypeScript inference
5. **Performance**: Sub-100ms query times
6. **PostgreSQL Features**: Trigram indexes, GIST indexes, array operations

### ORM Comparison

#### Option 1: Drizzle ORM ⭐ **RECOMMENDED**

**Pros:**

- ✅ **Lightweight**: Minimal runtime overhead
- ✅ **Excellent TypeScript**: Full type inference, no code generation needed
- ✅ **JSONB Support**: Native JSONB column types and operations
- ✅ **SQL-like Syntax**: Familiar for developers coming from raw SQL
- ✅ **PostgreSQL Features**: Full support for advanced PostgreSQL features
- ✅ **Flexible**: Can drop to raw SQL when needed
- ✅ **Active Development**: Modern, actively maintained
- ✅ **Small Bundle Size**: ~50KB

**Cons:**

- ⚠️ **Newer Ecosystem**: Less community resources than Prisma
- ⚠️ **Manual Migrations**: Migration generation is less polished than Prisma

**Example Usage:**

```typescript
import {drizzle} from 'drizzle-orm/node-postgres';
import {pgTable, text, jsonb, boolean, timestamp, integer} from 'drizzle-orm/pg-core';
import {ilike, or, and, desc} from 'drizzle-orm';

const puzzles = pgTable('puzzles', {
  id: text('id').primaryKey(),
  pid: text('pid').notNull().unique(),
  isPublic: boolean('is_public').notNull(),
  content: jsonb('content').notNull().$type<PuzzleContent>(),
  timesSolved: integer('times_solved').notNull().default(0),
  uploadedAt: timestamp('uploaded_at').notNull(),
});

// Type-safe query with JSONB
const result = await db
  .select()
  .from(puzzles)
  .where(
    and(
      eq(puzzles.isPublic, true),
      or(
        ilike(puzzles.content, {path: ['info', 'title']}, '%search%'),
        ilike(puzzles.content, {path: ['info', 'author']}, '%search%')
      )
    )
  )
  .orderBy(desc(puzzles.uploadedAt))
  .limit(20);

// Raw SQL when needed
await db.execute(sql`SELECT * FROM puzzles WHERE content->'info'->>'type' = ANY($1)`, [types]);
```

**Verdict:** Best fit for this project - lightweight, type-safe, handles JSONB well.

---

#### Option 2: Kysely

**Pros:**

- ✅ **SQL-First**: Write queries that look like SQL
- ✅ **Full Type Safety**: TypeScript types inferred from schema
- ✅ **Zero Runtime**: Compile-time only, no runtime overhead
- ✅ **PostgreSQL Native**: Full access to all PostgreSQL features
- ✅ **Flexible**: Can express any SQL query
- ✅ **Mature**: Well-tested, production-ready

**Cons:**

- ⚠️ **More Verbose**: More code than Drizzle for simple queries
- ⚠️ **Manual Schema Definition**: Need to define types manually
- ⚠️ **Learning Curve**: Different paradigm from traditional ORMs

**Example Usage:**

```typescript
import {Kysely, PostgresDialect} from 'kysely';
import {Pool} from 'pg';

interface Database {
  puzzles: {
    id: string;
    pid: string;
    is_public: boolean;
    content: PuzzleContent;
    times_solved: number;
    uploaded_at: Date;
  };
}

const db = new Kysely<Database>({
  dialect: new PostgresDialect({pool: new Pool()}),
});

// Type-safe query
const result = await db
  .selectFrom('puzzles')
  .selectAll()
  .where('is_public', '=', true)
  .where((eb) =>
    eb.or([
      eb('content->info->>title', 'ilike', '%search%'),
      eb('content->info->>author', 'ilike', '%search%'),
    ])
  )
  .orderBy('uploaded_at', 'desc')
  .limit(20)
  .execute();
```

**Verdict:** Excellent choice if you want maximum control and SQL-like syntax.

---

#### Option 3: Prisma

**Pros:**

- ✅ **Excellent DX**: Best-in-class developer experience
- ✅ **Auto Migrations**: Sophisticated migration system
- ✅ **Type Safety**: Generated types from schema
- ✅ **Large Ecosystem**: Extensive community and resources
- ✅ **Studio**: Visual database browser
- ✅ **Mature**: Battle-tested at scale

**Cons:**

- ❌ **JSONB Limitations**: Limited support for complex JSONB queries
- ❌ **Heavy**: Larger bundle size, more runtime overhead
- ❌ **Less Flexible**: Harder to use advanced PostgreSQL features
- ❌ **Code Generation**: Requires generation step
- ❌ **Performance**: Can be slower for complex queries

**Example Usage:**

```typescript
// Prisma schema
model Puzzle {
  id          String   @id @default(uuid())
  pid         String   @unique
  isPublic    Boolean  @default(false) @map("is_public")
  content     Json     // Limited JSONB query support
  timesSolved Int      @default(0) @map("times_solved")
  uploadedAt  DateTime @default(now()) @map("uploaded_at")
}

// Query - but JSONB operations are limited
const result = await prisma.puzzle.findMany({
  where: {
    isPublic: true,
    // Complex JSONB queries require raw SQL
  },
  orderBy: { uploadedAt: 'desc' },
  take: 20,
});

// For complex JSONB, must use raw SQL
const result = await prisma.$queryRaw`
  SELECT * FROM puzzles
  WHERE content->'info'->>'type' = ANY(${types})
`;
```

**Verdict:** Great for standard CRUD, but JSONB-heavy workloads require frequent raw SQL escapes.

---

#### Option 4: TypeORM

**Pros:**

- ✅ **Mature**: Long-established ORM
- ✅ **Active Record Pattern**: Familiar to many developers
- ✅ **Decorators**: Class-based entity definitions

**Cons:**

- ❌ **Heavy**: Large bundle size
- ❌ **Type Safety**: Weaker than modern alternatives
- ❌ **JSONB Support**: Limited
- ❌ **Performance**: Can be slow
- ❌ **Complex**: Steep learning curve

**Verdict:** Not recommended - outdated compared to modern alternatives.

---

#### Option 5: Raw SQL (Current Approach)

**Pros:**

- ✅ **Full Control**: Complete flexibility
- ✅ **Performance**: No abstraction overhead
- ✅ **PostgreSQL Native**: All features available

**Cons:**

- ❌ **No Type Safety**: Manual type definitions
- ❌ **Boilerplate**: Repetitive code
- ❌ **Error-Prone**: SQL injection risks if not careful
- ❌ **Maintenance**: Harder to refactor

**Verdict:** Keep for specific complex queries, but use ORM for standard operations.

---

### Recommendation: Hybrid Approach with Drizzle ORM

**Primary: Drizzle ORM**

- Use for 80-90% of queries (standard CRUD, simple filters)
- Excellent type safety and developer experience
- Good JSONB support for most use cases

**Fallback: Raw SQL**

- Use for complex JSONB queries (trigram searches, complex aggregations)
- Use for performance-critical paths
- Use for PostgreSQL-specific features not well-supported

**Implementation Strategy:**

```typescript
// Repository pattern with Drizzle + raw SQL escape hatch
class PuzzleRepository {
  constructor(
    private db: DrizzleDatabase,
    private pool: Pool // For raw SQL when needed
  ) {}

  // Standard query with Drizzle
  async findById(pid: string): Promise<Puzzle | null> {
    const result = await this.db
      .select()
      .from(puzzles)
      .where(eq(puzzles.pid, pid))
      .limit(1);
    return result[0] ?? null;
  }

  // Complex JSONB query with raw SQL
  async searchByTitleAuthor(searchTerms: string[]): Promise<Puzzle[]> {
    const params = searchTerms.map(term => `%${term}%`);
    const placeholders = params.map((_, i) => `$${i + 4}`).join(' AND ');

    const query = sql`
      SELECT * FROM puzzles
      WHERE is_public = true
      AND ((content->'info'->>'title') || ' ' || (content->'info'->>'author'))
        ILIKE ANY(ARRAY[${sql.join(params.map(p => sql`${p}`), sql`, `})])
      ORDER BY pid_numeric DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await this.db.execute(query);
    return result.rows;
  }
}
```

### Migration Path

1. **Phase 1**: Set up Drizzle alongside existing raw SQL
2. **Phase 2**: Migrate simple queries to Drizzle
3. **Phase 3**: Keep complex queries as raw SQL with proper typing
4. **Phase 4**: Gradually optimize and migrate complex queries where beneficial

### Schema Definition Example

```typescript
// schema.ts
import {pgTable, text, jsonb, boolean, timestamp, integer, bigserial, bigint} from 'drizzle-orm/pg-core';
import {relations} from 'drizzle-orm';

export const puzzles = pgTable('puzzles', {
  id: text('id').primaryKey(),
  pid: text('pid').notNull().unique(),
  pidNumeric: text('pid_numeric'),
  isPublic: boolean('is_public').notNull().default(false),
  uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
  timesSolved: integer('times_solved').notNull().default(0),
  content: jsonb('content').notNull().$type<PuzzleContent>(),
  createdBy: text('created_by'),
});

export const gameEvents = pgTable('game_events', {
  id: bigserial('id').primaryKey(),
  gid: text('gid').notNull(),
  sequenceNumber: bigint('sequence_number', {mode: 'number'}).notNull(),
  eventType: text('event_type').notNull(),
  eventPayload: jsonb('event_payload').notNull().$type<GameEventPayload>(),
  userId: text('user_id'),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  version: integer('version').notNull().default(1),
});

// Relations
export const puzzlesRelations = relations(puzzles, ({many}) => ({
  solves: many(puzzleSolves),
}));
```

### Benefits of This Approach

1. **Type Safety**: Compile-time checking for most queries
2. **Developer Experience**: IntelliSense, auto-completion
3. **Maintainability**: Easier to refactor, clearer intent
4. **Performance**: Minimal overhead, can optimize where needed
5. **Flexibility**: Escape hatch for complex queries
6. **Future-Proof**: Easy to migrate more queries over time

---

## API Design

### REST API Structure

```
/api/v1/
  ├── puzzles/
  │   ├── GET    /              # List puzzles (paginated, filtered)
  │   ├── POST   /              # Create puzzle
  │   ├── GET    /:pid          # Get puzzle by ID
  │   ├── PUT    /:pid          # Update puzzle
  │   └── DELETE /:pid          # Delete puzzle
  │
  ├── games/
  │   ├── POST   /              # Create game session
  │   ├── GET    /:gid          # Get game info
  │   ├── GET    /:gid/state    # Get current game state
  │   └── POST   /:gid/events   # Append game event (if needed)
  │
  ├── solves/
  │   ├── POST   /              # Record solve
  │   ├── GET    /              # List solves (filtered)
  │   └── GET    /stats         # Aggregate statistics
  │
  ├── rooms/
  │   ├── POST   /              # Create room
  │   ├── GET    /:rid          # Get room info
  │   └── GET    /:rid/events   # Get room event history
  │
  └── oembed/
      └── GET    /              # oEmbed endpoint
```

### API Versioning

- URL-based versioning: `/api/v1/`, `/api/v2/`
- Semantic versioning for breaking changes
- Deprecation warnings in headers

### Request/Response Format

**Standard Response:**

```typescript
{
  data: T,
  meta?: {
    page?: number,
    pageSize?: number,
    total?: number
  },
  errors?: Array<{
    code: string,
    message: string,
    field?: string
  }>
}
```

**Error Response:**

```typescript
{
  error: {
    code: string,
    message: string,
    details?: any,
    requestId: string
  }
}
```

### API Documentation

- **OpenAPI 3.0** specification
- **Swagger UI** for interactive docs
- Auto-generated from TypeScript types

---

## Database Design

### ORM Integration

The database schema will be defined using **Drizzle ORM** (see [ORM Selection](#orm-selection) for details). This provides:

- Type-safe schema definitions
- Automatic type inference
- Migration generation
- Relationship definitions

The schema definitions serve as both the TypeScript types and the migration source of truth.

### Schema Improvements

#### Puzzles Table

```sql
CREATE TABLE puzzles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pid TEXT UNIQUE NOT NULL, -- Short identifier for URLs
  pid_numeric NUMERIC, -- Numeric version for sorting
  is_public BOOLEAN NOT NULL DEFAULT false,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  times_solved INTEGER NOT NULL DEFAULT 0 CHECK (times_solved >= 0),
  content JSONB NOT NULL,
  created_by TEXT, -- User ID (for future auth)

  CONSTRAINT puzzles_content_valid CHECK (
    content ? 'grid' AND
    content ? 'clues' AND
    content ? 'info'
  )
);

-- Indexes
CREATE INDEX idx_puzzles_public_uploaded ON puzzles(is_public, uploaded_at DESC) WHERE is_public = true;
CREATE INDEX idx_puzzles_pid_numeric ON puzzles(pid_numeric DESC NULLS LAST);
CREATE INDEX idx_puzzles_content_search ON puzzles USING GIST (
  ((content->'info'->>'title') || ' ' || (content->'info'->>'author')) gist_trgm_ops
);
```

#### Game Events Table (Event Store)

```sql
CREATE TABLE game_events (
  id BIGSERIAL PRIMARY KEY,
  gid TEXT NOT NULL,
  sequence_number BIGINT NOT NULL, -- Event ordering within game
  event_type TEXT NOT NULL,
  event_payload JSONB NOT NULL,
  user_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1, -- For schema evolution

  UNIQUE(gid, sequence_number)
);

CREATE INDEX idx_game_events_gid_seq ON game_events(gid, sequence_number);
CREATE INDEX idx_game_events_gid_type ON game_events(gid, event_type);
```

#### Game Snapshots (Performance Optimization)

```sql
CREATE TABLE game_snapshots (
  gid TEXT PRIMARY KEY,
  snapshot_data JSONB NOT NULL,
  snapshot_version INTEGER NOT NULL, -- Last sequence number included
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### Puzzle Solves Table

```sql
CREATE TABLE puzzle_solves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pid TEXT NOT NULL REFERENCES puzzles(pid) ON DELETE CASCADE,
  gid TEXT NOT NULL,
  solved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  time_taken_seconds INTEGER NOT NULL CHECK (time_taken_seconds > 0),
  revealed_squares_count INTEGER DEFAULT 0,
  checked_squares_count INTEGER DEFAULT 0,

  UNIQUE(pid, gid)
);

CREATE INDEX idx_puzzle_solves_pid ON puzzle_solves(pid);
CREATE INDEX idx_puzzle_solves_gid ON puzzle_solves(gid);
CREATE INDEX idx_puzzle_solves_solved_at ON puzzle_solves(solved_at DESC);
```

#### Room Events Table

```sql
CREATE TABLE room_events (
  id BIGSERIAL PRIMARY KEY,
  rid TEXT NOT NULL,
  sequence_number BIGINT NOT NULL,
  event_type TEXT NOT NULL,
  event_payload JSONB NOT NULL,
  user_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(rid, sequence_number)
);

CREATE INDEX idx_room_events_rid_seq ON room_events(rid, sequence_number);
```

### Migration Strategy

1. **Dual-write period**: Write to both old and new schemas
2. **Data migration**: Batch migration scripts
3. **Validation**: Compare results between old and new
4. **Cutover**: Switch reads to new schema
5. **Cleanup**: Remove old schema after validation period

---

## Real-Time Communication

### WebSocket Architecture

**Socket.IO 4.x Features:**

- Namespaces for logical separation
- Rooms for game/room isolation
- Acknowledgment callbacks
- Binary support for future features

### Event Types

**Game Events:**

```typescript
type GameEventType =
  | 'create'
  | 'cell_fill'
  | 'cell_clear'
  | 'cell_check'
  | 'cell_reveal'
  | 'cursor_move'
  | 'chat_message'
  | 'clock_update'
  | 'puzzle_solved';
```

**Room Events:**

```typescript
type RoomEventType = 'user_join' | 'user_leave' | 'chat_message' | 'room_settings_update';
```

### Event Flow

1. Client sends event via WebSocket
2. Server validates event
3. Event persisted to database
4. Event broadcast to all clients in room/game
5. Clients acknowledge receipt

### Scaling WebSockets

**Options:**

1. **Redis Adapter**: Socket.IO Redis adapter for multi-server
2. **Sticky Sessions**: Load balancer session affinity
3. **Message Queue**: RabbitMQ/Kafka for event distribution

**Recommended:** Redis Adapter for Socket.IO

---

## Security

### Authentication & Authorization

**Phase 1 (MVP):**

- Optional user identification (client-provided user IDs)
- No authentication required

**Phase 2:**

- JWT-based authentication
- OAuth2 integration (Google, GitHub)
- User accounts and sessions

**Phase 3:**

- Role-based access control (RBAC)
- Puzzle ownership and permissions
- Private game rooms

### Input Validation

- **Zod schemas** for all inputs
- **Sanitization** of user-generated content
- **SQL injection prevention** via parameterized queries
- **XSS prevention** in API responses

### Rate Limiting

- **Express-rate-limit** middleware
- Per-IP and per-user limits
- Different limits for different endpoints
- WebSocket message rate limiting

### CORS

- Environment-specific CORS configuration
- Whitelist of allowed origins
- Credentials support for authenticated requests

### Data Protection

- **Encryption at rest**: Database encryption
- **Encryption in transit**: TLS 1.3
- **PII handling**: Minimal data collection
- **GDPR compliance**: Data deletion capabilities

---

## Performance Requirements

### Response Time Targets

- **API Endpoints:**
  - List puzzles: < 200ms (p95)
  - Get puzzle: < 50ms (p95)
  - Create game: < 100ms (p95)
  - Record solve: < 50ms (p95)

- **WebSocket:**
  - Event propagation: < 50ms (p95)
  - Event persistence: < 100ms (p95)

### Throughput Targets

- **API:** 1000 requests/second
- **WebSocket:** 10,000 messages/second
- **Concurrent Users:** 10,000+

### Optimization Strategies

1. **Database:**
   - Connection pooling (PgBouncer)
   - Query optimization
   - Appropriate indexes
   - Read replicas for scaling

2. **Caching:**
   - Redis for frequently accessed data
   - Puzzle metadata caching
   - Game state snapshots
   - CDN for static assets (future)

3. **Code:**
   - Async/await best practices
   - Batch operations where possible
   - Lazy loading
   - Pagination

4. **Monitoring:**
   - APM (Application Performance Monitoring)
   - Database query analysis
   - Memory profiling
   - CPU profiling

---

## Testing Strategy

### Test Pyramid

```
        /\
       /  \     E2E Tests (5%)
      /    \
     /      \   Integration Tests (25%)
    /        \
   /__________\  Unit Tests (70%)
```

### Unit Tests

- **Service layer**: Business logic
- **Repository layer**: Data access (mocked DB)
- **Utilities**: Helper functions
- **Target:** 80%+ coverage

### Integration Tests

- **API endpoints**: HTTP requests
- \*\*Database operations
- **WebSocket events**: Real-time communication
- **Testcontainers**: Real PostgreSQL instance

### End-to-End Tests

- **Critical user flows:**
  - Create puzzle
  - Start game
  - Solve puzzle
  - View statistics

### Test Data Management

- **Factories**: Generate test data
- **Fixtures**: Reusable test scenarios
- **Seeding**: Database seed scripts

### Continuous Testing

- **Pre-commit**: Linting, type checking
- **CI/CD**: Full test suite
- **Performance tests**: Load testing in staging

---

## Migration Strategy

### Phase 1: Preparation (Week 1-2)

1. **Documentation:**
   - Complete API inventory
   - Database schema documentation
   - Event type catalog

2. **Infrastructure:**
   - Set up new development environment
   - Database migration scripts
   - CI/CD pipeline

3. **Testing:**
   - Test data generation
   - Migration validation scripts

### Phase 2: Parallel Development (Week 3-8)

1. **Build new system** alongside existing
2. **Dual-write mode**: Write to both systems
3. **Validation**: Compare outputs
4. **Feature parity**: Ensure all features work

### Phase 3: Gradual Migration (Week 9-10)

1. **Read traffic**: Gradually shift reads to new system
2. **Monitor**: Watch for issues
3. **Rollback plan**: Ability to revert
4. **Full cutover**: Switch all traffic

### Phase 4: Cleanup (Week 11-12)

1. **Remove old code**
2. **Archive old database**
3. **Update documentation**
4. **Post-mortem**: Lessons learned

### Risk Mitigation

- **Feature flags**: Gradual rollout
- **Canary deployments**: Test with subset of users
- **Rollback procedures**: Quick revert capability
- **Monitoring**: Extensive observability

---

## Deployment Strategy

### Infrastructure

**Development:**

- Local PostgreSQL
- Single server instance
- Hot reloading

**Staging:**

- Production-like environment
- Separate database
- Load testing capability

**Production:**

- **Containerization**: Docker
- **Orchestration**: Kubernetes (or simpler: Docker Compose)
- **Database**: Managed PostgreSQL (AWS RDS, Google Cloud SQL)
- **Load Balancing**: Nginx or cloud load balancer
- **CDN**: For static assets (future)

### CI/CD Pipeline

1. **Code Push** → GitHub/GitLab
2. **Automated Tests** → Run test suite
3. **Build** → Docker image
4. **Deploy to Staging** → Automatic
5. **Manual Approval** → Production deployment
6. **Health Checks** → Verify deployment

### Environment Configuration

- **12-Factor App** principles
- Environment variables for configuration
- Secrets management (Vault, AWS Secrets Manager)
- No hardcoded values

### Monitoring & Alerting

- **Health endpoints**: `/health`, `/ready`
- **Metrics**: Prometheus
- **Logs**: Centralized logging (ELK, Loki)
- **Alerts**: PagerDuty, Slack
- **Dashboards**: Grafana

---

## Development Roadmap

### Milestone 1: Foundation (Weeks 1-2)

- [ ] Project setup and tooling
- [ ] Database schema design
- [ ] Core repository layer
- [ ] Basic API structure
- [ ] Development environment

### Milestone 2: Core Features (Weeks 3-4)

- [ ] Puzzle CRUD operations
- [ ] Game creation and state management
- [ ] Event sourcing implementation
- [ ] Basic WebSocket support

### Milestone 3: Real-Time Features (Weeks 5-6)

- [ ] Full WebSocket implementation
- [ ] Game event handling
- [ ] Room event handling
- [ ] Event synchronization

### Milestone 4: Statistics & Analytics (Week 7)

- [ ] Solve tracking
- [ ] Statistics computation
- [ ] Performance optimization

### Milestone 5: Polish & Testing (Week 8)

- [ ] Comprehensive testing
- [ ] Error handling
- [ ] Documentation
- [ ] Performance tuning

### Milestone 6: Migration (Weeks 9-12)

- [ ] Data migration
- [ ] Parallel running
- [ ] Gradual cutover
- [ ] Cleanup

---

## Appendix

### A. Type Definitions

**Core Types:**

```typescript
// Puzzle
interface Puzzle {
  id: string;
  pid: string;
  pidNumeric?: number;
  isPublic: boolean;
  uploadedAt: Date;
  timesSolved: number;
  content: PuzzleContent;
  createdBy?: string;
}

interface PuzzleContent {
  grid: string[][];
  solution: string[][];
  clues: {
    across: string[];
    down: string[];
  };
  info: {
    title: string;
    author: string;
    type?: string;
    copyright?: string;
    description?: string;
  };
  circles?: number[];
  shades?: number[];
}

// Game Event
interface GameEvent {
  id: number;
  gid: string;
  sequenceNumber: number;
  eventType: GameEventType;
  eventPayload: GameEventPayload;
  userId?: string;
  timestamp: Date;
  version: number;
}

// Puzzle Solve
interface PuzzleSolve {
  id: string;
  pid: string;
  gid: string;
  solvedAt: Date;
  timeTakenSeconds: number;
  revealedSquaresCount: number;
  checkedSquaresCount: number;
}
```

### B. API Examples

**Create Puzzle:**

```http
POST /api/v1/puzzles
Content-Type: application/json

{
  "puzzle": {
    "grid": [["A", "B"], ["C", "D"]],
    "solution": [["A", "B"], ["C", "D"]],
    "clues": {
      "across": ["1. First clue", "2. Second clue"],
      "down": ["1. Down clue"]
    },
    "info": {
      "title": "Test Puzzle",
      "author": "Test Author"
    }
  },
  "isPublic": true
}
```

**Create Game:**

```http
POST /api/v1/games
Content-Type: application/json

{
  "pid": "abc12345",
  "gid": "game-123"
}
```

### C. WebSocket Events

**Client → Server:**

```typescript
// Join game
socket.emit('join_game', {gid: 'game-123'}, (ack) => {
  console.log('Joined game');
});

// Send game event
socket.emit(
  'game_event',
  {
    gid: 'game-123',
    event: {
      type: 'cell_fill',
      params: {row: 0, col: 0, value: 'A'},
      timestamp: Date.now(),
    },
  },
  (ack) => {
    console.log('Event sent');
  }
);
```

**Server → Client:**

```typescript
// Game event broadcast
socket.on('game_event', (event: GameEvent) => {
  console.log('Received event:', event);
});

// Room event broadcast
socket.on('room_event', (event: RoomEvent) => {
  console.log('Received room event:', event);
});
```

### D. Database Indexes

**Critical Indexes:**

- `puzzles(is_public, uploaded_at)` - Public puzzle listing
- `puzzles(pid_numeric DESC)` - Sorting
- `game_events(gid, sequence_number)` - Event ordering
- `puzzle_solves(pid)` - Solve lookups
- `puzzle_solves(gid)` - Game solve lookups

### E. Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/dfac
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10

# Server
PORT=3000
NODE_ENV=production
LOG_LEVEL=info

# WebSocket
WS_PATH=/socket.io
WS_PING_INTERVAL=2000
WS_PING_TIMEOUT=5000

# Redis (for scaling)
REDIS_URL=redis://localhost:6379

# Security
CORS_ORIGIN=https://downforacross.com
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## Conclusion

This technical specification provides a comprehensive roadmap for rewriting the CrossWithFriends backend. The new architecture will be more maintainable, performant, and scalable while preserving all existing functionality.

**Key Takeaways:**

- Modern TypeScript-first approach
- Clear separation of concerns
- Comprehensive testing strategy
- Gradual migration approach
- Focus on developer experience

**Next Steps:**

1. Review and approve this specification
2. Set up development environment
3. Begin Milestone 1 implementation
4. Establish regular review cycles

---

**Document Status:** Draft - Awaiting Review  
**Last Updated:** 2024  
**Maintained By:** Engineering Team
