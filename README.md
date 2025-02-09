
## Development Setup

### Prerequisites
- Docker installed and running
- Git

### First-time Setup
1. Start the database:
```bash
docker-compose up -d postgres
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
