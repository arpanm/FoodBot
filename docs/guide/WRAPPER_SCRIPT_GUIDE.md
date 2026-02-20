# FoodBot Wrapper Script - Complete Guide

**Last Verified**: 2026-02-20
**Script Version**: Based on actual `/foodbot` script analysis

The `foodbot` wrapper script is a Maven wrapper-style command-line tool that provides a unified interface for all project operations.

## Overview

The wrapper script consolidates:
- **Build Management** - Build TypeScript and Java projects
- **Development Workflow** - Run services locally
- **Infrastructure Management** - Control Docker Compose services
- **Database Operations** - Setup, seed, reset databases
- **Testing** - Unit, integration, E2E, coverage
- **Code Quality** - Linting, formatting, type checking
- **Security** - Dependency audits
- **Monitoring** - Logs, status checks

## Installation

The script is already included in the project root. Make it executable:

```bash
chmod +x foodbot
```

## Command Structure

```bash
./foodbot [COMMAND] [OPTIONS]
```

## Available Commands

### Setup & Installation

| Command | Description |
|---------|-------------|
| `./foodbot setup` | Initial project setup (install + build + infra + db) |
| `./foodbot install` | Install all dependencies |
| `./foodbot doctor` | Check system requirements and project health |

### Build Commands

| Command | Description |
|---------|-------------|
| `./foodbot build` | Build all projects |
| `./foodbot build:ts` | Build only TypeScript projects |
| `./foodbot build:java` | Build only Java projects |
| `./foodbot build [PROJECT]` | Build a specific project |

**Supported Projects:**
- `customer-app` - React Customer App (@foodbot/customer-app)
- `restaurant-app` - React Restaurant Dashboard (@foodbot/restaurant-app)
- `mobile-app` - React Native Mobile App (@foodbot/mobile-app)
- `mcp-adapter` - TypeScript MCP Adapter (@foodbot/mcp-adapter)
- `mcp-orchestrator` - Java MCP Orchestrator (Spring Boot)
- `search-orchestrator` - Search Orchestration Service (@foodbot/search-orchestrator)
- `notification-service` - Notification Service (@foodbot/notification-service)
- `workflows` - Temporal Workflows Package (@foodbot/workflows)
- `events` - Kafka Events Package (@foodbot/events)
- `security` - Security Package (@foodbot/security)
- `monitoring` - Monitoring Package (@foodbot/monitoring)
- `llm-router` - LLM Router Package (@foodbot/llm-router)

**Note**: The backend/gateway-api is located at `apps/backend` and doesn't follow the standard workspace pattern.

### Development Commands

| Command | Description |
|---------|-------------|
| `./foodbot dev` | Run all services in development mode |
| `./foodbot dev [PROJECT]` | Run a specific project in dev mode |

### Production Commands

| Command | Description |
|---------|-------------|
| `./foodbot start` | Start all services in production mode |
| `./foodbot start [PROJECT]` | Start a specific service |
| `./foodbot stop` | Stop all running services |

### Infrastructure Commands

| Command | Description |
|---------|-------------|
| `./foodbot infra:up` | Start infrastructure (Docker Compose) |
| `./foodbot infra:down` | Stop infrastructure |
| `./foodbot infra:logs` | Show infrastructure logs |
| `./foodbot infra:ps` | Show infrastructure status |

**Infrastructure Services:**
- PostgreSQL (port 5432)
- Redis (port 6379)
- Kafka + Zookeeper (port 9092)
- Elasticsearch (port 9200)
- Temporal Server (port 7233)
- Temporal UI (port 8080)

### Database Commands

| Command | Description |
|---------|-------------|
| `./foodbot db:setup` | Setup database schema (migrations) |
| `./foodbot db:seed` | Seed database with dummy data |
| `./foodbot db:reset` | Reset database (drop + setup + seed) |
| `./foodbot db:migrate` | Run database migrations |

**⚠️ Warning:** `db:reset` will delete all data. Use with caution!

### Testing Commands

| Command | Description |
|---------|-------------|
| `./foodbot test` | Run all tests |
| `./foodbot test:unit` | Run unit tests for all projects |
| `./foodbot test:integration` | Run integration tests |
| `./foodbot test:e2e` | Run E2E tests |
| `./foodbot test:coverage` | Run tests with coverage report |
| `./foodbot test [PROJECT]` | Run tests for a specific project |

