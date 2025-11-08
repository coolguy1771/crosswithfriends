# Base stage for dependency installation
FROM node:20-alpine AS base

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm --activate

# Copy all package files and workspace configuration
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/


RUN pnpm install --frozen-lockfile && \
    chown -R nodejs:nodejs /app

# Build stage
FROM base AS build

WORKDIR /app

# Copy source code
COPY . .

# Reinstall to refresh workspace links after copying source code
# This ensures all workspace dependencies are properly linked before building
RUN pnpm install --frozen-lockfile

# Build the application
RUN pnpm --filter ./packages/shared build && \
    pnpm --filter ./packages/backend build

# Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app


RUN corepack enable && corepack prepare pnpm --activate

# Copy package files
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/

# Install only production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts from build stage
COPY --from=build --chown=nodejs:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=build --chown=nodejs:nodejs /app/packages/shared/package.json ./packages/shared/
COPY --from=build --chown=nodejs:nodejs /app/packages/backend/dist ./packages/backend/dist
COPY --from=build --chown=nodejs:nodejs /app/packages/backend/package.json ./packages/backend/
COPY --from=build --chown=nodejs:nodejs /app/packages/backend/sql ./packages/backend/sql

# Set working directory to backend
WORKDIR /app/packages/backend

# Set production environment
ENV NODE_ENV=production

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3021

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3021/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => process.exit(1))"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/server.js"]

# Development stage
FROM base AS development

WORKDIR /app

# Copy all source code for monorepo (including shared package)
# This must include source so workspace dependencies can be properly linked
COPY --chown=nodejs:nodejs . .

# Switch to non-root user
USER nodejs

# Reinstall to refresh workspace links after copying source code
# This ensures @crosswithfriends/shared workspace dependency is properly linked
RUN pnpm install --frozen-lockfile

CMD ["pnpm", "--filter", "./packages/backend", "dev"]

