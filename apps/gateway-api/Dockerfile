# ============================================
# Multi-Stage Build - Gateway API
# ============================================
# Stage 1: Base dependencies
FROM node:20-alpine AS base

# Install security updates
RUN apk upgrade --no-cache && \
    apk add --no-cache dumb-init curl

WORKDIR /app

# Copy package files for better caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/gateway-api/package.json ./apps/gateway-api/
COPY packages/*/package.json ./packages/*/

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
COPY apps/gateway-api ./apps/gateway-api
COPY packages ./packages
COPY tsconfig.json ./

# Build the application
WORKDIR /app/apps/gateway-api
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
    PORT=3000 \
    LOG_LEVEL=info \
    NODE_OPTIONS="--max-old-space-size=2048"

# Create non-root user
RUN addgroup -g 1001 -S appuser && \
    adduser -S appuser -u 1001 -G appuser && \
    chown -R appuser:appuser /app

# Copy built application
COPY --from=builder --chown=appuser:appuser /app/apps/gateway-api/dist ./dist
COPY --from=builder --chown=appuser:appuser /app/apps/gateway-api/package.json ./
COPY --from=builder --chown=appuser:appuser /app/apps/gateway-api/node_modules ./node_modules
COPY --from=builder --chown=appuser:appuser /app/packages ./packages

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Start application
CMD ["dumb-init", "node", "dist/main.js"]