### Code Quality Commands

| Command | Description |
|---------|-------------|
| `./foodbot lint` | Lint all projects |
| `./foodbot lint [PROJECT]` | Lint a specific project |
| `./foodbot lint:fix` | Lint and auto-fix all projects |
| `./foodbot format` | Check code formatting |
| `./foodbot format:fix` | Format all code |
| `./foodbot typecheck` | Run TypeScript type checking |
| `./foodbot quality` | Run all quality checks |

### Security Commands

| Command | Description |
|---------|-------------|
| `./foodbot security` | Run security audit (pnpm audit + Maven) |
| `./foodbot security:fix` | Fix security vulnerabilities |

### Monitoring Commands

| Command | Description | Status |
|---------|-------------|--------|
| `./foodbot logs` | Show logs for all services | ✅ Verified |
| `./foodbot logs [SERVICE]` | Show logs for a specific service | ✅ Verified |
| `./foodbot ps` | Show status of all services | ✅ Verified |
| `./foodbot health` | Run production health checks | ✅ Verified |
| `./foodbot monitor` | Start real-time monitoring dashboard | ✅ Verified |
| `./foodbot monitor:once` | Show metrics once and exit | ✅ Verified |

**Production Commands**:

| Command | Description | Status |
|---------|-------------|--------|
| `./foodbot deploy` | Deploy to production | ⚠️ Requires configuration |
| `./foodbot deploy:rollback` | Rollback to previous deployment | ⚠️ Requires configuration |
| `./foodbot benchmark` | Run performance benchmarks | ✅ Verified |
| `./foodbot benchmark:quick` | Run quick benchmarks only | ✅ Verified |

**Logging Stack Commands**:

| Command | Description | Status |
|---------|-------------|--------|
| `./foodbot logging:up` | Start ELK logging stack | ✅ Verified |
| `./foodbot logging:down` | Stop ELK logging stack | ✅ Verified |
| `./foodbot logging:logs` | Show logging stack logs | ✅ Verified |

### Cleanup Commands

| Command | Description |
|---------|-------------|
| `./foodbot clean` | Clean all build artifacts |
| `./foodbot clean [PROJECT]` | Clean a specific project |

## Usage Examples

### Initial Setup Workflow

```bash
# 1. Check system requirements
./foodbot doctor

# 2. One-command setup
./foodbot setup

# 3. Start development
./foodbot dev
```

### Daily Development Workflow

```bash
# Start infrastructure (if not running)
./foodbot infra:up

# Run specific service
./foodbot dev gateway-api

# In another terminal, run customer app
./foodbot dev customer-app

# View logs (for Docker services)
./foodbot logs postgres
./foodbot logs redis
```

### Before Committing Code

```bash
# Run all quality checks
./foodbot quality

# Run tests
./foodbot test

# Security audit
./foodbot security
```

### Testing Workflow

```bash
# Unit tests only (fast)
./foodbot test:unit

# Integration tests (requires infrastructure)
./foodbot infra:up
./foodbot test:integration

# E2E tests (requires all services)
./foodbot start
./foodbot test:e2e

# Coverage report
./foodbot test:coverage
# Open: coverage/lcov-report/index.html
```

### Database Development Workflow

```bash
# Reset database to clean state
./foodbot db:reset

# Or step-by-step:
./foodbot db:setup   # Migrations only
./foodbot db:seed    # Add dummy data
```

### Build Specific Projects

```bash
# Build TypeScript projects
./foodbot build:ts

# Build Java projects
./foodbot build:java

# Build a specific project
./foodbot build customer-app
./foodbot build mcp-orchestrator  # Java project
./foodbot build mobile-app
```

### Debugging Failed Services

```bash
# Check service status
./foodbot ps

# View logs
./foodbot logs gateway-api
./foodbot logs postgres

# Check infrastructure health
./foodbot infra:ps

# Restart infrastructure
./foodbot infra:down
./foodbot infra:up
```

## Environment Variables

