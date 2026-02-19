# FoodBot Quick Start Guide

Get up and running with FoodBot in minutes using the `foodbot` wrapper script.

## Prerequisites

Before starting, ensure you have:

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **pnpm** 8+ (`npm install -g pnpm`)
- **Docker** ([Download](https://docs.docker.com/get-docker/))
- **Docker Compose** ([Download](https://docs.docker.com/compose/install/))

Optional (for MCP Orchestrator):
- **Java** 17+ ([Download](https://adoptium.net/))
- **Maven** (wrapper included in project)

## 1. System Check

Verify your system has all required tools:

```bash
./foodbot doctor
```

This will check for:
- Node.js and pnpm installation
- Docker daemon status
- Project structure integrity
- Running infrastructure services

## 2. Initial Setup

Run the one-time setup command:

```bash
./foodbot setup
```

This will:
1. Install all Node.js dependencies (`pnpm install`)
2. Build all TypeScript and Java projects
3. Start infrastructure services (PostgreSQL, Redis, Kafka, Elasticsearch, Temporal)
4. Wait for services to be ready
5. Run database migrations
6. Seed database with dummy data

**Estimated time:** 5-10 minutes (depending on your machine)

## 3. Start Development

Start all services in development mode:

```bash
./foodbot dev
```

This will start:
- Gateway API (http://localhost:3000)
- Customer App (http://localhost:3001)
- Restaurant App (http://localhost:3002)
- MCP Adapter (http://localhost:3003)
- MCP Orchestrator (http://localhost:8081)
- Search Orchestrator (http://localhost:3004)
- Notification Service (background)
- Temporal Workers (background)

### Start Individual Services

To run only specific services:

```bash
# Gateway API only
./foodbot dev gateway-api

# Customer App only
./foodbot dev customer-app

# Restaurant App only
./foodbot dev restaurant-app

# MCP Orchestrator (Java) only
./foodbot dev mcp-orchestrator
```

## 4. Access the Applications

### Customer App
- **URL:** http://localhost:3001
- **Test User:** john.doe@example.com / password
- Browse restaurants, place orders, track deliveries

### Restaurant App
- **URL:** http://localhost:3002
- **Test Owner:** owner.punjabgrill@example.com / password
- Manage menu, accept orders, view analytics

### Admin Dashboard
- **URL:** http://localhost:3000/admin
- **Admin User:** admin@foodbot.com / password
- User management, restaurant approvals

### API Documentation
- **Gateway API Swagger:** http://localhost:3000/api
- **MCP Orchestrator Swagger:** http://localhost:8081/swagger-ui.html

### Infrastructure UIs
- **Temporal UI:** http://localhost:8080
- **Elasticsearch:** http://localhost:9200
- **Kafka UI:** (configure separately)

## 5. Common Commands

### Building

```bash
# Build all projects
./foodbot build

# Build only TypeScript projects
./foodbot build:ts

# Build only Java projects
./foodbot build:java

# Build a specific project
./foodbot build gateway-api
./foodbot build mcp-orchestrator
```

### Testing

```bash
# Run all tests
./foodbot test

# Unit tests only
./foodbot test:unit

# Integration tests
./foodbot test:integration

# E2E tests
./foodbot test:e2e

# Tests with coverage report
./foodbot test:coverage

# Test a specific project
./foodbot test gateway-api
./foodbot test customer-app
```

### Code Quality

```bash
# Lint all code
./foodbot lint

# Lint and auto-fix
./foodbot lint:fix

# Check code formatting
./foodbot format

# Format all code
./foodbot format:fix

# TypeScript type checking
./foodbot typecheck

# Run all quality checks (lint + format + typecheck)
./foodbot quality
```

### Security

```bash
# Security audit
./foodbot security

# Fix vulnerabilities
./foodbot security:fix
```

### Database Management

```bash
# Setup database (migrations only)
./foodbot db:setup

# Seed database with dummy data
./foodbot db:seed

# Reset database (WARNING: Deletes all data)
./foodbot db:reset

# Run migrations
./foodbot db:migrate
```

### Infrastructure

```bash
# Start infrastructure services only
./foodbot infra:up

# Stop infrastructure services
./foodbot infra:down

# View infrastructure logs
./foodbot infra:logs

# Check infrastructure status
./foodbot infra:ps
```

### Monitoring

```bash
# View logs for all services
./foodbot logs

# View logs for a specific service
./foodbot logs gateway-api
./foodbot logs postgres
./foodbot logs redis

# Check status of all services
./foodbot ps
```

### Cleanup

```bash
# Clean all build artifacts
./foodbot clean

# Clean a specific project
./foodbot clean gateway-api
./foodbot clean mcp-orchestrator
```

## 6. Using Makefile (Alternative)

If you prefer Makefiles, use:

```bash
# See all available targets
make help

# Development
make dev
make dev-gateway-api

# Testing
make test
make test-unit

# Quality
make lint
make format-fix
make quality

# Database
make db-setup
make db-seed
```

## 7. Project Structure

```
FoodBot/
├── apps/
│   ├── gateway-api/          # NestJS API Gateway
│   ├── customer-app/         # React Customer App
│   └── restaurant-app/       # React Restaurant Dashboard
├── services/
│   ├── mcp-adapter/          # TypeScript MCP Adapter
│   ├── mcp-orchestrator/     # Java Spring Boot MCP Orchestrator
│   ├── search-orchestrator/  # TypeScript Search Service
│   └── notification-service/ # Kafka-based Notifications
├── packages/
│   ├── workflows/            # Temporal Workflow Definitions
│   └── events/               # Kafka Event Schemas
├── scripts/                  # Utility Scripts
├── docs/                     # Documentation
├── foodbot                   # Main Wrapper Script ⭐
├── Makefile                  # Makefile Interface
└── docker-compose.yml        # Docker Compose Configuration
```

## 8. Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing secret
- `ANTHROPIC_API_KEY` - Claude API key
- `SWIGGY_API_KEY` - Swiggy MCP API key
- `ZOMATO_API_KEY` - Zomato MCP API key

## 9. Dummy Data

After running `./foodbot setup` or `./foodbot db:seed`, you'll have:

### Users
- **10 Customers** (john.doe@example.com, jane.smith@example.com, etc.)
- **5 Restaurant Owners** (owner.punjabgrill@example.com, etc.)
- **1 Admin** (admin@foodbot.com)
- **All passwords:** `password` (for development only)

### Restaurants
- **10 Restaurants** across various cuisines
- Punjab Grill (North Indian)
- Dosa Corner (South Indian)
- Pizza Paradise (Italian)
- Burger Bistro (American)
- Thai Kitchen (Thai)
- And 5 more...

### Dishes
- **80+ Dishes** across all restaurants
- Categories: Starters, Main Course, Breads, Desserts, Beverages

### Orders
- **30 Sample Orders** with various statuses
- Pending, Preparing, Delivered, Cancelled

## 10. Troubleshooting

### Port Already in Use

If you see "port already in use" errors:

```bash
# Stop all services
./foodbot stop

# Or kill specific ports
lsof -ti:3000 | xargs kill -9  # Gateway API
lsof -ti:3001 | xargs kill -9  # Customer App
lsof -ti:5432 | xargs kill -9  # PostgreSQL
```

### Docker Issues

```bash
# Restart Docker daemon
# Check Docker Desktop or run:
sudo systemctl restart docker  # Linux

# Recreate containers
docker-compose down -v
./foodbot infra:up
```

### Database Connection Errors

```bash
# Check if PostgreSQL is running
./foodbot infra:ps

# Restart infrastructure
./foodbot infra:down
./foodbot infra:up

# Reset database
./foodbot db:reset
```

### Build Failures

```bash
# Clean and rebuild
./foodbot clean
./foodbot install
./foodbot build
```

### Tests Failing

```bash
# Ensure infrastructure is running
./foodbot infra:up

# Wait for services to be ready (10-15 seconds)
sleep 15

# Run tests
./foodbot test
```

## 11. Next Steps

- 📖 Read [Architecture Documentation](docs/ARCHITECTURE.md)
- 🔌 Explore [API Documentation](docs/API_DOCUMENTATION.md)
- 🧪 Learn about [Testing Strategy](docs/TESTING.md)
- 🚀 Review [Deployment Guide](docs/DEPLOYMENT.md)
- 🔒 Understand [Security Practices](docs/SECURITY.md)
- 🤝 Check [Contributing Guidelines](docs/CONTRIBUTING.md)

## 12. Getting Help

```bash
# Show all available commands
./foodbot help

# Check system health
./foodbot doctor

# View service logs
./foodbot logs [service-name]

# Check service status
./foodbot ps
```

For more detailed information, see the [full documentation](docs/).

---

**Happy Coding! 🚀**
