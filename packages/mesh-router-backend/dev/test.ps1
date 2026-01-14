# PowerShell script to run tests

$ErrorActionPreference = "Stop"

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Check if container is running
$running = docker compose ps --status running 2>$null | Select-String "mesh-router-backend-dev"

if (-not $running) {
    Write-Host "[INFO] Container not running. Starting it..." -ForegroundColor Yellow
    docker compose up -d

    Write-Host "[INFO] Waiting for container to be ready..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10

    # Install dependencies if needed
    docker compose exec mesh-router-backend pnpm install
}

Write-Host "[INFO] Running tests..." -ForegroundColor Cyan
docker compose exec mesh-router-backend pnpm test

Write-Host ""
Write-Host "Tests completed!" -ForegroundColor Green
