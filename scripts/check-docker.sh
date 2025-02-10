#!/bin/sh

# Check Docker runtime status
if ! docker version >/dev/null 2>&1; then
  echo "ERROR: Docker daemon is not running."
  echo "Please start Docker Desktop and try again."
  exit 1
fi

# Verify Docker Compose is available
if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: Docker Compose V2 is required."
  echo "Update Docker Desktop or install compose plugin."
  exit 1
fi

if ! docker ps | grep -q bestshot_db; then
  echo "ERROR: Database container not running."
  echo "Start it with: docker compose up -d postgres"
  exit 1
fi

echo "Docker checks passed!"
exit 0 