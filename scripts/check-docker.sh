#!/bin/sh

# Check Docker socket connectivity
if ! docker info --format '{{.ServerVersion}}' >/dev/null 2>&1; then
  echo "ERROR: Could not connect to Docker daemon."
  echo "Please ensure Docker is running and accessible."
  exit 1
fi

# Verify Docker Compose V2
if ! docker compose version --short | grep -q '^2'; then
  echo "ERROR: Docker Compose V2 required."
  echo "Update Docker Desktop or install compose plugin."
  exit 1
fi

# Check database container status
if ! docker compose ps --services --filter status=running | grep -q postgres; then
  echo "ERROR: Database not running. Start with:"
  echo "docker compose up -d postgres"
  exit 1
fi

echo "Docker checks passed."
exit 0 