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
- End the first workflow after Wrangler deploys successfully.
- Add automated post-deploy verification only when its failure and rollback behavior are defined.

## References

- Cloudflare Containers overview: https://developers.cloudflare.com/containers/
- Cloudflare Containers getting started: https://developers.cloudflare.com/containers/get-started/
- Cloudflare GitHub Actions CI/CD: https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/
- Wrangler commands: https://developers.cloudflare.com/workers/wrangler/commands/

## Checklist

### 1. Root Baseline

- [x] Restore or replace `src/core/database` so `src/domains/health/routes.ts` can compile.
- [x] Decide whether `/api/health/db` should remain database-backed in this slice.
- [x] Remove or defer broken `db:migrate` and `db:seed` scripts until the referenced files exist.
- [x] Run `pnpm run typecheck`.
- [x] Run `pnpm run build`.

### 2. Almanac Hello Endpoint

- [x] Add `src/domains/almanac/routes.ts`.
- [x] Add `GET /api/almanac/hello`.
- [x] Return exactly:

```text
hello wordl
```

- [x] Mount the Almanac router in `src/router/index.ts`.
- [x] Verify locally with the dev server.
- [x] Verify the response body is exactly `hello wordl`.

### 3. Local API Smoke Checks

- [x] Start local API with `pnpm dev`.
- [x] Check `GET /`.
- [x] Check `GET /api/health`.
- [x] Check `GET /api/almanac/hello`.
- [x] Decide whether `GET /api/health/db` is required before the first Cloudflare deploy.

### 4. Cloudflare Container Scaffolding

- [x] Add a production `Dockerfile` for the Node API.
- [x] Add `.dockerignore`.
- [x] Add a Cloudflare Worker entrypoint that forwards requests to the container.
- [x] Add `wrangler.toml` or `wrangler.jsonc`.
- [x] Configure the container class, image, Durable Object binding, and migration entry.
- [x] Set the container default port to match the Node API port.
- [x] Add Wrangler package/script support for pnpm.
- [x] Keep local Node development unchanged.

### 5. Cloudflare Account Setup

- [x] Confirm the Cloudflare account has Workers Paid enabled.
- [x] Create or identify the Cloudflare account ID.
- [x] Create a Cloudflare API token for Worker deploys.
- [x] Add `CLOUDFLARE_ACCOUNT_ID` to GitHub Actions secrets.
- [x] Add `CLOUDFLARE_API_TOKEN` to GitHub Actions secrets.
- [x] Decide the first deployment name, for example `football-platform-api-demo`.
- [x] Decide whether the first deploy should use `workers.dev` only or a custom domain.

First deployment name:

```text
football-platform-api-demo
```

First public route:

```text
workers.dev only
```

Completed account setup:

```text
1. Confirm Workers Paid is enabled.
2. Copy the Cloudflare account ID.
3. Create a Cloudflare API token that can deploy Workers.
4. Add CLOUDFLARE_ACCOUNT_ID to GitHub Actions secrets.
5. Add CLOUDFLARE_API_TOKEN to GitHub Actions secrets.
```

The deploy token must include account-level `Workers Scripts Edit` and `Containers Edit` permissions, scoped to the deployment account.

### 6. CI/CD Adaptation

- [x] Create one new Cloudflare deploy workflow first.
- [x] Trigger it manually with `workflow_dispatch`.
- [x] Use Node 22.
- [x] Enable Corepack.
- [x] Install dependencies with pnpm.
- [x] Run `pnpm run typecheck`.
- [x] Run `pnpm run build`.
- [x] Run `wrangler deploy` through Cloudflare's official GitHub Action.
- [x] Avoid Railway deploy commands in the new workflow.
- [x] Avoid legacy Yarn commands in the new workflow.
- [x] Defer automated post-deploy smoke checks until a rollback policy exists.

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

- [x] Source typecheck passes.
- [x] Source build passes.
- [x] Local `GET /api/almanac/hello` returns `hello wordl`.
- [ ] GitHub Actions can deploy the root Node server to Cloudflare.
- [ ] Deployed `GET /api/almanac/hello` returns `hello wordl`.
- [x] The minimum required Cloudflare secrets are documented.
- [ ] The old Railway CI/CD path is no longer the active path for this new root app.

## Local Validation Results

Completed on 2026-07-09:

```text
pnpm run typecheck
pnpm run build
pnpm run start with PORT=3010
curl -i -X GET http://127.0.0.1:3010/api/almanac/hello
pnpm exec wrangler deploy --dry-run --containers-rollout none
docker build -t football-platform-api-demo-test .
docker run --rm -p 3011:3000 football-platform-api-demo-test
curl -i -X GET http://127.0.0.1:3011/api/almanac/hello
```

Result:

```text
hello wordl
```

## Notes

Cloudflare Containers are not instant on first deploy. The first deployment may need a few minutes before container-backed routes respond successfully.

For the first deployment, route verification is a deliberate manual Step 7 activity. Do not add retries or automated rollback until a failed check has a clear, tested recovery path.

Keep this slice small. If a task asks for database schema, provider data, auth, or scoring, it belongs to a later slice.
