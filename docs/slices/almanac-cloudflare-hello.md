# Slice: Almanac Hello On Cloudflare

## Purpose

Build the smallest possible Almanac endpoint and use it to prove that the new root Node server can deploy to Cloudflare.

This slice is intentionally tiny.

```text
GET /api/almanac/hello
-> "hello wordl"
```

The endpoint is not the hard part. The deployment path is the hard part.

## Goal

Prove this path works:

```text
GitHub Actions
  -> pnpm quality checks
  -> Wrangler deploy
  -> Cloudflare Worker
  -> Cloudflare Container
  -> Node/Express API
  -> /api/almanac/hello
```

## Non-Goals

Do not build:

```text
Almanac database schema
Drizzle migrations
historical football data
provider ingestion
admin UI
auth
scheduler
leaderboards
SofaScore access
Playwright production setup
```

Those can come later after the deployment path is proven.

## Decisions

- Keep the main API as a normal Node/Express server.
- Deploy the Node server using Cloudflare Containers.
- Use a small Worker only as the router into the container.
- Start with one deploy workflow before recreating demo/staging/production complexity.
- Keep the smoke endpoint deliberately boring.

## References

- Cloudflare Containers overview: https://developers.cloudflare.com/containers/
- Cloudflare Containers getting started: https://developers.cloudflare.com/containers/get-started/
- Cloudflare GitHub Actions CI/CD: https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
- Wrangler commands: https://developers.cloudflare.com/workers/wrangler/commands/

## Checklist

### 1. Root Baseline

- [ ] Restore or replace `src/core/database` so `src/domains/health/routes.ts` can compile.
- [ ] Decide whether `/api/health/db` should remain database-backed in this slice.
- [ ] Remove or defer broken `db:migrate` and `db:seed` scripts until the referenced files exist.
- [ ] Run `pnpm run typecheck`.
- [ ] Run `pnpm run build`.

### 2. Almanac Hello Endpoint

- [ ] Add `src/domains/almanac/routes.ts`.
- [ ] Add `GET /api/almanac/hello`.
- [ ] Return exactly:

```text
hello wordl
```

- [ ] Mount the Almanac router in `src/router/index.ts`.
- [ ] Verify locally with the dev server.
- [ ] Verify the response body is exactly `hello wordl`.

### 3. Local API Smoke Checks

- [ ] Start local API with `pnpm dev`.
- [ ] Check `GET /`.
- [ ] Check `GET /api/health`.
- [ ] Check `GET /api/almanac/hello`.
- [ ] Decide whether `GET /api/health/db` is required before the first Cloudflare deploy.

### 4. Cloudflare Container Scaffolding

- [ ] Add a production `Dockerfile` for the Node API.
- [ ] Add `.dockerignore`.
- [ ] Add a Cloudflare Worker entrypoint that forwards requests to the container.
- [ ] Add `wrangler.toml` or `wrangler.jsonc`.
- [ ] Configure the container class, image, Durable Object binding, and migration entry.
- [ ] Set the container default port to match the Node API port.
- [ ] Add Wrangler package/script support for pnpm.
- [ ] Keep local Node development unchanged.

### 5. Cloudflare Account Setup

- [ ] Confirm the Cloudflare account has Workers Paid enabled.
- [ ] Create or identify the Cloudflare account ID.
- [ ] Create a Cloudflare API token for Worker deploys.
- [ ] Add `CLOUDFLARE_ACCOUNT_ID` to GitHub Actions secrets.
- [ ] Add `CLOUDFLARE_API_TOKEN` to GitHub Actions secrets.
- [ ] Decide the first deployment name, for example `football-platform-api-demo`.
- [ ] Decide whether the first deploy should use `workers.dev` only or a custom domain.

### 6. CI/CD Adaptation

- [ ] Create one new Cloudflare deploy workflow first.
- [ ] Trigger it manually with `workflow_dispatch`.
- [ ] Use Node 22.
- [ ] Enable Corepack.
- [ ] Install dependencies with pnpm.
- [ ] Run `pnpm run typecheck`.
- [ ] Run `pnpm run build`.
- [ ] Run `pnpm wrangler deploy`.
- [ ] Avoid Railway deploy commands in the new workflow.
- [ ] Avoid legacy Yarn commands in the new workflow.
- [ ] Add a smoke test step after deploy if the deployed URL is known.

### 7. First Deploy

- [ ] Run the Cloudflare deploy workflow manually.
- [ ] Wait for container provisioning after the first deploy.
- [ ] Check Cloudflare container deployment status.
- [ ] Check the deployed root route.
- [ ] Check the deployed health route.
- [ ] Check the deployed Almanac hello route.
- [ ] Record the deployed URL in this document.

Deployed URL:

```text
TBD
```

### 8. After The First Successful Deploy

- [ ] Decide whether to split workflows into demo, staging, and production.
- [ ] Decide whether migrations belong in a separate future workflow.
- [ ] Decide whether `/api/health/db` should be required for deployment health checks.
- [ ] Update `README.md` with Cloudflare deployment basics.
- [ ] Update or replace old Railway-focused GitHub workflows.
- [ ] Mark ADR 001 as accepted or revise it based on the deployment result.

## Done Criteria

This slice is done when:

- [ ] Source typecheck passes.
- [ ] Source build passes.
- [ ] Local `GET /api/almanac/hello` returns `hello wordl`.
- [ ] GitHub Actions can deploy the root Node server to Cloudflare.
- [ ] Deployed `GET /api/almanac/hello` returns `hello wordl`.
- [ ] The minimum required Cloudflare secrets are documented.
- [ ] The old Railway CI/CD path is no longer the active path for this new root app.

## Notes

Cloudflare Containers are not instant on first deploy. The first deployment may need a few minutes before container-backed routes respond successfully.

Keep this slice small. If a task asks for database schema, provider data, auth, or scoring, it belongs to a later slice.
