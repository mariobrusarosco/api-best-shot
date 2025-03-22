# Best Shot API

## Overview

Best Shot API is the backend service for the _Football App_ project [(more info)](https://github.com/mariobrusarosco/best-shot). It's built with modern technologies and best practices to provide reliable and efficient data services for football-related applications.

We follow a hybrid development approach:
- Infrastructure (PostgreSQL, AWS, Monitoring) runs in Docker
- Development tools (Node.js, Yarn) run locally via Volta

👉 See our [Service Implementation Roadmap](docs/service-implementation-roadmap.md) for upcoming features and infrastructure additions.

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

We use Docker Compose profiles to manage environment setup:

#### First-time Setup
```bash
# Only needed once or when you want to reset to defaults
docker compose --profile setup up env-setup

# Verify .env was created
cat .env
```

#### Regular Development
```bash
# Start only the database (won't touch existing .env)
docker compose up -d
```

#### Environment Management
- `.env` file is created only if it doesn't exist
- Existing `.env` files are never overwritten automatically
- You can manually reset to defaults by running the setup profile

To modify your environment:
1. Edit `.env` file directly
2. Changes take effect on next `docker compose up`
3. Database-related changes might require `docker compose down && docker compose up -d`

### Development Workflow

We use a hybrid development approach:
- PostgreSQL runs in Docker for consistent database environment
- API runs locally for faster development and better debugging

```
┌─────────────────────────────────────────────────────────┐
│                  Development Environment                 │
├───────────────────────┐                ┌────────────────┤
│    Docker Container   │                │   Local Machine │
│    ┌─────────────┐   │                │                 │
│    │  env-setup  │   │                │                 │
│    │  (creates   │   │    generates   │                 │
│    │   .env)     ├───┼───────────────►│  .env file     │
│    └─────┬───────┘   │                │                 │
│          │           │                │                 │
│    ┌─────▼───────┐   │                │ ┌────────────┐ │
│    │  PostgreSQL │   │                │ │    API     │ │
│    │  Container  │◄──┼────────────────┼─┤   Local    │ │
│    └─────────────┘   │    connects    │ │  Process   │ │
│                      │                │ └────────────┘ │
└───────────────────────┘                └────────────────┘
```

```
┌──────────┐  ┌──────────┐  ┌───────────┐  ┌─────────┐
│ Developer│  │env-setup │  │ PostgreSQL│  │   API   │
└────┬─────┘  └────┬─────┘  └─────┬─────┘  └────┬────┘
     │             │              │              │
     │ docker compose up -d       │              │
     ├─────────────►             │              │
     │             │             │              │
     │             │ create .env │              │
     │             ├──────────┐  │              │
     │             │          │  │              │
     │             │◄─────────┘  │              │
     │             │             │              │
     │             │ start db    │              │
     │             ├────────────►│              │
     │             │             │              │
     │ yarn dev    │             │              │
     ├──────────────────────────────────────────►
     │             │             │              │
     │             │             │ connect      │
     │             │◄─────────────┘
     │             │             │              │
     │ edit code   │             │              │
     ├──────────────────────────────────────────►
     │             │             │              │
     │ hot reload  │             │              │
     │◄──────────────────────────────────────────
     │             │             │              │
```

#### 1. Start the Database
```bash
# This will:
# 1. Set up environment variables
# 2. Start PostgreSQL container
docker compose up -d
```

#### 2. Start the API
```bash
# Install dependencies (if haven't already)
yarn install

# Start API with hot reloading
yarn dev
```

The API will be available at `http://localhost:9090`

### Understanding the Setup

#### Database Container (`docker compose up -d`)
1. Creates/updates `.env` file with database credentials
2. Starts PostgreSQL 15 container
3. Creates persistent volume for data
4. Exposes database on configured port (default: 5432)

#### Local API (`yarn dev`)
1. Validates environment variables
2. Connects to containerized database
3. Provides hot reloading for development
4. Enables direct debugging through IDE

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

### Troubleshooting

#### Environment Setup Issues
```bash
# Check if .env was created
ls -la .env

# Recreate .env file
docker compose up env-setup
```

#### Database Issues
```bash
# Check container status
docker compose ps

# View database logs
docker compose logs postgres

# Reset database (WARNING: deletes all data)
docker compose down -v
docker compose up -d
```

#### API Issues
```bash
# Check environment variables
yarn validate-env

# Restart API with clean environment
yarn dev

# Check database connection
docker exec bestshot_db pg_isready -U ${DB_USER} -d ${DB_NAME}
```

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

1. **Volta - Node.js Version Manager**
   ```bash
   # Unix-like systems (macOS, Linux)
   curl https://get.volta.sh | bash
   
   # Windows
   # Download and run installer from https://docs.volta.sh/guide/getting-started
   ```
   
   #### Detailed Volta Setup
   After installation:
   1. Restart your terminal
   2. Verify installation:
      ```bash
      volta --version
      ```
   3. Volta will automatically:
      - Detect Node.js and Yarn versions from package.json
      - Download and install required versions (Node.js 18.17.1, Yarn 1.22.19)
      - Switch versions when you enter the project directory
   
   #### Troubleshooting Volta
   
   1. **Command Not Found**
      ```bash
      # Add Volta to PATH (Unix-like systems)
      export VOLTA_HOME="$HOME/.volta"
      export PATH="$VOLTA_HOME/bin:$PATH"
      ```
   
   2. **Permission Issues**
      ```bash
      # Fix permissions (Unix-like systems)
      sudo chown -R $USER: $HOME/.volta
      ```
   
   3. **Version Not Switching**
      ```bash
      # Force tool installation
      volta install node@18.17.1
      volta install yarn@1.22.19
      
      # Verify current versions
      node --version  # Should show 18.17.1
      yarn --version  # Should show 1.22.19
      ```
   
   #### Updating Versions with Volta
   
   To update Node.js or Yarn versions:
   
   1. Edit package.json volta section:
      ```json
      "volta": {
        "node": "NEW_VERSION",
        "yarn": "NEW_VERSION"
      }
      ```
   
   2. Volta will automatically:
      - Detect the change
      - Download new versions
      - Switch to new versions
   
   3. Verify updates:
      ```bash
      volta list all  # Shows all installed versions
      volta list     # Shows current versions
      ```

2. **Node.js and Yarn**
   - ✨ Managed automatically by Volta
   - Required versions:
     - Node.js: 18.17.1
     - Yarn: 1.22.19

3. **Docker** 
   - Minimum: Docker Engine 20.10+ with Compose V2
   - Verify installation:
     ```bash
     docker --version          # Should show Docker version 20.10+
     docker compose version    # Should show Docker Compose version v2+
     ```
   - [Install Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes compose)

4. **Git**
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

The project uses a type-safe environment configuration system with runtime validation. We use different environment configurations for development, demo, and production environments.

For detailed information about our environment configuration system, including:
- Type-safe environment variables
- Runtime validation
- Best practices
- Troubleshooting
- Security considerations

👉 See our [Environment Configuration Guide](docs/environment-configuration.md)

#### Development Environment

When you run `docker compose up env-setup`, a `.env` file will be automatically created with the following default configuration:

```