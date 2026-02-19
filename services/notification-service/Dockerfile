# ============================================
# Multi-Stage Build - Notification Service
# ============================================
# Stage 1: Base dependencies
FROM node:20-alpine AS base

# Install security updates
RUN apk upgrade --no-cache && \
    apk add --no-cache dumb-init curl

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/notification-service/package.json ./services/notification-service/

# ============================================
# Stage 2: Dependencies installation
FROM base AS dependencies

# Install pnpm
RUN npm install -g pnpm@latest

# Install dependencies
RUN pnpm install --frozen-lockfile --prefer-offline

# ============================================
# Stage 3: Build
FROM dependencies AS builder

# Copy source code
COPY services/notification-service ./services/notification-service
COPY tsconfig.json ./

# Build the application
WORKDIR /app/services/notification-service
RUN pnpm build

# Remove dev dependencies
RUN pnpm prune --prod

# ============================================
# Stage 4: Production
FROM node:20-alpine AS runner

# Install security updates and runtime dependencies
RUN apk upgrade --no-cache && \
    apk add --no-cache dumb-init curl tini && \
    rm -rf /var/cache/apk/*

WORKDIR /app

# Set production environment
ENV NODE_ENV=production \
    PORT=3003 \
    LOG_LEVEL=info \
    NODE_OPTIONS="--max-old-space-size=1024"

# Create non-root user
RUN addgroup -g 1001 -S appuser && \
    adduser -S appuser -u 1001 -G appuser && \
    chown -R appuser:appuser /app

# Copy built application
COPY --from=builder --chown=appuser:appuser /app/services/notification-service/dist ./dist
COPY --from=builder --chown=appuser:appuser /app/services/notification-service/package.json ./
COPY --from=builder --chown=appuser:appuser /app/services/notification-service/node_modules ./node_modules

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3003/health || exit 1

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Start application
CMD ["dumb-init", "node", "dist/server.js"]
