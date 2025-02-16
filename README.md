# Best Shot API

## Overview

Best Shot API is the backend service for the _Football App_ project [(more info)](https://github.com/mariobrusarosco/best-shot). It's built with modern technologies and best practices to provide reliable and efficient data services for football-related applications.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Container**: Docker
- **Cloud Services**: AWS (S3, Scheduler)
- **Monitoring**: Sentry

## Key Features

- RESTful API endpoints
- Database migrations and schema management
- AWS integration for file storage and scheduling
- Error tracking and performance monitoring
- TypeScript for enhanced type safety and developer experience

## Development

### Environment Setup
For detailed information about our development environment choices and rationale, see [Development Environment](./docs/development-environment.md).

### Quick Start
```bash
# Start database
docker compose up -d

# Start API
yarn dev
```

### Common Development Scenarios

#### 1. Daily Development
```bash
# Morning startup
docker compose up -d postgres  # Start DB in background
yarn dev                      # Start local API

# Making API changes
# 1. Edit files
# 2. Save -> Hot reload happens instantly
# 3. Test endpoint -> Quick feedback cycle
```

#### 2. Database Operations
```bash
# Access database CLI
docker exec -it bestshot_db psql -U ${DB_USER} -d ${DB_NAME}

# View database logs
docker compose logs -f postgres

# Reset database
docker compose down -v    # Remove volumes
docker compose up -d     # Fresh database
```

#### 3. Team Collaboration
```bash
# When new migrations are added
docker compose down      # Stop containers
git pull                # Get new changes
docker compose up -d    # Fresh DB with new schema
yarn dev               # Start API
```

#### 4. Multiple Database Instances
```bash
# Run second instance for testing
DB_PORT=5433 docker compose -f docker-compose.test.yml up -d
DB_PORT=5433 yarn dev
```

#### 5. Database Troubleshooting
```bash
# Check database health
docker compose ps
docker exec bestshot_db pg_isready -U ${DB_USER}

# View logs
docker compose logs postgres

# Quick fixes
docker compose restart postgres  # Restart DB only
docker compose down -v          # Complete reset
```

#### 6. Running Migrations
```bash
# Apply migrations
yarn db:migrate

# If migrations fail
docker compose down -v    # Reset database
docker compose up -d     # Fresh start
yarn db:migrate         # Try again
```

#### 7. Performance Testing
```bash
# Load test data
docker exec -it bestshot_db psql -U ${DB_USER} -d ${DB_NAME} -f ./scripts/seed-test-data.sql
```


## Layer Structure

Our application follows a three-layer architecture that separates concerns and promotes maintainability.

### 1. Query Layer (`/domains/*/query/index.ts`)

Responsible for raw database operations and data access.

**Example from Performance Domain:**

```typescript
// /domains/performance/query/index.ts
const queryPerformanceOfAllMemberTournaments = async (memberId: string) => {
return await db
.select()
.from(T_TournamentPerformance)
.where(eq(T_TournamentPerformance.memberId, memberId));
};



### 2. Service Layer (`/domains/*/services/index.ts`)

Handles business logic, data transformation, and error handling.

**Example from Performance Domain:**


```typescript
// /domains/performance/services/index.ts
const getMemberPerformanceExtremes = async (memberId: string) => {
const memberPerformance = await DB_PERFORMANCE.queryPerformanceOfAllMemberTournaments(memberId);
if (!memberPerformance.length) {
return { worstPerformance: null, bestPerformance: null };
}


const worstPerformance = .minBy(memberPerformance, p => Number(p.points));
const bestPerformance = .maxBy(memberPerformance, p => Number(p.points));
return { worstPerformance, bestPerformance };
};
```


### 3. API Layer (`/domains/*/api/index.ts`)

Exposes endpoints and handles HTTP concerns.

**Example from Performance Domain:**


```typescript
// /domains/performance/api/index.ts
router.get('/performance/:memberId', async (req, res) => {
    const { memberId } = req.params;
    const performance = await SERVICES_PERFORMANCE.getMemberPerformanceExtremes(memberId);
    return res.json(performance);
});
```



## Benefits of This Architecture

1. **Separation of Concerns**
   - Query Layer: Focuses solely on database operations
   - Service Layer: Handles business logic and data transformation
   - API Layer: Manages HTTP interactions

2. **Maintainability**
   - Each layer has a single responsibility
   - Changes in one layer don't necessarily affect others
   - Easier to understand and modify code

3. **Testability**
   - Layers can be tested independently
   - Easy to mock dependencies
   - Clear boundaries for unit tests

4. **Code Organization**
   - Predictable file structure
   - Clear dependencies between layers
   - Easy to locate specific functionality

## Best Practices

1. **Query Layer**
   - Keep queries simple and focused
   - Return raw data without transformation
   - Handle database-specific logic here

2. **Service Layer**
   - Transform data for business use
   - Handle error cases
   - Implement business rules
   - Use utility libraries (like lodash) for data manipulation

3. **API Layer**
   - Validate input
   - Handle HTTP status codes
   - Format responses
   - Don't include business logic

## Example Flow

Using the performance extremes feature as an example:

1. API receives request for member performance
2. API layer calls service layer
3. Service layer calls query layer to get raw data
4. Service layer processes the data (finds min/max)
5. API layer returns the processed data

This flow ensures clean separation of concerns and maintainable code.

## Contributing

When adding new features:
1. Place database queries in the Query layer
2. Put business logic in the Service layer
3. Add endpoints in the API layer
4. Follow existing patterns in each layer

## Development Mode

When running the application in development mode, the API is exposed on _http://localhost:9090_.

### Accessing DB content

```
yarn drizzle-kit studio
```



## Further Reading

- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Separation of Concerns](https://en.wikipedia.org/wiki/Separation_of_concerns)
Now, the **API** is exposed on _http://localhost:9090_



## Running a migration

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

# Profiling and Logging

Coming Soon

# Hosting the API

We're using **Railway** to host the project. The url are:

[https://api-one-word.mariobrusarosco.com/](<[https://api-one-word.up.railway.app/](https://api-one-word.mariobrusarosco.com/)>)

---

# Swagger

[Postman URL](https://documenter.getpostman.com/view/2930329/VUjSGjLU#intro)

---

## Development Commands

Run database migrations:
```bash
docker compose run --rm migrations
```

Start the application:
```bash
npm start
```


## Getting Started

### Prerequisites

1. **Node.js**
   - Required version: 18.x or higher
   - Verify installation:
     ```bash
     node --version
     ```
   - Install via [Node.js official website](https://nodejs.org/) or use [nvm](https://github.com/nvm-sh/nvm)

2. **Docker** 
   - Minimum: Docker Engine 20.10+ with Compose V2
   - Verify installation:
     ```bash
     docker --version          # Should show Docker version 20.10+
     docker compose version    # Should show Docker Compose version v2+
     ```
   - [Install Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes compose)

3. **Git**
   - Required for version control
   - Verify installation:
     ```bash
     git --version
     ```
   - [Install Git](https://git-scm.com/downloads)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/mariobrusarosco/api-best-shot.git
   cd api-best-shot
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment**
   ```bash
   # Create and start the development environment
   docker compose up env-setup
   ```

4. **Verify environment setup**
   ```bash
   # Check if .env file was created
   ls -la .env

   # Verify database container is running
   docker compose ps
   ```

### Environment Configuration

The project uses different environment configurations for development, demo, and production environments.

#### Development Environment

When you run `docker compose up env-setup`, a `.env` file will be automatically created with the following default configuration:

```bash
DB_USER=dev_user
DB_PASSWORD=dev_pass
DB_NAME=bestshot_dev
DB_HOST=postgres
DB_PORT=5432
```

#### Available Environment Modes

The project supports different environment modes that can be run using specific npm/yarn scripts:

1. **Development** (default)
   ```bash
   npm run dev
   # or
   yarn dev
   ```

2. **Demo Environment**
   ```bash
   npm run dev-demo
   # or
   yarn dev-demo
   ```
   - Uses `.env.demo` configuration

3. **Production Environment**
   ```bash
   npm run dev-prod
   # or
   yarn dev-prod
   ```
   - Uses `.env.production` configuration
   - Includes Sentry integration for error tracking

### Database Configuration

The development database will be available with these default settings:
- Host: `localhost`
- Port: `5432`
- User: `dev_user`
- Password: `dev_pass`
- Database: `bestshot_dev`

### Running the Application

1. **Start the development server**
   ```bash
   # Using npm
   npm run dev

   # Using yarn
   yarn dev
   ```

2. **Run database migrations**
   ```bash
   # Using npm
   npm run db:migrate

   # Using yarn
   yarn db:migrate
   ```

The API will be available at `http://localhost:3000`

### Troubleshooting

#### Port Conflicts
- The API uses port 3000 and PostgreSQL uses port 5432
- Check if ports are in use:
  ```bash
  # Linux/Mac
  lsof -i :3000
  lsof -i :5432
  
  # Windows
  netstat -ano | findstr :3000
  netstat -ano | findstr :5432
  ```

#### Docker Issues
- **Docker not running**:
  ```bash
  # Linux
  sudo systemctl start docker
  
  # Mac/Windows
  Start Docker Desktop application
  ```

- **Database container issues**:
  ```bash
  # Stop all containers
  docker compose down
  
  # Remove volumes (if needed)
  docker compose down -v
  
  # Start fresh
  docker compose up -d
  ```

#### Database Connection Issues
- Verify database is running:
  ```bash
  docker compose ps
  ```
- Check database logs:
  ```bash
  docker compose logs postgres
  ```

#### Environment Variables
- If the `.env` file is missing or incorrect:
  ```bash
  # Re-run environment setup
  docker compose up env-setup
  ```

#### Node.js and Dependencies
- Clear node modules and reinstall:
  ```bash
  rm -rf node_modules
  rm package-lock.json # or yarn.lock
  npm install # or yarn install
  ```

For additional help, please check our [GitHub Issues](https://github.com/mariobrusarosco/api-best-shot/issues) or create a new issue.

