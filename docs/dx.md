sripts/setup/
├── main.sh           # Orchestrates the setup process
├── create-env.sh     # Handles .env creation/updates
├── validate-env.sh   # Validates environment variables
└── setup-db.sh       # Handles database setup

# Initial setup
docker compose --profile setup up setup

# Update existing setup
SETUP_MODE=update docker compose --profile setup up setup