#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if container is running
if ! docker compose ps --status running 2>/dev/null | grep -q mesh-router-backend-dev; then
    echo "[INFO] Container not running. Starting it..."
    docker compose up -d

    echo "[INFO] Waiting for container to be ready..."
    sleep 10

    # Install dependencies if needed
    docker compose exec mesh-router-backend pnpm install
fi

echo "[INFO] Running tests..."
docker compose exec mesh-router-backend pnpm test

echo ""
echo "Tests completed!"
