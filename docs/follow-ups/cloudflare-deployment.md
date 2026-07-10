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
```

## Database Deployment

- [ ] Decide how production database migrations run when the first deployed schema is introduced.
- [ ] Decide whether migrations use a dedicated workflow, a reusable workflow job, or an explicit
  release step.
- [ ] Configure the deployed database connection before treating `/api/health/db` as a deployment
  health requirement.
- [ ] Decide whether `/api/health/db` is an operator diagnostic or a release gate.

Trigger:

```text
Start this work when a product slice introduces the first deployed database schema.
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
- [ ] Remove stale README statements that list Almanac and Cloudflare as not implemented.
- [ ] Decide when to delete the disabled Railway workflows instead of retaining them as legacy
  reference material.
- [ ] Remove deployment configuration that is proven unnecessary, including the currently inactive
  `minimumReleaseAgeExclude` entries.

## Architecture Record

- [ ] Decide whether the accepted Node/Express-on-Cloudflare-Containers architecture needs a formal
  ADR.
- [ ] If an ADR is useful, create it with the actual next ADR number and record the runtime decision,
  alternatives, constraints, and consequences.

There is currently no `ADR 001` file in this repository. This follow-up deliberately does not claim
that one exists.
