---
description: Core project standards and conventions
globs: 
alwaysApply: true
---

# Project Standards & Conventions

## Documentation Structure

### Architecture Decision Records (ADRs)
- Store all key technology decisions in `docs/decisions/`
- Use ADR format for documenting architectural choices
- Include context, decision, and consequences

### Developer Guides
- Create comprehensive guides for each technology in `docs/guides/`
- Include setup, usage patterns, and best practices
- Keep guides up-to-date with current implementations

### Root Documentation
- Maintain updated `README.md` at root level
- Point to all relevant documentation resources
- Include quick start and navigation guides

### Issue Resolution Logging
- When receiving "LOG THE FIX" input, create markdown file in `docs/fixing-log/`
- Include full context of the issue and solution steps
- Use descriptive filenames with date prefix: `YYYY-MM-DD-issue-description.md`

## Planning Methodology

### Phase-Based Development
1. Work in structured phases for all major initiatives
2. Each phase gets its own file in `docs/plan/`
3. Break phases into manageable tasks
4. Use checklists to track completion status

### Task Management
- Mark tasks as checked `[x]` after completion
- Include clear acceptance criteria
- Document any blockers or dependencies

## Coding Standards

### Import Conventions
- Always use `type` keyword for type-only imports
- Example: `import type { ICreateAccountForm } from "../schemas/investment-account"`
- Keeps runtime imports separate from type imports

### File Naming
- Use `kebab-case` for all file names
- Examples: `user-service.ts`, `tournament-controller.ts`, `auth-middleware.ts`
- Consistent naming improves readability and organization

### Version Control
- Do not run Git commands during development
- Focus on code changes, let developers handle Git workflow
- Mention when commits might be needed but don't execute them

## Domain-Driven Architecture

### Service Layer Patterns
- Services handle business logic only
- Services can call Queries, Utils, and other Services
- Export single object (e.g., `SERVICES_TOURNAMENT`)
- No implementation details in service interfaces

### Query Layer Patterns
- Queries handle all database operations
- Use Drizzle ORM with proper error handling
- Export single object (e.g., `QUERIES_TOURNAMENT`)
- Include proper TypeScript types for return values

### Error Handling
- Use domain-specific error mapping
- Include proper logging with Sentry integration
- Graceful degradation for non-critical failures