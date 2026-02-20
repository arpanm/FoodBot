# FoodBot - Quick Reference Guide

**Purpose**: Quick lookup for key information from extracted guides
**Last Updated**: 2026-02-20

---

## Document Quick Links

| Document | Purpose | When to Use |
|----------|---------|-------------|
| **EXTRACTION_SUMMARY.md** | Executive summary | For high-level overview, stakeholder presentations |
| **GUIDE_EXTRACTION_INDEX.md** | Master index | To find specific information across all documents |
| **EXTRACTED_REQUIREMENTS.md** | All features (200+) | For feature planning, gap analysis, onboarding |
| **EXTRACTED_ARCHITECTURE.md** | System design (100+ components) | For understanding system design, refactoring, debugging |
| **EXTRACTED_TASKS_COMPLETED.md** | Completed work (500+ tasks) | For tracking progress, sprint planning, reporting |

---

## Key Numbers at a Glance

| Metric | Count |
|--------|-------|
| **Total Features** | 200+ |
| **Completed Tasks** | 500+ |
| **Architectural Components** | 100+ |
| **Backend Modules** | 10+ |
| **Frontend Components** | 30+ |
| **Temporal Workflows** | 6+ |
| **Infrastructure Services** | 11 |
| **Test Coverage** | 80% minimum |
| **Guide Documents** | 9 |
| **Extraction Documents** | 5 |

---

## Technology Stack Cheat Sheet

### Frontend
```
React 18+ + TypeScript
Redux Toolkit (state)
Axios (HTTP)
Vite (build)
```

### Backend
```
NestJS (Node.js)
TypeORM (ORM)
JWT + Passport (auth)
class-validator
```

### Workflows
```
Temporal
TypeScript SDK
Saga pattern
```

### Mobile
```
React Native
Redux Toolkit
React Navigation
```

### Infrastructure
```
PostgreSQL (app + Temporal)
Redis (cache + sessions)
Kafka (events)
Elasticsearch (search)
Docker Compose
```

### Monitoring
```
Prometheus (metrics)
Grafana (dashboards)
Sentry (errors)
Loki (logs)
AlertManager (alerts)
```

---

## Command Cheat Sheet

### Wrapper Script (foodbot)

```bash
# Setup
./foodbot setup                # Full project setup
./foodbot doctor               # System health check

# Development
./foodbot dev                  # Run all services
./foodbot dev gateway-api      # Run specific service

# Infrastructure
./foodbot infra:up             # Start Docker services
./foodbot infra:down           # Stop Docker services
./foodbot infra:logs           # View logs

# Database
./foodbot db:setup             # Setup schema
./foodbot db:seed              # Seed data
./foodbot db:reset             # Reset database

# Testing
./foodbot test:unit            # Unit tests
./foodbot test:integration     # Integration tests
./foodbot test:e2e             # E2E tests
./foodbot test:coverage        # Coverage report

# Code Quality
./foodbot lint                 # Run linting
./foodbot lint:fix             # Fix linting issues
./foodbot format               # Check formatting
./foodbot format:fix           # Fix formatting
./foodbot quality              # All quality checks

# Security
./foodbot security             # Security audit
```

### pnpm Scripts

```bash
pnpm install                   # Install dependencies
pnpm test                      # Run tests
pnpm lint                      # Lint code
pnpm format                    # Format code
pnpm quality:check             # Full quality check
pnpm docker:up                 # Start Docker
pnpm docker:health             # Check health
```

---

## API Endpoints Quick Reference

### Authentication
- `POST /auth/register` - Register user
- `POST /auth/login` - Login
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Logout

### Users
- `GET /users/profile` - Get profile
- `PATCH /users/profile` - Update profile
- `GET /users/addresses` - Get addresses
- `POST /users/addresses` - Add address

### Restaurants
- `GET /restaurants/search` - Search restaurants
- `GET /restaurants/:id` - Get restaurant
- `POST /restaurants` - Create restaurant (owner)
- `PATCH /restaurants/:id` - Update restaurant (owner)