The wrapper script respects these environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | localhost | Database host |
| `DB_PORT` | 5432 | Database port |
| `DB_NAME` | foodbot | Database name |
| `DB_USER` | foodbot | Database user |
| `DB_PASSWORD` | foodbot_dev_password | Database password |

Override as needed:

```bash
DB_NAME=foodbot_test ./foodbot db:setup
```

## Script Architecture

### Directory Structure

```
FoodBot/
├── foodbot                   # Main wrapper script ⭐
├── Makefile                  # Makefile interface
└── scripts/
    ├── db-setup.sh          # Database schema setup
    ├── db-seed.sh           # Database seeding
    ├── db-reset.sh          # Database reset
    └── README.md            # Scripts documentation
```

### How It Works

1. **Main Script** (`./foodbot`) - Entry point that routes commands
2. **Command Functions** - Each command has a dedicated bash function
3. **Helper Functions** - Reusable utilities (colors, checks, etc.)
4. **Sub-scripts** - Called for specific operations (database, etc.)

### Scripts Called by Wrapper

The wrapper script delegates to these sub-scripts (all verified to exist):

| Script | Purpose | Status |
|--------|---------|--------|
| `scripts/db-setup.sh` | Database schema setup | ✅ Exists |
| `scripts/db-seed.sh` | Database seeding with test data | ✅ Exists |
| `scripts/db-reset.sh` | Drop and recreate database | ✅ Exists |
| `scripts/health-check.sh` | Production health checks | ✅ Exists |
| `scripts/monitor.sh` | Real-time monitoring dashboard | ✅ Exists |
| `scripts/production-deploy.sh` | Production deployment | ✅ Exists |

**Note**: Some commands reference scripts that may need configuration:
- `deploy` and `deploy:rollback` - Require production environment setup
- `benchmark` commands - Require `performance/benchmark.sh` directory

### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Missing requirements |
| 130 | Interrupted by user (Ctrl+C) |

## Makefile Alternative

If you prefer Makefiles, use:

```bash
# Show all available targets
make help

# Equivalent commands
make dev                # Same as ./foodbot dev
make test               # Same as ./foodbot test
make build              # Same as ./foodbot build
make db-setup           # Same as ./foodbot db:setup
```

## Troubleshooting

### Script Not Executable

```bash
chmod +x foodbot
```

### Command Not Found

Make sure you're in the project root directory:

```bash
cd /path/to/FoodBot
./foodbot help
```

### Permission Denied

On some systems, you may need:

```bash
bash foodbot [command]
```

### Docker Issues

```bash
# Check Docker is running
./foodbot doctor

# Restart infrastructure
./foodbot infra:down
./foodbot infra:up
```

### Port Already in Use

```bash
# Stop services
./foodbot stop

# Or manually kill processes
lsof -ti:3000 | xargs kill -9
```

## Extending the Wrapper Script

### Adding a New Command

1. Open `foodbot` in your editor
2. Add a function following the naming convention:

```bash
do_your_command() {
    print_header "Your Command Title"

    # Your implementation here

    print_success "Command complete"
}
```

3. Add the case statement in `main()`:

```bash
your-command)
    do_your_command "$@"
    ;;
```

4. Update the help text in `show_help()`

### Adding a New Project

To add a new project to build/dev/test commands, ensure:

1. It's in the pnpm workspace (`pnpm-workspace.yaml`)
2. Package name follows `@foodbot/[project-name]` convention
3. Has standard scripts in `package.json`:
   - `dev` - Development mode
   - `build` - Production build
   - `test` - Run tests
   - `lint` - Linting

## Best Practices

1. **Always use the wrapper script** instead of manual commands
2. **Run `./foodbot doctor`** when encountering issues
3. **Check logs** with `./foodbot logs` for debugging
4. **Use specific commands** when possible (faster than running all)
5. **Run quality checks** before committing code
6. **Document new commands** when extending the script

## Related Documentation

- [QUICKSTART.md](../QUICKSTART.md) - Quick start guide
- [DEVELOPMENT_SETUP.md](DEVELOPMENT_SETUP.md) - Detailed setup
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contributing guidelines
- [scripts/README.md](../scripts/README.md) - Scripts documentation

---

**For help:** `./foodbot help`

**For system check:** `./foodbot doctor`
