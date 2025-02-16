#!/bin/sh

# Function to check if .env file exists
check_dot_env_file() {
  if [ -f /app/.env ]; then
    echo "[.ENV CREATION] - .env file already exists. Skipping creation."
    return 0
  fi
  return 1
}

create_dot_env_file() {
  echo "[.ENV CREATION] - Creating .env file..."
  
  echo "DB_USER=dev_user" > /app/.env
  echo "DB_PASSWORD=dev_pass" >> /app/.env
  echo "DB_NAME=bestshot_dev" >> /app/.env
  echo "DB_HOST=postgres" >> /app/.env
  echo "DB_PORT=5432" >> /app/.env

  echo "[.ENV CREATION] .env file created successfully!"
  
  return 1
}

handle_dot_env_creation() {
  if ! check_dot_env_file; then
    create_dot_env_file
  fi
}