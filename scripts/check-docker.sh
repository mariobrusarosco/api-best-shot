#!/bin/sh

# Check Docker runtime status
if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker daemon is not running."
  echo "Please start Docker and try again."
  exit 1
fi

if ! docker ps | grep -q bestshot_db; then
  echo "ERROR: Database container not running."
  echo "Start it with: docker compose up -d postgres"
  exit 1
fi

echo "Docker checks passed!"
exit 0 