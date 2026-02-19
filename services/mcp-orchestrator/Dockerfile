# =============================================================================
# FoodBot MCP Orchestrator - Production Docker Image (Spring Boot)
# =============================================================================
# Multi-stage build for Java Spring Boot application
# Security: Non-root user, minimal JRE, vulnerability scanning
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Builder
# ---------------------------------------------------------------------------
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /build

# Copy pom.xml first for better caching
COPY pom.xml ./

# Download dependencies (cached layer)
RUN mvn dependency:go-offline -B

# Copy source code
COPY src ./src

# Build the application
RUN mvn clean package -DskipTests -B && \
    mv target/*.jar target/app.jar

# ---------------------------------------------------------------------------
# Stage 2: Production Image
# ---------------------------------------------------------------------------
FROM eclipse-temurin:17-jre-alpine AS production

# Install security updates and utilities
RUN apk upgrade --no-cache && \
    apk add --no-cache \
    curl \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

WORKDIR /app

# Copy built JAR from builder
COPY --from=builder --chown=appuser:appgroup /build/target/app.jar ./app.jar

# Set environment variables
ENV JAVA_OPTS="-Xms512m -Xmx2048m" \
    SPRING_PROFILES_ACTIVE=production \
    SERVER_PORT=8080

# Security: Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Health check (Spring Boot Actuator)
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start Spring Boot application
CMD ["sh", "-c", "java $JAVA_OPTS -Djava.security.egd=file:/dev/./urandom -jar app.jar"]

# Metadata
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION

LABEL org.opencontainers.image.created=$BUILD_DATE \
      org.opencontainers.image.title="FoodBot MCP Orchestrator" \
      org.opencontainers.image.description="Model Context Protocol Orchestrator for FoodBot" \
      org.opencontainers.image.version=$VERSION \
      org.opencontainers.image.revision=$VCS_REF \
      org.opencontainers.image.vendor="FoodBot" \
      org.opencontainers.image.source="https://github.com/foodbot/foodbot" \
      org.opencontainers.image.licenses="UNLICENSED"
