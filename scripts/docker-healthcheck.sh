#!/bin/sh
# Docker system health check

# Exit immediately if any command fails
set -e

# Check Docker engine
docker version >/dev/null

# Check Docker Compose V2
docker compose version >/dev/null

# Check required containers
docker compose ps --services | while read -r service; do
  if [ "$(docker compose ps -q "$service")" ]; then
    docker compose ps "$service" | grep -q 'running'
  fi
done 