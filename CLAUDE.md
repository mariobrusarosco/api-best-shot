# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development

- `yarn dev` - Start development server with hot reload (uses ts-node-dev via ./dev-with-logs.sh)
- `yarn dev:no-logs` - Start development server without log file output
- `yarn dev:full` - Start API, database, and frontend concurrently
- `yarn build` - Build for production (TypeScript compilation + tsc-alias)
- `yarn compile` - Type check without emitting files
- `yarn dev:status` - Check Docker container and Volta status
- `yarn dev:clean` - Complete reset: stop containers, remove volumes, reinstall dependencies

### Database Operations

#### Schema Change Workflow (CRITICAL - Follow This Order!)

**When adding/modifying database schema:**

1. **Update TypeScript schema** in `src/domains/{domain}/schema/index.ts`
2. **Generate migration**: `yarn db:generate` (creates both .sql and snapshot files)
3. **Apply migration**: `yarn db:migrate`
4. **Verify changes**: Check database with `yarn db:studio`

**❌ NEVER manually create migration files in `supabase/migrations/`**
**✅ ALWAYS use `yarn db:generate` first**

#### Development Workflow Commands

- `yarn db:generate` - Generate migration files from schema changes (ALWAYS FIRST)
- `yarn db:migrate` - Apply pending migrations to database
- `yarn db:studio` - Open Drizzle Studio (database UI)
- `yarn db:seed` - Seed database with initial data
- `yarn db:reset` - Reset database (via Docker: `docker compose down postgres -v && docker compose up -d postgres`)
- `yarn db:connect` - Connect to PostgreSQL via Docker exec
- `yarn db:logs` - View database container logs

#### Production Migrations

**✅ AUTOMATED**: Migrations run automatically during CI/CD deployment to demo/production

- Triggered on every push to `main` branch
- Runs BEFORE application deployment
- Ensures zero-downtime deployments

**Manual Emergency Migrations**:

- Go to GitHub Actions → "Database Migrations" workflow
- Select environment (demo/production)
- Click "Run workflow"

**📖 DOCUMENTATION**: See `docs/database-migrations.md` for complete visual guide

#### Emergency/Debugging Commands

- `yarn db:push` - Direct schema sync (bypasses migrations - use for hotfixes only)
- `yarn db:check` - Validate migration files
- `yarn db:drop` - Remove migration files (dangerous)

### Testing

- `yarn test` - Run Jest tests
- `yarn test:watch` - Run tests in watch mode
- `yarn test:cov` - Run tests with coverage report
- `yarn test:scraper` - Test web scraping functionality (Playwright-based)
- `yarn test:cov` - Run tests with coverage report (70% threshold)

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
├── api/                # HTTP endpoints and route handlers
├── services/           # Business logic and data transformation
├── queries/            # Database operations (using Drizzle ORM)
├── routes/             # Express route definitions (v1, v2)
├── schema/             # Database schema definitions (Drizzle tables)
├── typing.ts           # TypeScript type definitions
└── (optional):
    ├── controllers/    # Complex business logic (some domains)
    ├── error-handling/ # Domain-specific error mapping
    └── utils/          # Domain-specific utilities
```

### Naming Conventions

- **Exports**: `API_{DOMAIN}`, `SERVICES_{DOMAIN}`, `QUERIES_{DOMAIN}`
- **Database Tables**: `T_` prefix (e.g., `T_Tournament`, `T_Match`)
- **Database Types**: `DB_Insert{Entity}`, `DB_Update{Entity}`, `DB_Select{Entity}`

### Key Architectural Principles

1. **Query Layer** (`queries/`) - Pure database operations using Drizzle ORM, no business logic
2. **Service Layer** (`services/`) - Business logic, data transformation, cross-domain orchestration
3. **API Layer** (`api/`) - HTTP concerns, request/response handling, calls services for business logic

### Main Entry Points

- `src/index.ts` - Application entry point
- `src/router/index.ts` - Central API router that combines all domain routes
- `src/services/database/schema.ts` - Database schema aggregation

### Technology Stack

- **Database**: PostgreSQL with Drizzle ORM
- **Runtime**: Node.js 22.17.0 (managed by Volta with Yarn 3.8.7)
- **Framework**: Express.js with TypeScript
- **Testing**: Jest with ts-jest
- **Validation**: Zod schemas
- **Monitoring**: Sentry integration
- **Web Scraping**: Playwright for automated data collection from external sources
- **Cloud**: AWS S3 (file storage), Scheduler (automated tasks), GCP Cloud Run (hosting)
- **Data Providers**: Sofascore integration for live sports data

### Database Schema

Database schemas are defined per domain in `src/domains/{domain}/schema/index.ts` and aggregated in `src/services/database/schema.ts`. All tables include timestamps (`createdAt`, `updatedAt`) with automatic updates. Migrations are stored in `supabase/migrations/` and managed via Drizzle Kit with automatic CI/CD deployment.

### Cross-Domain Communication

- Services can call other domain services directly
- Routes can mount endpoints from other domains
- Example: Tournament routes include match and guess endpoints
- Maintains separation while allowing necessary integration

### Development Environment

- Uses hybrid approach: PostgreSQL in Docker, API runs locally
- Environment variables managed through `.env` file
- Auto-generated during Docker setup
- API runs on port 9090 by default

### API Versioning

The API supports multiple versions (v1, v2) with routes organized by domain and version. All routes are aggregated in the central router.

## Development Workflow

### Initial Setup

1. Start database: `docker compose up -d`
2. Run migrations: `yarn db:migrate`
3. Seed data: `yarn db:seed`
4. Start development: `yarn dev`
5. Access API at `http://localhost:9090`
6. Access database UI: `yarn db:studio`

### Schema Change Workflow

1. **Modify schema** in TypeScript files (`src/domains/{domain}/schema/index.ts`)
2. **Generate migration**: `yarn db:generate`
3. **Apply migration**: `yarn db:migrate`
4. **Test changes**: Verify with API/Studio

## Testing

- Jest configuration in `jest.config.js`
- Test files: `**/__tests__/**/*.ts` or `**/*.{spec,test}.ts`
- Coverage threshold: 70% for branches, functions, lines, statements
- Always run `yarn test` before committing changes

## Important Notes

- Always run `yarn lint` and `yarn compile` before committing
- Follow the three-layer architecture strictly:
  - Database operations: queries layer only
  - Business logic: services layer only
  - HTTP concerns: API layer only
- Use consistent naming conventions across domains
- Cross-domain calls should go through services, not queries
- Follow existing domain patterns when adding new features
- All database tables must include `createdAt` and `updatedAt` timestamps

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
