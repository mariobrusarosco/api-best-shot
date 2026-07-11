# Cloudflare Deployment Follow-Ups

## Purpose

Track work that became relevant after the first successful Cloudflare Container deployment but is
not required to complete the Almanac hello slice.

The proven baseline is:

```text
GitHub Actions
  -> Wrangler
  -> Cloudflare Worker
  -> Cloudflare Container
  -> Node/Express API
```

Deployed demo:

```text
https://football-platform-api-demo.mariobrusarosco.workers.dev
```

The original proof and its completed validation remain documented in
[Slice: Almanac Hello On Cloudflare](../slices/almanac-cloudflare-hello.md).

## Environment Promotion

- [x] Decide whether to create demo, staging, and production deployments now.
- [ ] Revisit the environment split when the application has environment-specific infrastructure
  or is ready for user traffic.
- [ ] When a split is needed, design one reusable Cloudflare deployment workflow with small
  environment-specific callers or inputs.

Current decision:

```text
Keep one manual Cloudflare demo workflow for now.

Do not create staging and production deployments until the application has real
environment-specific infrastructure or is ready for user traffic.

When the split becomes necessary, avoid copying the complete deployment implementation into
three independent workflows that can drift apart.

Use consistent configuration names when environments are introduced:

```text
GitHub environment: <environment>
  -> DATABASE_URL

Cloudflare Worker: football-platform-api-<environment>
  -> DATABASE_URL
```

Environment identity belongs to the configuration scope, not to the secret name.
```

## Database Deployment

- [x] Decide how demo database migrations run when the first deployed schema is introduced.
- [x] Run demo migrations as an explicit step in the existing manual Cloudflare workflow.
- [x] Keep the idempotent Almanac seed step visible but disabled while demo data is entered
  manually.
- [ ] Revisit whether staging and production should use a dedicated or reusable database workflow
  before either environment is introduced.
- [x] Configure `DATABASE_URL` in the GitHub `demo` environment and the demo Cloudflare Worker.
- [ ] Run the remote migration and deployment, then verify `/api/health/db` manually.
- [x] Keep `/api/health/db` as a manually checked operator diagnostic rather than an automated
  release gate until rollback behavior is designed.
- [ ] Replace the shared demo `postgres` credential with separate least-privilege runtime and
  migration roles before creating production.

Trigger:

```text
The demo implementation is tracked in
`docs/slices/almanac-editions-database.md`. Revisit the remaining items before staging or
production is introduced.
```

## Reliability And Rollback

- [ ] Define what should happen when post-deploy route verification fails.
- [ ] Define and test the rollback mechanism before making verification an automated deployment
  gate.
- [ ] Add automated post-deploy verification only after failure handling is explicit.

Trigger:

```text
Start this work before the Cloudflare deployment becomes an automatic production release path.
```

## Documentation And Legacy Cleanup

- [ ] Update `README.md` with the proven Cloudflare deployment architecture and commands.
- [x] Remove stale README statements that list Almanac and Cloudflare as not implemented.
- [x] Delete the obsolete Railway demo, staging, and production workflows. Deployment history
  remains available through Git and `legacy/` documentation rather than executable root workflows.
- [ ] Remove deployment configuration that is proven unnecessary, including the currently inactive
  `minimumReleaseAgeExclude` entries.

## Architecture Record

- [ ] Decide whether the accepted Node/Express-on-Cloudflare-Containers architecture needs a formal
  ADR.
- [ ] If an ADR is useful, create it with the actual next ADR number and record the runtime decision,
  alternatives, constraints, and consequences.

ADR 0001 records database domain boundaries, not the Cloudflare runtime decision. If the runtime
decision receives its own ADR, it must use the next available ADR number.
