# CrossWithFriends / Down for a Cross

Modern rewrite of the CrossWithFriends backend and frontend with a monorepo workspace structure.

## Technology Stack

### Backend

- **Runtime**: Node.js 20 LTS+
- **Package Manager**: pnpm 9.0+
- **Framework**: Fastify 5.x
- **Database**: PostgreSQL 15+ with Drizzle ORM
- **Cache/Queue**: Redis 7+ (for Socket.IO scaling and distributed rate limiting)
- **Validation**: Zod
- **WebSocket**: Socket.IO 4.x with Redis adapter
- **Logging**: Pino
- **Testing**: Vitest

### Frontend

- **Build Tool**: Vite 6.x
- **Framework**: React 18.3+
- **State Management**: Zustand 5.x
- **Data Fetching**: TanStack Query v5
- **UI**: Tailwind CSS 4 (shadcn/ui ready)
- **Routing**: React Router 6.28+
- **WebSocket**: Socket.IO Client 4.8+

### Shared

- **TypeScript**: 5.7 strict mode
- **Types**: Shared between frontend and backend

## Workspace Structure

```
packages/
├── shared/     # Shared TypeScript types and utilities
├── backend/    # Fastify backend server
└── frontend/   # React frontend application
```

## Getting Started

### Prerequisites

- Node.js 20+ (LTS recommended)
- pnpm 9.0+ (`npm install -g pnpm` or `corepack enable`)
- PostgreSQL 15+ (or use Docker Compose)
- Redis 7+ (optional, for horizontal scaling and distributed rate limiting)

### Installation

```bash
# Install all dependencies
pnpm install
```

### Development

```bash
# Run all packages in development mode
pnpm run dev

# Run specific packages
pnpm run dev:frontend
pnpm run dev:backend
```

### Quick Start with Docker

The easiest way to get started is using Docker Compose for the database:

```bash
# Start PostgreSQL database
docker-compose -f docker-compose.dev.yml up -d

# Run database migrations
pnpm run db:migrate

# Start backend and frontend locally
pnpm run dev:backend
pnpm run dev:frontend
```

For more Docker options, see [DOCKER.md](./DOCKER.md).

### Backend Setup

1. Create a `.env` file in `packages/backend/`:

```env
NODE_ENV=development
PORT=3021
DATABASE_URL=postgresql://postgres:password@localhost:5432/dfac
REDIS_URL=redis://localhost:6379
CORS_ORIGIN=*
LOG_LEVEL=info
```

**Note:** `REDIS_URL` is optional. If not provided, the app will use in-memory stores (not suitable for horizontal scaling).

2. Run database migrations:

```bash
# Generate migrations (if schema changed)
pnpm --filter='./packages/backend' db:generate

# Run migrations
pnpm run db:migrate
```

3. Start the backend:

```bash
pnpm run dev:backend
```

### Frontend Setup

1. Create a `.env` file in `packages/frontend/`:

```env
VITE_API_URL=http://localhost:3021
VITE_USE_LOCAL_SERVER=1
```

2. Start the frontend:

```bash
pnpm run dev:frontend
```

## Available Scripts

```bash
# Development
pnpm run dev              # Run all packages in dev mode
pnpm run dev:frontend     # Run frontend only
pnpm run dev:backend      # Run backend only

# Building
pnpm run build            # Build all packages
pnpm run build:frontend   # Build frontend only
pnpm run build:backend    # Build backend only

# Testing
pnpm run test             # Run all tests
pnpm run test:frontend    # Run frontend tests
pnpm run test:backend     # Run backend tests

# Code Quality
pnpm run typecheck        # Type check all packages
pnpm run lint             # Lint all packages
pnpm run format           # Format code with Prettier
pnpm run format:check     # Check code formatting

# Database
pnpm run db:migrate       # Run database migrations
pnpm run db:seed          # Seed database with sample data

# Cleanup
pnpm run clean            # Remove build artifacts and node_modules
```

## Project Status

This is a modern rewrite in progress. The following has been completed:

✅ Workspace structure with pnpm workspaces  
✅ Shared package with TypeScript types  
✅ Backend with Fastify, Drizzle ORM, Socket.IO v4  
✅ Frontend structure with Vite, React 18, Zustand  
✅ API routes with Zod validation  
✅ WebSocket support for real-time events  
✅ Docker Compose setup for development and production  
✅ Comprehensive API documentation

## Documentation

- [Technical Specification](./TECHNICAL_SPEC_REWRITE.md)
- [Docker Setup Guide](./DOCKER.md)
- [Backend README](./packages/backend/README.md)
- [Frontend README](./packages/frontend/README.md)
- [Shared Package README](./packages/shared/README.md)
