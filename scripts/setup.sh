#!/bin/sh
# Environment setup script

# Source the manage_env.sh script
. ./scripts/manage_env.sh


echo "[SETUP] - Starting setup script..."
# Call the manage_env function to handle .env file
manage_env

echo "[SETUP] - Setup script completed."