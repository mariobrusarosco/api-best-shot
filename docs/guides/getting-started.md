# Getting Started with Best Shot API

## Overview

Best Shot API uses a **hybrid development approach** combining Docker for infrastructure and local tools for development.

```
┌─────────────────────────────────────────────────────────┐
│                  Development Environment                 │
├───────────────────────┐                ┌────────────────┤
│    Docker (Infrastructure)             │   Local (Dev)   │
│    ┌─────────────┐    │                │ ┌────────────┐ │
│    │  PostgreSQL │    │                │ │   Volta    │ │
│    │  Database   │    │                │ │  Node.js   │ │
│    └─────────────┘    │                │ │   Yarn     │ │
│    ┌─────────────┐    │                │ └────────────┘ │
│    │ AWS Local   │    │     REST       │ ┌────────────┐ │
│    │   Stack     │◄───┼────────────────┼─┤    API     │ │
│    └─────────────┘    │                │ │  Process   │ │
└───────────────────────┘                └────────────────┘
```

**Benefits:**

- **Docker**: Consistent database, AWS testing, monitoring
- **Local**: Native speed, better debugging, faster hot reload

## Prerequisites

### Required Software

1. **Git**

   ```bash
   git --version  # Should be 2.0.0 or higher
   ```

2. **Docker & Docker Compose**

   ```bash
   docker --version        # Should be 20.10.0 or higher
   docker compose version # Should be 2.0.0 or higher
   ```

3. **Volta** (Node.js Version Manager)

   ```bash
   # Install Volta
   curl https://get.volta.sh | bash

   # Restart terminal, then verify
   volta --version
   ```

### Optional but Recommended

**Visual Studio Code** with extensions:

- Docker
- TypeScript and JavaScript Language Features
- ESLint
- Prettier
- GitLens

## Quick Start

### 1. Clone and Setup

```bash
# Clone repository
git clone https://github.com/mariobrusarosco/api-best-shot.git
cd api-best-shot

# Run automated setup
docker compose --profile initial up initial_setup
```

### 2. Verify Installation

```bash
# Check Node.js and Yarn versions (managed by Volta)
node -v   # Should show 22.17.0
yarn -v   # Should show 3.8.7

# Check Docker services
yarn dev:status
```

### 3. Start Development

```bash
# Start API with hot reload
yarn dev

# API available at http://localhost:9090
```

## Development Workflows

### Daily Development (Most Common)

```bash
# Morning startup
yarn dev                # Starts API + PostgreSQL

# During development
yarn db:connect         # Database CLI when needed
yarn db:studio          # Database UI

# End of day
yarn dev:stop           # Stop all services
```

### Full Development Environment

```bash
# Start all services (API, database, frontend)
yarn dev:full

# Complete environment reset (if needed)
yarn dev:clean
```

### Database Operations

```bash
# Database management
yarn db:migrate         # Apply migrations
yarn db:seed           # Seed test data
yarn db:reset          # ⚠️ Reset database (deletes data)

# Database access
yarn db:connect        # PostgreSQL CLI
yarn db:studio         # Database UI
yarn db:logs           # View database logs
```

## Project Structure

```
api-best-shot/
├── src/               # Source code
│   ├── domains/      # Business domains (auth, tournament, etc.)
│   ├── config/       # Configuration (env, database)
│   ├── services/     # Shared services
│   └── index.ts      # Application entry point
├── docs/             # Documentation
├── scripts/          # Development scripts
├── supabase/         # Database migrations
└── docker-compose.yml # Infrastructure configuration
```

### Domain-Driven Architecture

Each domain follows this pattern:

```
src/domains/{domain}/
├── api/           # HTTP endpoints
├── services/      # Business logic
├── queries/       # Database operations
├── routes/        # Express routes
├── schema/        # Database schema
└── typing.ts      # TypeScript types
```

## Configuration

### Environment Variables

The project uses context-aware environment validation:

- **Application**: Requires ALL variables (AWS, Sentry, JWT, etc.)
- **Database**: Only requires database connection for migrations

**Local Development** (auto-generated):

```bash
# Database
DB_USER=dev_user
DB_PASSWORD=dev_pass
DB_NAME=bestshot_dev

# Application
NODE_ENV=development
PORT=9090
JWT_SECRET=dev-secret
```

### Docker Services

**Always Running:**

- PostgreSQL database

**Optional Profiles:**

```bash
# AWS testing
docker compose --profile aws up -d

# All services
docker compose --profile all up -d
```

## Common Tasks

### Code Quality

```bash
# Type checking
yarn compile

# Linting and formatting
yarn lint
yarn lint:fix
yarn format

# Testing
yarn test
yarn test:watch
yarn test:cov
```

### Environment Management

```bash
# Status check
yarn dev:status        # Shows containers + Node.js versions

# Maintenance
yarn dev:clean         # Complete reset
yarn dev:logs          # View API logs
yarn dev:logs:clear    # Clear log files
```

## Troubleshooting

### Common Issues

1. **Docker Won't Start**

   ```bash
   docker compose down -v
   docker compose up -d
   ```

2. **Wrong Node.js Version**

   ```bash
   # Volta auto-manages versions when you cd into project
   cd api-best-shot
   node -v  # Should show correct version

   # Force reinstall if needed
   volta install node@22.17.0
   volta install yarn@3.8.7
   ```

3. **Database Connection Issues**

   ```bash
   # Check database status
   docker compose ps postgres
   yarn db:logs

   # Reset database
   yarn db:reset
   ```

4. **Environment Issues**

   ```bash
   # Regenerate environment
   yarn dev:clean
   docker compose --profile initial up initial_setup
   ```

5. **Migration Failures**

   ```bash
   # Check drizzle configuration
   yarn db:check

   # Generate new migration
   yarn db:generate --name "description"
   ```

### Getting Help

1. Check documentation in `/docs/`
2. Run `yarn dev:status` for system health
3. View logs: `yarn dev:logs` or `yarn db:logs`
4. Create GitHub issue for bugs

## Next Steps

- **Architecture**: [Architecture Overview](../architecture/overview.md)
- **Environment**: [Environment Management](./environment-management.md)
- **Database**: [Database Operations](./database-operations.md)
- **Testing**: [Testing Guide](./testing.md)

## Best Practices

- **Always use yarn** (not npm)
- **Let Volta manage Node.js versions** automatically
- **Use provided scripts** instead of raw Docker commands
- **Run `yarn lint` and `yarn compile`** before committing
- **Follow domain patterns** when adding features
