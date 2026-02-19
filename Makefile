# FoodBot Makefile
# Alternative interface to the foodbot wrapper script

.PHONY: help setup install build clean dev start stop test lint format

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
NC := \033[0m

##@ General

help: ## Display this help message
	@awk 'BEGIN {FS = ":.*##"; printf "\n$(BLUE)FoodBot Project Manager - Makefile Interface$(NC)\n\nUsage:\n  make $(GREEN)<target>$(NC)\n\nTargets:\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(BLUE)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

doctor: ## Check system requirements and project health
	@./foodbot doctor

##@ Setup & Installation

setup: ## Initial project setup (install + build + infra + db)
	@./foodbot setup

install: ## Install all dependencies
	@./foodbot install

##@ Build

build: ## Build all projects
	@./foodbot build

build-ts: ## Build TypeScript projects only
	@./foodbot build:ts

build-java: ## Build Java projects only
	@./foodbot build:java

build-%: ## Build a specific project (e.g., make build-gateway-api)
	@./foodbot build $*

clean: ## Clean all build artifacts
	@./foodbot clean

clean-%: ## Clean a specific project (e.g., make clean-gateway-api)
	@./foodbot clean $*

##@ Development

dev: ## Run all services in development mode
	@./foodbot dev

dev-%: ## Run a specific service in dev mode (e.g., make dev-gateway-api)
	@./foodbot dev $*

##@ Production

start: ## Start all services in production mode
	@./foodbot start

start-%: ## Start a specific service (e.g., make start-gateway-api)
	@./foodbot start $*

stop: ## Stop all running services
	@./foodbot stop

##@ Infrastructure

infra-up: ## Start infrastructure services (Docker Compose)
	@./foodbot infra:up

infra-down: ## Stop infrastructure services
	@./foodbot infra:down

infra-logs: ## Show infrastructure logs
	@./foodbot infra:logs

infra-ps: ## Show infrastructure status
	@./foodbot infra:ps

##@ Database

db-setup: ## Setup database schema
	@./foodbot db:setup

db-seed: ## Seed database with dummy data
	@./foodbot db:seed

db-reset: ## Reset database (drop + setup + seed)
	@./foodbot db:reset

db-migrate: ## Run database migrations
	@./foodbot db:migrate

##@ Testing

test: ## Run all tests
	@./foodbot test

test-unit: ## Run unit tests
	@./foodbot test:unit

test-integration: ## Run integration tests
	@./foodbot test:integration

test-e2e: ## Run E2E tests
	@./foodbot test:e2e

test-coverage: ## Run tests with coverage report
	@./foodbot test:coverage

test-%: ## Run tests for a specific project (e.g., make test-gateway-api)
	@./foodbot test $*

##@ Code Quality

lint: ## Lint all projects
	@./foodbot lint

lint-fix: ## Lint and auto-fix all projects
	@./foodbot lint:fix

lint-%: ## Lint a specific project (e.g., make lint-gateway-api)
	@./foodbot lint $*

format: ## Check code formatting
	@./foodbot format

format-fix: ## Format all code
	@./foodbot format:fix

typecheck: ## Run TypeScript type checking
	@./foodbot typecheck

quality: ## Run all quality checks (lint + format + typecheck)
	@./foodbot quality

##@ Security

security: ## Run security audit
	@./foodbot security

security-fix: ## Fix security vulnerabilities
	@./foodbot security:fix

##@ Monitoring

logs: ## Show logs for all services
	@./foodbot logs

logs-%: ## Show logs for a specific service (e.g., make logs-gateway-api)
	@./foodbot logs $*

ps: ## Show status of all services
	@./foodbot ps

##@ Convenience Aliases

run: dev ## Alias for 'dev'

serve: start ## Alias for 'start'

fmt: format-fix ## Alias for 'format-fix'

check: quality ## Alias for 'quality'
