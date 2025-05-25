# Database Seeding Guide

This guide explains how to seed your database with initial data for development and testing purposes.

## Seeding Approach

Our database seeding uses a simple, direct approach:

- A single script in `scripts/seed-db.ts` handles the seeding process
- Currently, only member data is seeded
- The script is idempotent (can be run multiple times safely)
- Environment-specific seeding is handled through environment variables

## Seeding Commands

We provide two commands to seed different environments:

- **Local Development**: Seed your local database

  ```bash
  yarn db:seed
  ```

- **Demo Environment**: Seed the remote demo database
  ```bash
  yarn db:seed:demo
  ```

## How It Works

The seeding script:

1. Connects to the database using the configuration for the current environment
2. Checks for existing records before inserting to avoid duplicates
3. Creates test users with consistent credentials

## Current Seed Data

Currently, the seeding process creates the following data:

- **Members**:
  - Admin user with OAuth (mariobrusarosco@gmail.com)
  - Test user with password (test@example.com) - password is 'test123'
  - Additional demo users (John Doe, Jane Smith) - password is 'test123'

## Extending the Seeding Process

To add seeding for additional entities (tournaments, rounds, etc.):

1. Add the new seed data and logic to `scripts/seed-db.ts`
2. Maintain the idempotent approach (check before inserting)
3. Keep the environment detection logic
