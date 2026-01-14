#!/bin/bash
set -e

echo "=========================================="
echo "  mesh-router-backend Development Server"
echo "=========================================="

LOCK_FILE="/tmp/pnpm-install.lock"

# Function to install dependencies with locking
install_deps() {
    echo "[DEV] Checking dependencies..."

    # Check if node_modules exists and has content
    if [ ! -d "/app/node_modules" ] || [ -z "$(ls -A /app/node_modules 2>/dev/null)" ]; then
        echo "[DEV] Installing dependencies (this may take a moment on first run)..."

        # Use flock to prevent race conditions if multiple containers start
        exec 200>"$LOCK_FILE"
        flock -x 200

        # Re-check after acquiring lock
        if [ ! -d "/app/node_modules" ] || [ -z "$(ls -A /app/node_modules 2>/dev/null)" ]; then
            cd /app
            pnpm install
            echo "[DEV] Dependencies installed successfully"
        else
            echo "[DEV] Dependencies already installed by another process"
        fi

        flock -u 200
    else
        echo "[DEV] Dependencies already installed"
    fi
}

# Function to start development server with hot reload
start_dev_server() {
    echo "[DEV] Starting development server with hot reload..."
    cd /app

    # Use tsc-watch for TypeScript hot reload
    # This will recompile and restart on file changes
    exec pnpm start
}

# Main execution
echo "[DEV] Working directory: $(pwd)"
echo "[DEV] Node version: $(node --version)"
echo "[DEV] pnpm version: $(pnpm --version)"

install_deps
start_dev_server
