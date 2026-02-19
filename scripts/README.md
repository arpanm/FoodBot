# FoodBot Scripts

This directory contains utility scripts for managing the FoodBot project.

## Available Scripts

### Database Management

- **`db-setup.sh`** - Sets up the database schema by running TypeORM migrations
- **`db-seed.sh`** - Populates the database with dummy data for development/testing
- **`db-reset.sh`** - Completely resets the database (drop + setup + seed)

### Usage Examples

```bash
# Setup database schema
./scripts/db-setup.sh

# Seed database with dummy data
./scripts/db-seed.sh

# Reset entire database (WARNING: Deletes all data)
./scripts/db-reset.sh
```

## Main Wrapper Script

The main `./foodbot` wrapper script at the project root provides a unified interface for all project operations. Use it instead of calling individual scripts directly:

```bash
# Initial setup
./foodbot setup

# Database operations
./foodbot db:setup
./foodbot db:seed
./foodbot db:reset

# Development
./foodbot dev
./foodbot dev gateway-api

# Testing
./foodbot test
./foodbot test:unit
./foodbot test:coverage

# Quality checks
./foodbot lint
./foodbot format
./foodbot security

# See all available commands
./foodbot help
```

## Makefile Alternative

You can also use the Makefile for common operations:

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
```

## Adding New Scripts

When adding new scripts:

1. Place them in the `scripts/` directory
2. Make them executable: `chmod +x scripts/your-script.sh`
3. Add proper error handling: `set -e` at the top
4. Use colors for output (GREEN, BLUE, RED, YELLOW)
5. Add documentation to this README
6. Update the main `foodbot` wrapper if needed

## Environment Variables

Scripts respect the following environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_HOST` | localhost | Database host |
| `DB_PORT` | 5432 | Database port |
| `DB_NAME` | foodbot | Database name |
| `DB_USER` | foodbot | Database user |
| `DB_PASSWORD` | foodbot_dev_password | Database password |

Override them as needed:

```bash
DB_NAME=foodbot_test ./scripts/db-setup.sh
```
