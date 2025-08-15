# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development

- `yarn dev` - Start development server with hot reload (uses ts-node-dev)
- `yarn dev:aws` - Start with AWS LocalStack services
- `yarn dev:full` - Start API, database, and frontend concurrently
- `yarn build` - Build for production (TypeScript compilation + tsc-alias)
- `yarn compile` - Type check without emitting files

### Database Operations

- `yarn db:studio` - Open Drizzle Studio (database UI)
- `yarn db:migrate` - Run database migrations
- `yarn db:push` - Push schema changes to database
- `yarn db:generate` - Generate migration files
- `yarn db:seed` - Seed database with initial data
- `yarn db:reset` - Reset database (via Docker: `docker compose down postgres -v && docker compose up -d postgres`)
- `yarn db:connect` - Connect to PostgreSQL via Docker exec
- `yarn db:logs` - View database container logs

### Testing

- `yarn test` - Run Jest tests
- `yarn test:watch` - Run tests in watch mode
- `yarn test:cov` - Run tests with coverage report
- `yarn test:scraper` - Test web scraping functionality

### Code Quality

- `yarn lint` - Run ESLint
- `yarn lint:fix` - Run ESLint with auto-fix
- `yarn format` - Format code with Prettier

### Docker & Environment

- `docker compose up -d` - Start PostgreSQL database
- `docker compose --profile aws up -d` - Start with AWS services
- `docker compose down` - Stop all containers
- `yarn dev:status` - Check Docker container and Volta status
- `yarn dev:clean` - Complete reset: stop containers, remove volumes, reinstall dependencies

## Architecture

This is a TypeScript Node.js API built with Express.js following a **three-layer domain-driven architecture**:

### Domain Structure

Each domain (auth, tournament, match, guess, etc.) follows this pattern:

```
src/domains/{domain}/
├── api/           # HTTP endpoints and route handlers
├── services/      # Business logic and data transformation
├── queries/       # Database operations (using Drizzle ORM)
├── routes/        # Express route definitions (v1, v2)
├── schema/        # Zod validation schemas
└── typing.ts      # TypeScript type definitions
```

### Key Architectural Principles

1. **Query Layer** (`queries/`) - Raw database operations using Drizzle ORM
2. **Service Layer** (`services/`) - Business logic, data transformation, error handling
3. **API Layer** (`api/`) - HTTP concerns, input validation, response formatting

### Main Entry Points

- `src/index.ts` - Application entry point
- `src/router/index.ts` - Central API router that combines all domain routes
- `src/services/database/schema.ts` - Database schema aggregation

### Technology Stack

- **Database**: PostgreSQL with Drizzle ORM
- **Runtime**: Node.js 18.17.1 (managed by Volta)
- **Framework**: Express.js with TypeScript
- **Testing**: Jest with ts-jest
- **Validation**: Zod schemas
- **Monitoring**: Sentry integration
- **Web Scraping**: Playwright for data collection
- **Cloud**: AWS S3 and Scheduler integration

### Database Schema

Database schemas are defined per domain and exported through `src/services/database/schema.ts`. Migrations are stored in `supabase/migrations/` and managed via Drizzle Kit.

### Development Environment

- Uses hybrid approach: PostgreSQL in Docker, API runs locally
- Environment variables managed through `.env` file
- Auto-generated during Docker setup
- API runs on port 9090 by default

### API Versioning

The API supports multiple versions (v1, v2) with routes organized by domain and version. All routes are aggregated in the central router.

## Development Workflow

1. Start database: `docker compose up -d`
2. Run migrations: `yarn db:migrate`
3. Seed data: `yarn db:seed`
4. Start development: `yarn dev`
5. Access API at `http://localhost:9090`
6. Access database UI: `yarn db:studio`

## Testing

- Jest configuration in `jest.config.js`
- Test files: `**/__tests__/**/*.ts` or `**/*.{spec,test}.ts`
- Coverage threshold: 70% for branches, functions, lines, statements
- Always run `yarn test` before committing changes

## Important Notes

- Always run `yarn lint` and `yarn compile` before committing
- Database operations should go in the queries layer
- Business logic belongs in the services layer
- HTTP concerns stay in the API layer
- Follow existing domain patterns when adding new features

## 🚨 CRITICAL: Environment Variable Management

**Claude: NEVER give bulk gcloud commands. User: NEVER trust bulk commands from anyone.**

### MANDATORY Process:

1. **BACKUP FIRST**: Always run the backup command from `ENVIRONMENT_MANAGEMENT.md`
2. **ONE AT A TIME**: Only add/update ONE environment variable per command
3. **VERIFY AFTER**: Check that the change worked before doing anything else
4. **NO BULK COMMANDS**: Never use commands that change multiple variables

### Claude Instructions:

- **ALWAYS** tell user to backup first using the exact commands in `ENVIRONMENT_MANAGEMENT.md`
- **NEVER** suggest commands with multiple environment variables
- **ALWAYS** explain why each step is safe
- **NO EXCEPTIONS**: Even if user is in a hurry

### User Instructions:

- **DON'T TRUST** any bulk commands from Claude or anyone else
- **ALWAYS** follow the 3-step process in `ENVIRONMENT_MANAGEMENT.md`
- **ONE VARIABLE** at a time, no exceptions
- **BACKUP FIRST**, every single time
