# PowerShell script to start dev environment

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Starting mesh-router-backend Dev Environment" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Check for .env file
if (-not (Test-Path ".env")) {
    Write-Host "[WARN] No .env file found. Creating from template..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "[INFO] Created .env from .env.example - please edit with your values" -ForegroundColor Green
    } else {
        "# mesh-router-backend dev environment" | Out-File -FilePath ".env" -Encoding UTF8
        Write-Host "[INFO] Created empty .env file" -ForegroundColor Green
    }
}

# Check for serviceAccount.json
if (-not (Test-Path "../config/serviceAccount.json")) {
    Write-Host ""
    Write-Host "[WARN] No serviceAccount.json found!" -ForegroundColor Yellow
    Write-Host "       Copy your Firebase service account JSON to:" -ForegroundColor Yellow
    Write-Host "       $ScriptDir\..\config\serviceAccount.json" -ForegroundColor White
    Write-Host ""
}

# Build and start
Write-Host "[INFO] Building dev container..." -ForegroundColor Cyan
docker compose build

Write-Host "[INFO] Starting container..." -ForegroundColor Cyan
docker compose up -d

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Development server starting..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  API URL:     http://localhost:8192" -ForegroundColor White
Write-Host "  Logs:        docker compose logs -f" -ForegroundColor White
Write-Host "  Shell:       docker compose exec mesh-router-backend bash" -ForegroundColor White
Write-Host "  Tests:       .\test.ps1" -ForegroundColor White
Write-Host "  Stop:        .\stop.ps1" -ForegroundColor White
Write-Host ""
Write-Host "  Hot reload is enabled - edit files and save to restart" -ForegroundColor Green
Write-Host ""

# Follow logs
docker compose logs -f