### Dishes
- `GET /dishes` - List dishes (with filters)
- `GET /dishes/:id` - Get dish
- `POST /dishes` - Add dish (owner)
- `PATCH /dishes/:id` - Update dish (owner)

### Cart
- `GET /cart` - Get cart
- `POST /cart/items` - Add to cart
- `PATCH /cart/items/:id` - Update item
- `DELETE /cart/items/:id` - Remove item
- `DELETE /cart` - Clear cart

### Orders
- `POST /orders` - Create order
- `GET /orders` - List orders
- `GET /orders/:id` - Get order
- `GET /orders/:id/tracking` - Track order
- `PATCH /orders/:id/cancel` - Cancel order

### Payments
- `POST /payments` - Process payment
- `POST /payments/:id/refund` - Refund payment

### Feedback
- `POST /feedback` - Submit feedback

### Admin
- `GET /admin/restaurants/pending` - Pending restaurants
- `POST /admin/restaurants/:id/approve` - Approve restaurant
- `POST /admin/restaurants/:id/reject` - Reject restaurant
- `GET /admin/users` - List users
- `POST /admin/users/:id/suspend` - Suspend user
- `GET /admin/dashboard` - Dashboard stats

### Health & Monitoring
- `GET /health` - Combined health
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe
- `GET /metrics` - Prometheus metrics

---

## Port Reference

| Service | Port | URL |
|---------|------|-----|
| Gateway API | 3000 | http://localhost:3000 |
| Customer App | 3001 | http://localhost:3001 |
| MCP Orchestrator | 8080 | http://localhost:8080 |
| PostgreSQL (App) | 5433 | postgres://localhost:5433 |
| PostgreSQL (Temporal) | 5432 | postgres://localhost:5432 |
| Redis | 6379 | redis://localhost:6379 |
| Redis Commander | 8081 | http://localhost:8081 |
| Kafka | 9092 | localhost:9092 |
| Kafka UI | 8082 | http://localhost:8082 |
| Elasticsearch | 9200 | http://localhost:9200 |
| Kibana | 5601 | http://localhost:5601 |
| Temporal Server | 7233 | localhost:7233 |
| Temporal UI | 8080 | http://localhost:8080 |
| Grafana | 3030 | http://localhost:3030 |
| Prometheus | 9090 | http://localhost:9090 |
| AlertManager | 9093 | http://localhost:9093 |

---

## Environment Variables

### Required
```bash
JWT_SECRET=<generate with: openssl rand -base64 32>
JWT_REFRESH_SECRET=<generate with: openssl rand -base64 32>
```

### Optional
```bash
ANTHROPIC_API_KEY=<for Claude AI features>
OPENAI_API_KEY=<for OpenAI features>
SWIGGY_API_KEY=<for Swiggy provider>
ZOMATO_API_KEY=<for Zomato provider>
SENTRY_DSN=<for Sentry error tracking>
```

---

## Project Structure

```
FoodBot/
├── apps/
│   ├── gateway-api/         # NestJS backend
│   ├── customer-app/        # React frontend
│   ├── restaurant-app/      # React restaurant dashboard
│   └── mobile-app/          # React Native mobile app
├── services/
│   └── mcp-orchestrator/    # Spring Boot MCP service
├── packages/
│   ├── workflows/           # Temporal workflows
│   ├── events/              # Kafka events
│   └── monitoring/          # Monitoring package
├── docs/
│   └── guide/               # 9 guide documents
├── prompt-docs/             # 5 extraction documents
├── scripts/                 # Utility scripts
├── .claude/
│   └── rules/               # Development guardrails
├── docker-compose.yml       # Infrastructure services
├── pnpm-workspace.yaml      # Monorepo config
└── foodbot                  # Wrapper script
```

---

## Common Tasks

### Starting the Project
```bash
./foodbot setup              # First time setup
./foodbot infra:up           # Start infrastructure
./foodbot dev                # Start development
```

