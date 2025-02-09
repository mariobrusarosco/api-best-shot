#!/bin/sh
# Environment setup script

# Check Docker runtime status
/app/scripts/check-docker.sh

# Check environment variables
/app/scripts/check-env-var.sh
