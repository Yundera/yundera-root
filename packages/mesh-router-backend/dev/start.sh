#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================="
echo "  Starting mesh-router-backend Dev Environment"
echo "=========================================="

# Check for .env file
if [ ! -f ".env" ]; then
    echo "[WARN] No .env file found. Creating from template..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "[INFO] Created .env from .env.example - please edit with your values"
    else
        echo "# mesh-router-backend dev environment" > .env
        echo "[INFO] Created empty .env file"
    fi
fi

# Check for serviceAccount.json
if [ ! -f "serviceAccount.json" ]; then
    echo ""
    echo "[WARN] No serviceAccount.json found!"
    echo "       Copy your Firebase service account JSON to:"
    echo "       $SCRIPT_DIR/serviceAccount.json"
    echo ""
fi

# Build and start
echo "[INFO] Building dev container..."
docker compose build

echo "[INFO] Starting container..."
docker compose up -d

echo ""
echo "=========================================="
echo "  Development server starting..."
echo "=========================================="
echo ""
echo "  API URL:     http://localhost:8192"
echo "  Logs:        docker compose logs -f"
echo "  Shell:       docker compose exec mesh-router-backend bash"
echo "  Stop:        ./stop.sh"
echo ""
echo "  Hot reload is enabled - edit files and save to restart"
echo ""

# Follow logs
docker compose logs -f