### Running Tests
```bash
./foodbot test:unit          # Fast unit tests
./foodbot test:integration   # Integration tests (requires infra)
./foodbot test:e2e           # E2E tests (requires all services)
./foodbot test:coverage      # With coverage report
```

### Code Quality Check
```bash
./foodbot quality            # Run all quality checks
./foodbot quality:fix        # Auto-fix issues
```

### Database Operations
```bash
./foodbot db:reset           # Reset to clean state
./foodbot db:seed            # Add test data
```

### Debugging
```bash
./foodbot logs gateway-api   # View service logs
./foodbot infra:logs         # View infrastructure logs
./foodbot doctor             # System health check
```

---

## Test Coverage Requirements

- **Minimum**: 80% across all metrics
- **Enforced**: Pre-commit hooks + CI pipeline
- **Metrics**: Branches, functions, lines, statements

---

## Workflow Task Queues

| Queue | Purpose |
|-------|---------|
| `foodbot-main-queue` | Search, general workflows |
| `foodbot-orders-queue` | Order workflows |
| `foodbot-payments-queue` | Payment workflows |
| `foodbot-notifications-queue` | Notification workflows |
| `foodbot-onboarding-queue` | Onboarding workflows |

---

## Temporal Workflows

| Workflow | Purpose |
|----------|---------|
| `searchRestaurant` | Search restaurants with user context |
| `placeOrder` | Order placement (saga pattern) |
| `processPayment` | Payment processing (3DS support) |
| `orderFulfillment` | Order tracking (signal-based) |
| `userOnboarding` | User onboarding flow |
| `restaurantOnboarding` | Restaurant approval flow |

---

## User Roles

| Role | Capabilities |
|------|-------------|
| `customer` | Browse, order, track, feedback |
| `restaurant_owner` | Manage restaurant, menu, orders |
| `admin` | Manage users, approve restaurants, view stats |

---

## Order Status Flow

```
pending → confirmed → preparing → ready → out_for_delivery → delivered
                                     ↓
                                 cancelled (before confirmed)
```

---

## Testing Strategy

| Type | Files | Runner | Purpose |
|------|-------|--------|---------|
| Unit | `.test.ts`, `.test.tsx` | Jest | Component/service tests |
| Integration | `.spec.ts` | Jest | HTTP endpoint tests |
| E2E | `.e2e.ts` | Playwright | Full browser tests |

---

## CI/CD Pipeline

### CI (Every Push/PR)
1. Lint & type check (~2-3 min)
2. Backend tests (~5-8 min)
3. Frontend tests (~3-5 min)
4. MCP tests (~3-5 min)
5. Build (~5-7 min)
6. Security scan (~2-3 min)
7. E2E tests (~10-15 min, main only)

**Total**: 15-20 min (PR), 25-35 min (main)

### CD (Main Branch)
1. Build (~5-7 min)
2. Transfer (~1-2 min)
3. Deploy (~3-5 min)
4. Verify (~1 min)
5. Rollback if failure

**Total**: 12-15 min (success), 15-18 min (with rollback)

---

## Monitoring Endpoints

- Grafana: http://localhost:3030 (admin/admin)
- Prometheus: http://localhost:9090
- AlertManager: http://localhost:9093

---

## Quick Troubleshooting

### Services Won't Start
```bash
./foodbot doctor             # Check system
./foodbot infra:down         # Stop services
./foodbot infra:up           # Restart
```

### Port Conflicts
```bash
lsof -i :3000                # Check what's using port
kill -9 <PID>                # Kill process
```

### Database Issues
```bash
./foodbot db:reset           # Reset database
```

### Test Failures
```bash
./foodbot test:unit          # Run tests
./foodbot quality:fix        # Fix linting
```

---

## Getting Help

1. Check this quick reference
2. Review GUIDE_EXTRACTION_INDEX.md
3. Read specific extraction document
4. Check original guide documents in `docs/guide/`
5. Check development guardrails in `.claude/rules/`

---

**Pro Tip**: Bookmark this file for quick reference during development!
