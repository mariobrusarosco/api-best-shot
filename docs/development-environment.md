# Hybrid Development Environment

## Overview

Best Shot API uses a hybrid approach combining the best of both worlds:
- Docker for infrastructure (database, AWS local testing, monitoring)
- Volta for development tooling (Node.js, Yarn)

```
┌─────────────────────────────────────────────────────────┐
│                  Development Environment                 │
├───────────────────────┐                ┌────────────────┤
│    Docker (Infrastructure)             │   Local (Dev)   │
│    ┌─────────────┐    │                │ ┌────────────┐ │
│    │  Postgres   │    │                │ │   Volta    │ │
│    │  Database   │    │                │ │  Node.js   │ │
│    └─────────────┘    │                │ │   Yarn     │ │
│    ┌─────────────┐    │                │ └────────────┘ │
│    │ AWS Local   │    │     REST       │ ┌────────────┐ │
│    │   Stack     │◄───┼────────────────┼─┤    API     │ │
│    └─────────────┘    │                │ │  Process   │ │
│    ┌─────────────┐    │                │ └────────────┘ │
│    │   Sentry    │    │                │            │   │
│    │ Monitoring  │    │                │            │   │
│    └─────────────┘    │                │            │   │
└───────────────────────┘                └────────────────┘
```

## Prerequisites

### Required Tools
1. **Docker & Docker Compose**
   ```bash
   # Verify installation
   docker --version        # Should be 20.10+
   docker compose version # Should be 2.0+
   ```

2. **Git**
   ```bash
   git --version  # Any recent version
   ```

### Optional but Recommended
1. **Visual Studio Code**
   - With Docker extension
   - With TypeScript extension

## Why Hybrid?

### Infrastructure via Docker 🐳
- ✅ Consistent database environment
- ✅ Local AWS testing capabilities
- ✅ Monitoring tools when needed
- ✅ Easy service addition
- ✅ Production-like environment

### Development via Volta ⚡
- ✅ Native development speed
- ✅ Consistent Node.js/Yarn versions
- ✅ Better IDE integration
- ✅ Faster hot reloading
- ✅ Simpler debugging

## Clear Boundaries

### What Runs in Docker
1. **PostgreSQL Database**
   - Data persistence
   - Consistent port mapping
   - Isolated environment

2. **AWS Local Stack** (Optional)
   - S3 bucket simulation
   - AWS service testing
   - Local endpoints

3. **Sentry** (Optional)
   - Error tracking
   - Performance monitoring
   - Development debugging

### What Runs Locally (via Volta)
1. **Node.js Application**
   - API server
   - Business logic
   - Hot reloading

2. **Development Tools**
   - TypeScript compilation
   - Linting
   - Testing

## Setup Guide

### 1. First-Time Setup

```bash
# Install Volta (if not installed)
curl https://get.volta.sh | bash

# Clone repository
git clone https://github.com/mariobrusarosco/api-best-shot.git
cd api-best-shot

# Run setup script
./scripts/dev-setup.sh
```

### 2. Development Workflows

#### Basic Development (Most Common)
```bash
# Start database and API
yarn dev                # Starts API with hot-reload
                       # (PostgreSQL must be running)

# Check environment status
yarn dev:status        # Shows running containers and Node.js versions
```

#### With AWS Testing
```bash
# Start with AWS Local Stack
yarn dev:aws          # Starts PostgreSQL + AWS Local Stack + API

# View AWS Local Stack logs
yarn aws:logs         # Follows AWS Local Stack logs
```

#### Full Environment
```bash
# Start all services
yarn dev:full         # Starts PostgreSQL + AWS + Sentry + API

# Stop all services
yarn dev:stop         # Stops all containers gracefully
```

#### Database Operations
```bash
# Connect to database
yarn db:connect       # Opens PostgreSQL CLI

# View database logs
yarn db:logs          # Follows database logs

# Reset database (⚠️ Deletes all data)
yarn db:reset         # Removes and recreates database container
```

#### Maintenance Operations
```bash
# Complete environment reset
yarn dev:clean       # Stops containers, removes volumes,
                    # reinstalls dependencies

# Environment status
yarn dev:status      # Shows container status and
                    # Node.js/Yarn versions
```

### Common Workflows

1. **Daily Development**
   ```bash
   # Morning startup
   yarn dev          # Start development
   
   # During the day
   yarn db:connect   # When you need database access
   yarn db:logs     # If you suspect database issues
   
   # End of day
   yarn dev:stop    # Stop all services
   ```

2. **AWS Development**
   ```bash
   # Start AWS environment
   yarn dev:aws     # Includes AWS Local Stack
   
   # Monitor AWS
   yarn aws:logs    # Watch AWS Local Stack logs
   ```

3. **Troubleshooting**
   ```bash
   # Check status
   yarn dev:status  # View all components
   
   # Full reset if needed
   yarn dev:clean   # Reset everything
   ```

## Environment Management

### Docker Services
- **PostgreSQL**: Main database (Required)
  ```bash
  # Status check
  docker compose ps postgres
  ```
- **AWS Local Stack**: Local AWS testing (Optional)
  ```bash
  # Start when needed
  docker compose --profile aws up -d
  ```
- **Sentry**: Local monitoring (Optional)
  ```bash
  # Start when needed
  docker compose --profile monitoring up -d
  ```

### Volta Management
```bash
# Automatic version switching
cd api-best-shot  # Volta reads package.json
node -v           # Shows 18.17.1
yarn -v          # Shows 1.22.19
```

## Migration Path

### From Pure Docker Setup
1. Install Volta
2. Remove Node.js container
3. Update scripts to use local Node.js

### From Pure Local Setup
1. Install Docker
2. Move database to container
3. Add optional services as needed

## Best Practices

### 1. Database Operations
```bash
# Access database
docker compose exec postgres psql -U ${DB_USER} -d ${DB_NAME}

# Reset database
docker compose down postgres -v
docker compose up -d postgres
```

### 2. AWS Development
```bash
# Start AWS Local Stack
docker compose --profile aws up -d

# Use local endpoints in .env
AWS_ENDPOINT=http://localhost:4566
```

### 3. Node.js Development
```bash
# Let Volta handle versions
cd api-best-shot  # Automatic version switch
yarn dev         # Uses correct Node.js version
```

## Troubleshooting

### Docker Issues
```bash
# Common fixes
docker compose down -v    # Reset all containers
docker system prune -a    # Clean unused resources
docker compose up -d     # Fresh start
```

### Volta Issues
```bash
# Version issues
volta list              # Check versions
volta install node@18.17.1  # Force version
```

### Development Issues
```bash
# Complete reset
./scripts/dev-setup.sh --clean  # Fresh setup
```

## Adding New Services

### Infrastructure Service
1. Add to docker-compose.yml
   ```yaml
   services:
     new-service:
       image: service-image
       profiles: ["optional"]
   ```
2. Update documentation
3. Test integration

### Development Dependencies
1. Add to package.json
2. Let Volta handle versions
3. Update documentation

## Team Collaboration

### New Team Member Setup
1. Install prerequisites
2. Run setup script
3. Start developing

### Environment Updates
1. Update .env.example
2. Notify team
3. Team members update .env

## Maintenance

### Regular Updates
1. Update Volta versions in package.json
2. Update Docker images in compose file
3. Test locally
4. Notify team

### Version Control
- .env in .gitignore
- docker-compose.yml in version control
- package.json in version control