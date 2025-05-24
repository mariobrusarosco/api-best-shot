# GitHub Actions Drizzle Migrations Fix

## Context

We encountered an issue when trying to set up automated database migrations using Drizzle ORM in our GitHub Actions workflow. The key problems were:

1. Special characters in the database connection string (`#` and `%`) causing parsing errors
2. Issues with passing GitHub Secrets to the Drizzle migration command
3. Determining the correct Drizzle command syntax to use (`migrate` vs `push`)

## Solution

The solution was to:

1. Store the database connection string in GitHub Secrets **with quotes** around it
2. Pass the secret directly to the Drizzle migration command in the workflow
3. Use `npx drizzle-kit migrate` which reads from our existing `drizzle.config.ts`

### Implementation

The working GitHub Actions workflow uses this approach:

```yaml
name: Deploy Demo Database Migrations

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  apply_migrations:
    runs-on: ubuntu-latest
    environment: demo

    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: yarn install

      - name: Apply migrations
        run: |
          # Note: The DB_STRING_CONNECTION secret should be stored WITH quotes in GitHub
          # Example: "postgresql://user:password@host:port/db"
          DB_STRING_CONNECTION="${{ secrets.DB_STRING_CONNECTION }}"

          # Apply migrations using drizzle-kit
          npx drizzle-kit migrate
```

### Key Insights

1. **Secret Storage Format**: Store the DB_STRING_CONNECTION secret in GitHub with quotes around it to properly handle special characters
2. **Command Execution**: Directly using the secret as an environment variable allows Drizzle to read it correctly
3. **Configuration**: Using the `migrate` command with our existing `drizzle.config.ts` file keeps the workflow simple

## References

- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/drizzle-kit-migrate)
- [GitHub Actions Environment Variables](https://docs.github.com/en/actions/learn-github-actions/environment-variables)
