#!/bin/sh

# Function to check if .env file exists
check_env_file() {
  if [ -f /app/.env ]; then
    echo "[MANAGE ENV] .env file already exists. Skipping creation."
    return 0
  fi
  return 1
}

# Function to create .env file
create_env_file() {
  local attempt=0
  local max_attempts=5

  while [ $attempt -lt $max_attempts ]; do
    echo "[MANAGE ENV] - Attempting to create .env file (Attempt $((attempt + 1)))..."
    cat <<EOL > /app/.env
DB_USER=dev_user
DB_PASSWORD=dev_pass
DB_NAME=bestshot_dev
DB_HOST=postgres
DB_PORT=5432
EOL

    if [ -f /app/.env ]; then
      echo "[MANAGE ENV] .env file created successfully!"
      return 0
    fi

    attempt=$((attempt + 1))
    echo "[MANAGE ENV] Failed to create .env file. Retrying in 1 second..."
    sleep 1
  done

  echo "[MANAGE ENV] Failed to create .env file after $max_attempts attempts. Please check the setup."
  return 1
}

# Main function to manage .env file
manage_env() {
  if check_env_file; then
    echo "[MANAGE ENV] .env file already exists. Skipping creation."
    return 0
  fi

  create_env_file
}
