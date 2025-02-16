#!/bin/sh

# Function to check if .env file exists
check_dot_env_file() {
  if [ -f /app/.env ]; then
    echo "📝 [ENV VARS] - .env file already exists. Skipping creation."
    return 0
  fi
  return 1
}

create_dot_env_file() {
  echo "📝 [ENV VARS] - Creating .env file..."
  
  echo "DB_USER=dev_user" > /app/.env
  echo "DB_PASSWORD=dev_pass" >> /app/.env
  echo "DB_NAME=bestshot_dev" >> /app/.env
  echo "DB_HOST=postgres" >> /app/.env
  echo "DB_PORT=5432" >> /app/.env
  echo "NODE_ENV=development" >> /app/.env
  echo "SENTRY_DSN=https://sentry.io/" >> /app/.env
  echo "PORT=9090" >> /app/.env
  echo "ACCESS_CONTROL_ALLOW_ORIGIN=*" >> /app/.env
  echo "AWS_ACCESS_KEY_ID=1234567890" >> /app/.env
  echo "AWS_SECRET_ACCESS_KEY=1234567890" >> /app/.env
  echo "AWS_BUCKET_NAME=bestshot-dev" >> /app/.env
  echo "JWT_SECRET=1234567890" >> /app/.env
  echo "MEMBER_PUBLIC_ID_COOKIE=1234567890" >> /app/.env

  echo "📝 [ENV VARS] .env file created successfully ✅!"
  
  return 1
}

handle_dot_env_creation() {
  if ! check_dot_env_file; then
    create_dot_env_file
  fi
}