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

- [x] Run the Cloudflare deploy workflow manually.
- [x] Wait for container provisioning after the first deploy.
- [x] Check Cloudflare container deployment status.
- [x] Check the deployed root route.
- [x] Check the deployed health route.
- [x] Check the deployed Almanac hello route.
- [x] Record the deployed URL in this document.

Deployed URL:

```text
https://football-platform-api-demo.mariobrusarosco.workers.dev
```

### 7.5 Explaining The CI/CD Choices

- [x] Explained

#### Deployment Path

```text
Manual GitHub Actions run
  -> install the pinned Node and pnpm versions
  -> install the exact locked dependencies
  -> typecheck and build the application
  -> run Wrangler deploy
  -> build and push the Docker image
  -> deploy the Worker and Container configuration
  -> Worker forwards requests to the Node/Express container
```

Cloudflare describes Containers as a serverless container platform because Cloudflare manages
provisioning and can scale instances to zero. The application itself is not running as Worker
JavaScript. It remains a normal Node.js process inside a Linux container. The Worker is only the
public entry point and container router.

#### `.github/workflows/deploy-cloudflare-demo.yml`

This is the new deployment workflow.

- `name` gives the workflow its label in GitHub Actions.
- `workflow_dispatch` makes deployment manual. A push does not deploy automatically yet.
- `permissions: contents: read` gives the GitHub token only the repository permission needed to
  check out the code.
- `concurrency.group` allows only one Cloudflare demo deployment to run at a time.
- `cancel-in-progress: false` keeps an active deployment running instead of replacing it midway.
- `runs-on: ubuntu-latest` selects GitHub's Linux runner, which includes the Docker engine Wrangler
  needs to build the container image.
- `timeout-minutes: 60` prevents a stuck deployment from consuming a runner indefinitely.
- `actions/checkout@v4` downloads the selected commit onto the runner.
- `actions/setup-node@v4` installs Node.js 22, matching the project runtime requirement.
- Corepack activates the exact pnpm version declared by the project.
- `pnpm install --frozen-lockfile` installs exactly what is recorded in `pnpm-lock.yaml` and fails
  instead of silently changing dependency versions.
- `pnpm run typecheck` rejects TypeScript errors before deployment.
- `pnpm run build` proves the production JavaScript can be compiled before deployment.
- `cloudflare/wrangler-action@v3` runs the official Wrangler deployment integration.
- `apiToken` and `accountId` come from encrypted GitHub Actions secrets. They are not stored in the
  repository.
- `packageManager: pnpm` tells the action to use this repository's package manager.
- `command: deploy` runs `wrangler deploy`, which reads `wrangler.toml`.

There is deliberately no automated post-deploy request in this workflow. A successful workflow
means Cloudflare accepted the deployment; endpoint verification remains a manual Step 7 task until
the project defines what a failed verification should do and how rollback should work.

#### `wrangler.toml`

This file tells Wrangler what Cloudflare must deploy.

- `name` is the Worker and deployment name shown in Cloudflare.
- `main` points to the Worker entry file.
- `compatibility_date` freezes Worker runtime behavior to a known date.
- `workers_dev = true` publishes the Worker on a `workers.dev` address without requiring a custom
  domain.
- `[[containers]]` declares the container attached to the Worker.
- `class_name = "ApiContainer"` connects the container configuration to the exported Worker class.
- `image = "./Dockerfile"` tells Wrangler to build the image from this repository's Dockerfile and
  push it to Cloudflare's managed registry.
- `max_instances = 1` limits this first proof to one running container instance.
- `[[durable_objects.bindings]]` exposes the container controller to Worker code as
  `env.API_CONTAINER`.
- `[[migrations]]` registers `ApiContainer` as a new Durable Object class on the first deployment.
  `new_sqlite_classes` is Cloudflare's required Durable Object migration type; it does not replace
  the application's PostgreSQL database with SQLite.

#### `src/cloudflare/worker.ts`

This is the small Cloudflare Worker in front of the Node server.

- The type reference adds Cloudflare runtime types during TypeScript checking.
- `Container` is Cloudflare's container lifecycle abstraction.
- `ApiContainer extends Container` defines how Cloudflare should run the API image.
- `defaultPort = 3000` tells the Worker where Express listens inside the container.
- `sleepAfter = '10m'` allows Cloudflare to stop the container after ten idle minutes. A later
  request starts it again.
