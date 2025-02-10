#!/bin/sh
# Check Docker system health

# Source healthcheck script
. /app/scripts/docker-healthcheck.sh

echo "Docker system healthy."
exit 0 