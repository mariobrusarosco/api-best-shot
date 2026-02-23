# Best Shot API

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
7 - **Deviation from Standard Workflow:** If you encounter a situation that requires deviating from the standard workflow (like manually editing a generated file), that's a red flag. Report it to the user and ask for permission before proceeding.
8 - **System Flow Understanding**: Map out how components interact and affect each other
9 - **Research First**: Look up official documentation and current best practices
10 - **Impact Assessment**: Analyze how proposed changes affect upstream and downstream systems
11 - **Multiple Approaches**: Present 2-3 different solution approaches with trade-offs
12 - **Evidence-Based**: Never guess - provide research and evidence for recommendations
12 - DO NOT RUN GIT 'push', 'stash', 'add' or 'commit' commands
**NEVER:**

#### Planner Mode

- Breakdown the feature into Phases and provide a clear plan of action.
- Breakdown Phases into small tasks and provide a clear plan of action.
- Consider break tasks into subtasks.
- Create a `.md` file for the plan. Store in the `/docs/plans` folder.
- Format:

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

Example:

```
You don't have to ask permission to everyhing. let me explain:

You: "Can I start task 15.4.4?"
me: "Yes"
You:
'....
working on the task...
....'
You: "Finisish 15.4.4. Take a look and if it's good, I'll start 15.4.5"
Me: "it's all good, proceed"
You:
'....
working on the task...
....'
```

## Architecture

Refer to the [architecture](docs/ARCHITECTURE.md) for more information.

## Style Guide

Refer to the [style guide](docs/STYLE_GUIDE.md) for more information.

## Development Workflow

### Setup

1.  **Environment**: `docker compose up env-setup` (Creates `.env` from template).
2.  **Database**: `docker compose up -d` (Starts PostgreSQL container).
3.  **Dependencies**: `yarn install`.

### Running the App

- **Dev Server**: `yarn dev` (Hot-reload, logs to `dev.log`).
- **DB Studio**: `yarn db:studio` (Drizzle Studio UI at `http://localhost:4983`).
- **Status**: `yarn dev:status` (Check Docker & Volta status).

### Database Management

- **Push Schema**: `yarn db:push` (Sync schema to DB without creating migration file - dev only).
- **Generate Migration**: `yarn db:generate` (Create SQL migration file).
- **Run Migrations**: `yarn db:migrate`.
- **Seed Data**: `yarn db:seed` (Runs `scripts/run-seeds.ts`).
- **Reset**: `yarn db:reset` (Nuke & restart DB container).

### Quality & Testing

- **Test**: `yarn test` (Jest).
- **Lint**: `yarn lint` (ESLint).
- **Format**: `yarn format` (Prettier).
- **Type Check**: `yarn compile` (TSC check).

## Project Structure

```
/
├── .github/workflows/   # CI/CD Pipelines
├── docs/                # Documentation (Architecture, Guides)
├── scripts/             # Utility scripts (seeding, validation)
├── src/
│   ├── config/          # Environment & global config
│   ├── domains/         # Domain Modules (The core code)
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── guess/
│   │   ├── match/
│   │   ├── tournament/
│   │   └── ...
│   ├── middlewares/     # Express middlewares (Auth, Logger)
│   ├── services/        # Shared/Infrastructure services (DB, Logger, AI)
│   ├── utils/           # Shared utilities
│   └── index.ts         # App Entry Point
├── supabase/migrations/ # SQL Migration files
├── docker-compose.yml   # Docker services
├── drizzle.config.ts    # Drizzle ORM config
└── package.json         # Dependencies & Scripts
```

## Key Files

- `src/index.ts`: Application entry point.
- `src/services/database/schema.ts`: Aggregated database schema.
- `drizzle.config.ts`: Database configuration.
- `package.json`: Scripts and dependencies.
- `.env`: Environment variables (managed by docker setup).
