#!/bin/bash

# Run a PowerShell command to check Docker status
docker_status=$(powershell.exe -Command "& {Get-Service -Name com.docker.service -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Status}")

# Convert Windows-style newlines to Unix-style
docker_status=$(echo $docker_status | tr -d '\r')

if [[ "$docker_status" == "Running" ]]; then
    echo "Docker is running."
else
    echo "Docker is NOT running."
    exit 1
fi