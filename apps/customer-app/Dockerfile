# ============================================
# Multi-Stage Build - Customer App (React)
# ============================================
# Stage 1: Base dependencies
FROM node:20-alpine AS base

# Install security updates
RUN apk upgrade --no-cache && \
    apk add --no-cache dumb-init

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/customer-app/package.json ./apps/customer-app/

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

# Build arguments for environment configuration
ARG REACT_APP_API_URL=http://localhost:3000
ARG REACT_APP_ENV=production

# Copy source code
COPY apps/customer-app ./apps/customer-app
COPY tsconfig.json ./

# Build the application
WORKDIR /app/apps/customer-app
RUN pnpm build

# ============================================
# Stage 4: Production - Nginx
FROM nginx:1.25-alpine AS runner

# Install security updates
RUN apk upgrade --no-cache && \
    apk add --no-cache curl && \
    rm -rf /var/cache/apk/*

# Copy custom nginx config
COPY apps/customer-app/nginx.conf /etc/nginx/nginx.conf
COPY apps/customer-app/nginx-default.conf /etc/nginx/conf.d/default.conf

# Copy built static files
COPY --from=builder /app/apps/customer-app/build /usr/share/nginx/html

# Create non-root user
RUN addgroup -g 1001 -S appuser && \
    adduser -S appuser -u 1001 -G appuser && \
    chown -R appuser:appuser /usr/share/nginx/html && \
    chown -R appuser:appuser /var/cache/nginx && \
    chown -R appuser:appuser /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R appuser:appuser /var/run/nginx.pid

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
