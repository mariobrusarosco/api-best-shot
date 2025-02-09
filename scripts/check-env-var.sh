#!/bin/sh

if [ ! -f /app/.env ]; then
  echo "Creating .env file..."
  echo 'DB_USER=dev_user' > /app/.env
  echo 'DB_PASSWORD=dev_pass' >> /app/.env
  echo 'DB_NAME=bestshot_dev' >> /app/.env
  echo 'DB_HOST=postgres' >> /app/.env
  echo 'DB_PORT=5432' >> /app/.env
  echo "Created .env file with development credentials"
else
  echo ".env file already exists. Skipping creation."
fi 