# ADR-004: Source Structure Contract for API + Scheduler

## Status
Accepted

## Context

This repository started as a single API service with one runtime entrypoint.  
Cron v1 introduces a second deployable runtime (scheduler), and the previous naming now causes ambiguity:

1. "service" can mean deployable app/service (Railway service).
2. `src/services` currently means shared infrastructure adapters.
3. Domain-level "services" exist inside `src/domains/*/services`.

Without a clear contract, onboarding and maintenance become harder as the codebase moves to multi-process deployment.

## Decision

We standardize source layout semantics as follows:

1. `src/apps` = deployable runtime entrypoints and bootstrap logic.
2. `src/domains` = business logic modules and use-case orchestration.
3. `src/core` = shared infrastructure adapters and technical integrations.

Target structure:

1. `src/apps/api`
2. `src/apps/scheduler`
3. `src/domains/*`
4. `src/core/*` (rename from `src/services/*`)

## Dependency Rules

Allowed:

1. `apps -> domains`
2. `apps -> core`
3. `domains -> core`
4. `domains -> domains` (when business composition requires it)

Disallowed:

1. `domains -> apps`
2. `core -> domains`
3. `core -> apps`
4. `apps -> apps` (no runtime coupling between API and Scheduler bootstraps)

## Runtime Mapping

Deployment/runtime commands map to app entrypoints:

1. API process: `node dist/src/apps/api/index.js`
2. Scheduler process: `node dist/src/apps/scheduler/index.js`

During migration, `src/index.ts` may remain as a temporary compatibility forwarder to API bootstrap.

## Migration Guardrails

1. Keep behavior unchanged while moving files and renaming folders.
2. Split entrypoints before large scheduler behavior changes.
3. Perform `src/services -> src/core` as a dedicated refactor step with full import update.
4. Keep each migration step small and reversible.

## Consequences

Positive:

1. Clear separation between runtime bootstraps and business logic.
2. Lower cognitive load for contributors.
3. Cleaner CI/CD mapping for multi-service deployment.

Negative:

1. One-time refactor cost for directory moves and import updates.
2. Temporary compatibility shims during transition.

## Out of Scope

This ADR does not define:

1. Cron execution behavior (covered by cron PDR).
2. Queue architecture (future PRD).
3. Detailed CI/CD YAML implementation steps (tracked in implementation checklist).
