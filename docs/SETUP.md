# Best Shot API Setup Guide

## Prerequisites

### Required Software
1. **Git**
   ```bash
   # Verify installation
   git --version  # Should be 2.0.0 or higher
   ```

2. **Docker & Docker Compose**
   ```bash
   # Verify installations
   docker --version        # Should be 20.10.0 or higher
   docker compose version # Should be 2.0.0 or higher
   ```

3. **Volta** (Node.js Version Manager)
   ```bash
   # Install Volta
   curl https://get.volta.sh | bash
   
   # Restart your terminal, then verify
   volta --version
   ```

### Optional but Recommended
1. **Visual Studio Code**
   - Download from: https://code.visualstudio.com
   
   Recommended extensions:
   - Docker
   - TypeScript and JavaScript Language Features
   - ESLint
   - Prettier
   - GitLens

## Step-by-Step Setup

### 1. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/mariobrusarosco/api-best-shot.git

# Navigate to project directory
cd api-best-shot
```

### 2. Environment Setup

```bash
# Run the setup script
./scripts/dev-setup.sh

# This will:
# - Install correct Node.js version via Volta
# - Install dependencies
# - Create .env file
# - Start required Docker services
```

### 3. Verify Setup

```bash
# Check Node.js and Yarn versions
node -v   # Should show 18.17.1
yarn -v   # Should show 1.22.19

# Check Docker services
yarn dev:status

# Should show:
# - PostgreSQL container running
# - Correct Node.js/Yarn versions
```

### 4. Start Development

```bash
# Start the API in development mode
yarn dev

# The API will be available at http://localhost:9090
```

## Common Development Tasks

### Database Operations
```bash
# Connect to database CLI
yarn db:connect

# View database logs
yarn db:logs

# Reset database (⚠️ Deletes all data)
yarn db:reset
```

### Environment Management
```bash
# View current environment
yarn dev:status

# Stop all services
yarn dev:stop

# Complete reset (if needed)
yarn dev:clean
```

### Code Quality
```bash
# Type checking
yarn compile

# Generate database types
yarn db:generate
```

## Project Structure

```
api-best-shot/
├── src/               # Source code
│   ├── domains/      # Business domains
│   ├── config/       # Configuration
│   └── index.ts      # Entry point
├── scripts/          # Development scripts
├── docs/             # Documentation
└── docker-compose.yml # Docker configuration
```

## Configuration Files

1. **Environment Variables** (`.env`)
   - Created by setup script
   - Contains database credentials
   - AWS and Sentry configuration

2. **TypeScript** (`tsconfig.json`)
   - Strict type checking
   - Path aliases
   - ES2020 target

3. **Docker** (`docker-compose.yml`)
   - PostgreSQL service
   - Environment setup service
   - Optional services (AWS, Sentry)

## Troubleshooting

### Common Issues

1. **Docker Issues**
   ```bash
   # If containers won't start
   docker compose down -v
   docker compose up -d
   ```

2. **Node.js Version Issues**
   ```bash
   # Force correct versions
   volta install node@18.17.1
   volta install yarn@1.22.19
   ```

3. **Database Connection Issues**
   ```bash
   # Check database status
   docker compose ps postgres
   
   # View logs
   yarn db:logs
   ```

4. **Environment Issues**
   ```bash
   # Regenerate environment
   yarn dev:clean
   ./scripts/dev-setup.sh
   ```

### Getting Help

1. Check the documentation in `/docs`
2. Run `yarn dev:status` for system status
3. Create an issue on GitHub

## Next Steps

1. Read the [Architecture Overview](./architecture.md)
2. Review the [Service Implementation Roadmap](./service-implementation-roadmap.md)
3. Check the [Development Environment](./development-environment.md) guide

## Best Practices

1. **Always use yarn** (not npm)
2. **Let Volta manage Node.js versions**
3. **Use provided scripts** instead of raw commands
4. **Follow the documentation** in `/docs`

## Notes

- The project uses a hybrid approach (Docker + Local development)
- Docker handles infrastructure (database, etc.)
- Local development for faster feedback
- Volta ensures consistent Node.js versions 