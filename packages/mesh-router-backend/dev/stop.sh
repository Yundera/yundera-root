#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Stopping mesh-router-backend dev environment..."

if [ "$1" == "--clean" ]; then
    echo "Cleaning up containers and volumes..."
    docker compose down -v
    echo "Containers and volumes removed."
else
    docker compose down
    echo "Containers stopped. Volumes preserved."
    echo "Use './stop.sh --clean' to also remove volumes (node_modules, pnpm-store)"
fi
