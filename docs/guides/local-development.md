# Local Development Guide

This guide helps developers start the project locally and understand how to access the key components.

## Setting Up the Project

1. Clone the repository
   ```bash
   git clone https://github.com/mariobrusarosco/api-best-shot.git
   cd api-best-shot
   ```

2. Install dependencies
   ```bash
   yarn install
   ```

3. Set up environment variables
   ```bash
   docker compose --profile setup up env-setup
   ```

4. Start the database
   ```bash
   docker compose up -d postgres
   ```

5. Run database migrations and seed
   ```bash
   yarn db:push
   yarn db:seed
   ```

6. Start the development server
   ```bash
   yarn dev
   ```

## Accessing the API

The API is available at:
```
http://localhost:9090
```

The API uses port 9090 as configured in the .env file (PORT=9090).

### Available Endpoints
- Base URL: `http://localhost:9090`
- API documentation is available at the root endpoint

## Accessing the Database UI (Drizzle Studio)

You can access the Database UI through Drizzle Studio with:

```bash
yarn db:studio
```

This will start Drizzle Studio's web interface which provides a visual way to:
- Browse database tables
- Manage data records
- Run queries
- Visualize schema

The Database UI will be available at the URL shown in your terminal after running the command, typically:
```
http://localhost:4983
```

## Helpful Commands

- `yarn dev`: Start the development server
- `yarn db:studio`: Open the database UI
- `yarn db:seed`: Seed the database with initial data
- `yarn db:push`: Push schema changes to the database
- `yarn dev:status`: Check Docker container status
- `yarn db:logs`: View database logs
- `yarn db:reset`: Reset the database to a clean state

## Troubleshooting

If you encounter issues with database connection when using `yarn db:studio`, make sure:
1. The Postgres Docker container is running (`docker compose ps`)
2. Your `.env` file contains the correct DB_STRING_CONNECTION_LOCAL value
3. The database port isn't blocked by another application

### Common Errors

#### "getaddrinfo EAI_AGAIN postgres"
This error occurs when trying to connect to the database using the Docker service name "postgres" from outside the Docker network.

**Solution**: 
- Check that your `.env` file has the correct DB_STRING_CONNECTION_LOCAL value pointing to localhost
- If using `yarn db:studio`, make sure the database is running with `docker compose ps` 