# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## MUST READ

90% of the time, your guidance is sloppy and workaround-based. How can I make you think less as bad engineer and incresase your level of competence?
Instead of "I recommend another workaround" as you do," you MUST BEHAVE as
"Oh, I see that you wanna level this up to enterprise techicniques, so let's finish the uncompleted work of XPTO.
Actually, let's improve the structure to become even better. Let me show a better plan, maybe we can write less code if we are smarter"...

See the difference? How can I stop struggling with you everytime I need some
good work?

I've been paying Claude for two years. Two years of this is too much. I can't stand Dario, your CEO bullshiting about how enginnering work will be over in 12 months given that on the last 24 you've been poorly performing.

## Core Mandates

1 - **Strict Scope Adherence:** Do not fix unrelated bugs, refactor code, or change naming conventions outside the explicit scope of the user's request, even if you find errors. If you
discover critical issues that block the requested task, report them to the user and ask for permission before proceeding
2 - **Strict Scope Adherence:** Focus exclusively on the user's request. Do not fix unrelated bugs, refactor code, or change naming conventions unless explicitly asked. If a deviation
adds significant value or is critical, ask for permission first.
3 - **Think Before You Act:** DO NOT RUSH. Analyze the request, reason through the solution, and plan your steps. If a request is vague, ask for clarification. Only proceed with
implementation when the path is clear and agreed upon.
4 - **Verify Assumptions:** Never guess APIs or library functionality. Always read documentation or search for examples before writing code. "Sloppy solutions" based on assumptions are
strictly forbidden.
5 - **Context Awareness:** Understand the project's existing architecture and conventions before making changes. Your goal is to provide high-quality, integrated code that respects the
current codebase
6 - **Full Context Analysis**: Read and understand ALL relevant files in their entirety
7 - **System Flow Understanding**: Map out how components interact and affect each other
8 - **Research First**: Look up official documentation and current best practices
9 - **Impact Assessment**: Analyze how proposed changes affect upstream and downstream systems
10 - **Multiple Approaches**: Present 2-3 different solution approaches with trade-offs
11 - **Evidence-Based**: Never guess - provide research and evidence for recommendations

**NEVER:**

- Jump to quick fixes without understanding the full system
- Make isolated changes without considering broader impacts
- Propose solutions based on assumptions
- Skip research and documentation review
- Run GIT 'push', 'stash', 'add' or 'commit' commands

## Planner Mode

- Breakdown the feature into Phases and provide a clear plan of action.
- Breakdown Phases into small tasks and provide a clear plan of action.
- Consider break tasks into subtasks.
- Create a `.md` file for the plan. Store in the `/docs/plans` folder.
- Fprmat

```
# Phase 1

## Goal

## Tasks

### Task 1 - lorem ipsum dolor sit amet []
#### Task 1.1 - lorem ipsum dolor sit amet []
#### Task 1.2 - lorem ipsum dolor sit amet []

...


## Dependencies

## Expected Result

## Next Steps

```

- Once you finish a task or subtask, ask user to review your work.
- Wait for user's confirmation before proceeding to the next task or subtask.
- Be patient and don't rush into fixes and implementations.
- Be ready to do fixes.
- Once confirmed by the user, mark the current sub-task or task as done.
- If you need to do a fix, mark the current sub-task or task as in progress.

**For CI/CD, Docker, Deployment Issues:**

- Analyze the complete pipeline: build → test → deploy → runtime
- Check ALL related configuration files (Dockerfile, workflows, package.json, etc.)
- Understand multi-stage build processes and dependencies
- Research tool-specific best practices and breaking changes

## Task-Specific Guidelines (READ FIRST!)

**Before starting ANY task, check this table for required reading:**

| Task Type                          | Required Reading                              | Key Workflows                                  | Commands                                                   |
| ---------------------------------- | --------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------- |
| **Database Migrations**            | `/docs/guides/database-migrations.md`         | Modify schema → Generate → Apply → Test        | `yarn db:generate --name "description"`, `yarn db:migrate` |
| **Database Multi-Step Operations** | `/docs/guides/database-transactions-guide.md` | Always use transactions for related operations | Use `db.transaction(async tx => {...})`                    |
| **CI/CD & Deployment**             | (Check GitHub Actions workflows)              | Understand automated deployment flow           | Review `.github/workflows/`                                |

