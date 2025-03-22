## SpecStory

## Local Development Setup: Docker Compose Services (2/16/2025, 3:15:36 PM)

_**User**_

[STARTING LOCAL DEVELOPMENT: LOCAL API + LOCAL DATABASE]

We already have a Docker Compose Service to setup this project

Now we need to improve our flow and add new services.
1) A service to handle our local database. We already have a service named 'postgres'. Please, take a look if see if we can use it or start from the scratch
2) A service to expose the local API (that needs to work with the local database)

Shall we start?

---

_**Assistant**_

I'll help you set up the local development environment with both the database and API services. First, let's check if there's an existing `docker-compose.yml` file. Could you share the current Docker Compose configuration you have? This will help me:

1. See if we can use the existing 'postgres' service
2. Determine what modifications are needed
3. Add the local API service properly

Please share your current `docker-compose.yml` file and I'll help you improve it with the necessary services.

Also, it would be helpful to know:
1. What framework/language is your API built with?
2. Do you have any specific requirements for the PostgreSQL version?
3. Do you need any specific environment variables for either service?

Once you provide this information, I can help you set up a complete development environment with both services working together.

---

_**User**_

 @api-best-shot Everything you need to know its here! Take 5 min,  30min, 4 hours or how much time do you to understand the codebase.

As output, if you were not able to track the codebase, list everything you could not track

---

_**Assistant**_

I've reviewed the codebase and here's what I understand:

1. This is a Node.js/TypeScript API project that:
- Uses Express.js as the web framework
- Uses PostgreSQL as the database
- Uses Drizzle ORM for database operations
- Has Docker setup for development
- Uses environment variables for configuration
- Has a domain-driven architecture
- Has Sentry integration for monitoring
- Uses JWT for authentication

2. The existing `docker-compose.yml` already has:
- A PostgreSQL service named 'postgres'
- An environment setup service
- Proper networking and volume configuration

3. The project follows a clear architectural pattern with:
- Query Layer (database operations)
- Service Layer (business logic)
- API Layer (endpoints)

Based on your initial request, we can leverage the existing Docker setup and improve it for local development. I'll help you:

1. Use the existing PostgreSQL service
2. Add a new service for the local API
3. Ensure everything works together seamlessly

The only thing I couldn't track clearly was:
1. The entry point file (main application file) - but we can infer it's likely in `src/index.ts` or similar
2. The exact Node.js dependencies from `package.json` - but we can see from the code it uses TypeScript, Express, and Drizzle

Would you like me to proceed with improving the Docker setup for local development? I'll start by:
1. Reviewing and enhancing the existing `docker-compose.yml`
2. Adding a new service for the local API
3. Ensuring proper connection between services

Please let me know if you'd like me to proceed, or if you'd like to share any additional files I might have missed.

---

_**User**_

Let's start

---

_**Assistant**_

Great! Let's begin by improving the Docker Compose setup. First, I'll enhance the existing `docker-compose.yml` to better handle local development.

Here's the proposed update:

```yaml:docker-compose.yml
services:
  env-setup:
    build:
      context: .
      dockerfile: Dockerfile.env-setup
    container_name: bestshot_env_setup
    volumes:
      - .:/app
    command: sh -c "chmod +x ./scripts/setup.sh && ./scripts/setup.sh"
    healthcheck:
      test: ["CMD", "test", "-f", "/app/.env"]
      interval: 10s
      timeout: 5s
      retries: 3

  postgres:
    image: postgres:15
    container_name: bestshot_db
    environment:
      POSTGRES_USER: ${DB_USER:-dev_user}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-dev_pass}
      POSTGRES_DB: ${DB_NAME:-bestshot_dev}
    ports:
      - "${DB_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - bestshot_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-dev_user} -d ${DB_NAME:-bestshot_dev}"]
      interval: 10s
      timeout: 5s
      retries: 3

  api:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: bestshot_api
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - "9090:9090"
    environment:
      - DB_HOST=postgres
      - DB_USER=${DB_USER:-dev_user}
      - DB_PASSWORD=${DB_PASSWORD:-dev_pass}
      - DB_NAME=${DB_NAME:-bestshot_dev}
      - DB_PORT=5432
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - bestshot_network

volumes:
  postgres_data:

networks:
  bestshot_network:
    driver: bridge
```

And let's create a development Dockerfile:

```dockerfile:Dockerfile.dev
FROM node:20-slim

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 9090

CMD ["npm", "run", "dev"]
```

Key changes and additions:
1. Added default values for database environment variables
2. Added healthcheck for postgres service
3. Created a new API service that:
   - Uses Node.js 20
   - Mounts the codebase as a volume
   - Connects to the postgres service
   - Exposes port 9090
4. Improved networking configuration

Let me know if you'd like me to proceed with these changes and I'll explain the next steps.

---



---

