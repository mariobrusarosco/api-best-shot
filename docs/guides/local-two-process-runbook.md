# Local Two-Process Runbook

This project runs as two local processes:

1. API process
2. Scheduler process

## Prerequisites

1. Install dependencies: `yarn`
2. Ensure environment file exists (default: `.env`)
3. Start local Postgres: `docker compose up -d postgres`

## Option A: Single command

Run both processes in one terminal:

```bash
yarn dev:stack
```

Expected:

1. API ts-node-dev starts.
2. Scheduler ts-node-dev starts.
3. Scheduler heartbeat appears after startup.

## Option B: Split terminals

Terminal A:

```bash
yarn dev:api
```

Terminal B:

```bash
yarn dev:scheduler
```

Expected:

1. API logs startup and binds port.
2. Scheduler logs startup and begins runtime loop.

## Common local failures

`Database connection failed`:

1. Start DB: `docker compose up -d postgres`
2. Re-run command

`listen EPERM 0.0.0.0:9090`:

1. This can happen in restricted/sandboxed environments.
2. On a normal local machine, verify port 9090 is available and retry.