**Checklist When Starting a Task:**

1. ✅ Check table above - does this task type have required reading?
2. ✅ If YES → READ THE GUIDE FIRST, then ask user if ready to proceed
3. ✅ If NO → Ask user: "Should I review any guides before proceeding?"
4. ✅ Follow documented workflows exactly (don't improvise)
5. ✅ Ask user to review your work before proceeding to next step

**Example Flow:**

```
User: "Let's start with Phase 1, Task 1.1 - Database Migration"

You (AI):
1. "I see this is a database migration task."
2. "Let me read /docs/guides/database-migrations.md first..."
3. [Reads guide]
4. "According to the guide, the workflow is: Modify Schema → Generate Migration → Apply Locally → Test"
5. "Ready to proceed with this workflow?"
```

## Project Overview

Best Shot API is a TypeScript/Express.js backend service for a football prediction application. Users can join leagues, make match predictions, and compete based on accuracy.

**Core Technologies:**

- TypeScript/Express.js (API framework)
- PostgreSQL + Drizzle ORM (data layer)
- AWS Lambda/Scheduler (automated tasks)
- Docker (local development)

**Architecture:**

- Domain-Driven Design with strict separation of concerns
- API versioning (v1/v2) for backward compatibility
- External data integration (SofaScore, web scraping)
- Automated scheduling for real-time match updates

**Key Features:**

- User authentication (JWT)
- League and tournament management
- Match predictions/guessing system
- Live score updates via AWS Scheduler
- Analytics dashboard

## Key Commands

### Development

```bash
# Start development environment (database + API with hot reload)
yarn dev                    # Start API with logs
yarn dev:no-logs           # Start API without logs
yarn dev:full              # Start DB, API, and frontend concurrently

# Database management
docker compose up -d        # Start PostgreSQL container
yarn db:migrate            # Run database migrations
yarn db:generate           # Generate new migration files
yarn db:studio             # Open Drizzle Studio UI (visual DB management)
yarn db:seed               # Seed database with initial data
yarn db:reset              # Reset database (removes all data)

# Testing
yarn test                  # Run all tests
yarn test:watch           # Run tests in watch mode
yarn test:cov             # Run tests with coverage

# Environment Management
yarn dev-demo             # Run API with demo environment (.env.demo)
yarn dev-prod             # Run API with production environment (.env.production)
yarn serve-demo           # Serve built demo version
yarn serve-prod           # Serve built production version

# Development Utilities
yarn dev:clean            # Reset development environment (stop containers, clean deps)
yarn dev:stop             # Stop Docker containers
yarn dev:status           # Check Docker containers and Volta versions
yarn dev:logs             # View API development logs
yarn dev:logs:clear       # Clear API development logs

# Code quality
yarn lint                  # Run ESLint
yarn lint:fix             # Fix linting issues
yarn format               # Format code with Prettier
yarn compile              # Type-check without building

# Build & Deploy
yarn build                 # Build for production
yarn build-demo           # Build for demo environment
yarn build-prod           # Build for production with Sentry
```

### Environment Validation

```bash
yarn validate:secrets      # Validate environment secrets are configured
yarn validate:gcp         # Validate GCP setup
yarn validate:all        # Run all validations
```

## Architecture

### Domain-Driven Design Structure

The codebase is organized into domains under `src/domains/`, each containing:

- **api/**: HTTP endpoint handlers
- **routes/**: Express route definitions (v1/v2 versioning)
- **controllers/**: Business logic orchestration
- **services/**: Core business logic
- **queries/**: Database query layer (Drizzle ORM)
- **schema/**: Database schema definitions
- **typing/**: TypeScript type definitions
- **error-handling/**: Domain-specific error mappers

### Key Domains

- **auth**: Authentication/authorization with JWT
- **data-provider**: External data fetching (SofaScore integration, web scraping)
- **dashboard**: Analytics and reporting
- **guess**: User predictions/guesses functionality
- **league**: League management
- **match**: Match data and operations
- **member**: User management
- **tournament**: Tournament operations
- **admin**: Administrative functions

### Database Schema

Database schemas are defined per domain and aggregated in `src/services/database/schema.ts`. Migrations are managed with Drizzle Kit and stored in `supabase/migrations/`.

### API Routing

All API routes are mounted under `/api` with versioning:

- `/api/v1/[domain]`
- `/api/v2/[domain]`

Routes are centrally registered in `src/router/index.ts`.

## Development Workflow

### Environment Setup

The project uses Docker for PostgreSQL and local Node.js (managed by Volta) for the API:

1. `.env` file is auto-created by Docker Compose if missing
2. Database runs in container on port 5432 (configurable)
3. API runs locally on port 9090 with hot reloading

## Import Aliases

- Always use absolute imports with aliases like `@domains`, `@components`, etc.

### TypeScript Configuration

- Path alias: `@/` maps to `src/`
- Strict mode enabled
- Source maps enabled for debugging
- Target: ESNext, Module: CommonJS

### Testing

- Jest with ts-jest for unit tests
- Test files: `*.test.ts` or `*.spec.ts`
- Coverage thresholds: 70% for all metrics
- Path aliases work in tests

### Code Quality

- ESLint with TypeScript plugin
- Prettier for formatting
- Husky pre-commit hooks run: `yarn compile && yarn lint-staged`
- Lint-staged runs ESLint and Prettier on staged files

## Important Patterns

### Error Handling

Each domain has error mappers in `error-handling/mapper.ts` that transform domain errors to HTTP responses.

### Middleware

- Authentication middleware in `src/domains/auth/middleware.ts`
- Internal service auth in `src/domains/auth/internal-middleware.ts`
- Access control in `src/domains/shared/middlewares/access-control.ts`

### Data Providers

External data fetching uses provider pattern:

- SofaScore API integration
- Playwright for web scraping
- AWS S3 for file storage

### Scheduling

AWS Scheduler integration for automated tasks:

- Daily score updates
- Knockout stage updates
- Standings refresh

## External Services

- **AWS**: S3 (file storage), Scheduler (cron jobs), Lambda (serverless functions)
- **Sentry**: Error tracking and performance monitoring
- **OpenAI**: AI predictions service
- **SofaScore**: Football data provider
- **PostgreSQL**: Primary database (Docker container in development)

## CI/CD & Deployment

The project has GitHub Actions workflows for automated deployment:

- **Lambda Functions**: Automated deployment of AWS Lambda functions (`data-provider-lambdas.yml`)
  - Supports demo and production environments
  - Deploys layers and functions based on file changes
  - Includes comprehensive testing and validation

### Lambda Functions

- `caller-scores-and-standings`: Updates match scores and tournament standings
- `caller-knockouts-update`: Updates knockout tournament brackets
- `caller-daily-routine`: Creates daily schedules for match automation

### Deployment Scripts

- Lambda deployment scripts in `scripts/` directory
- Environment-specific validation scripts

## Deployment

The application supports multiple environments:

- Development (local)
- Demo (staging)
- Production

Each environment has specific build commands and uses environment-specific `.env` files.

## Key Considerations

- Always validate environment variables before starting
- Database migrations must be run after schema changes
- Use Drizzle Studio for visual database management
- Follow domain boundaries - avoid cross-domain imports
- Maintain API versioning for backward compatibility
- File naming: Use kebab-case
- Import types with `type` keyword: `import type { ... }`
- Never run Git commands directly (per project cursor rules)
- Log fixes in `docs/fixing-log` when requested with "LOG THE FIX"

## Development Guidelines

### Project Organization

- Store ADRs in `docs/decisions`
- Developer guides in `docs/guides`
- Planning phases in `docs/plan`
- Use checklists to track phase completion

### Single Test Execution

```bash
# Run specific test file
yarn test path/to/test-file.test.ts

# Run tests in watch mode for specific pattern
yarn test:watch --testNamePattern="specific test name"
```

### Database Operations

```bash
# Connect to database directly
yarn db:connect

# Check database logs
docker compose logs -f postgres

# Reset database completely
yarn db:reset
```
