FROM node:20-alpine AS builder

WORKDIR /app

# Copy root config files
COPY package.json tsconfig.json ./
COPY services/search-orchestrator/package.json ./services/search-orchestrator/
COPY services/search-orchestrator/tsconfig.json ./services/search-orchestrator/

# Install dependencies
WORKDIR /app/services/search-orchestrator
RUN npm install

# Copy source
COPY services/search-orchestrator/src ./src

# Build
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy built output and dependencies
COPY --from=builder /app/services/search-orchestrator/dist ./dist
COPY --from=builder /app/services/search-orchestrator/package.json ./
COPY --from=builder /app/services/search-orchestrator/node_modules ./node_modules

# Security: run as non-root
RUN addgroup -g 1001 appuser && \
    adduser -u 1001 -G appuser -s /bin/sh -D appuser
USER appuser

EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1

CMD ["node", "dist/server.js"]