- `envVars` starts Node with the production environment and port 3000.
- `onStart`, `onStop`, and `onError` write lifecycle information to Cloudflare logs.
- The `Env` type documents the `API_CONTAINER` binding created by `wrangler.toml`.
- The `fetch` handler receives every public request and forwards it unchanged to the named `api`
  container instance.

The Worker does not reimplement the Express routes or business logic.

#### `Dockerfile`

This file packages the normal Node/Express server as a Linux container using three stages.

1. `deps` starts from the official slim Node.js 22 image, activates pnpm, copies dependency files,
   and installs the locked dependencies.
2. `build` copies the TypeScript source and runs `pnpm run build`, producing `dist/`.
3. `runtime` starts from a clean Node.js 22 image, installs production dependencies only, and copies
   only the compiled application from the build stage.

`ENV` sets production defaults, `WORKDIR` selects `/app`, `EXPOSE 3000` documents the listening
port, and `CMD ["pnpm", "run", "start"]` launches the compiled Express server as the container's
main process.

The separate runtime stage keeps source files, development tools, and build artifacts that are not
needed at runtime out of the final image.

#### `.dockerignore`

This file keeps unnecessary or sensitive local files out of Docker's build context. In particular,
it excludes Git history, editor settings, dependencies, legacy code, generated output, logs, and
`.env` files. Excluding `.env` prevents local secrets from being copied into the image.

#### Application Files

- `src/domains/almanac/routes.ts` defines `GET /hello` and returns the exact plain-text response
  `hello wordl`.
- `src/router/index.ts` mounts that router at `/almanac`.
- `src/apps/api/app.ts` mounts the API router at `/api`.
- Together those mounts produce `GET /api/almanac/hello`.
- `src/apps/api/index.ts` listens on `0.0.0.0`, allowing Cloudflare's container network to reach the
  Node process on port 3000.
- Relative imports replaced the old TypeScript path alias so compiled JavaScript runs directly in
  Node without the removed `tsconfig-paths` runtime hook.

#### Package And Legacy Workflow Changes

- `package.json` adds Wrangler commands for deploy, container status, and image status.
- `@cloudflare/containers` supplies the Worker-side container API.
- `@cloudflare/workers-types` supplies TypeScript definitions for the Worker runtime.
- `wrangler` is the pinned deployment CLI.
- `pnpm-lock.yaml` records the exact dependency graph produced by those additions.
- `pnpm-workspace.yaml` permits build scripts for `esbuild`, `sharp`, and `workerd`, whose native
  binaries are used by the local build and Wrangler toolchain. Its `minimumReleaseAgeExclude`
  entries currently have no effect because this repository does not configure
  `minimumReleaseAge`; they were not required for this deployment and can be removed in a later
  cleanup.
- The obsolete Railway demo, staging, and production workflows were deleted after Cloudflare became
  the accepted deployment target. Historical deployment knowledge remains in Git and `legacy/`
  documentation rather than executable root workflows.

### 8. Follow-Up Work

The first deployment slice is complete. Post-deployment documentation, environment promotion,
database deployment and reliability are tracked separately in
[Cloudflare Deployment Follow-Ups](../follow-ups/cloudflare-deployment.md).

## Done Criteria

This slice is done when:

- [x] Source typecheck passes.
- [x] Source build passes.
- [x] Local `GET /api/almanac/hello` returns `hello wordl`.
- [x] GitHub Actions can deploy the root Node server to Cloudflare.
- [x] Deployed `GET /api/almanac/hello` returns `hello wordl`.
- [x] The minimum required Cloudflare secrets are documented.
- [x] The old Railway CI/CD path is no longer the active path for this new root app.

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

## Deployed Validation Results

Completed on 2026-07-10 against:

```text
https://football-platform-api-demo.mariobrusarosco.workers.dev
```

```text
GET /
-> HTTP 200
-> {"name":"football-platform-api","status":"ok"}

GET /api/health
-> HTTP 200
-> environment: production

GET /api/almanac/hello
-> HTTP 200
-> hello wordl
```

## Notes

Cloudflare Containers are not instant on first deploy. The first deployment may need a few minutes before container-backed routes respond successfully.

For the first deployment, route verification is a deliberate manual Step 7 activity. Do not add retries or automated rollback until a failed check has a clear, tested recovery path.

Keep this slice small. If a task asks for database schema, provider data, auth, or scoring, it belongs to a later slice.
