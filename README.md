## Development Setup

### Prerequisites

1. **Docker** 
   - Minimum: Docker Engine 20.10+ with Compose V2
   - Verify installation:
     ```bash
     docker --version          # Should show Docker version 20.10+
     docker compose version    # Should show Docker Compose version v2+
     ```
   - [Install Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes compose)
   - Ensure Docker daemon is running before proceeding

2. **Git**
   - Required for cloning repositories
   - Verify installation:
     ```bash
     git --version
     ```
   - [Install Git](https://git-scm.com/downloads)

3. **Port Availability**
   - Ensure ports 5432 (PostgreSQL) and 3000 (API) are free
   - Troubleshoot port conflicts:
     ```bash
     # Linux/Mac
     lsof -i :5432
     
     # Windows
     netstat -ano | findstr :5432
     ```

### First-time Setup
1. Start the database:
```bash
docker compose up -d postgres
```

2. Verify database is running:
```bash
docker ps | grep bestshot_db
```

The database will be available at:
- Host: localhost
- Port: 5432
- User: dev_user
- Password: dev_pass
- Database: bestshot_dev
