# mesh-router-backend Development Environment

Docker-based development environment for mesh-router-backend with hot reload and integrated testing.

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Firebase service account JSON file

### Setup

1. **Add Firebase credentials:**
   ```bash
   # Copy your service account to the config directory
   cp /path/to/your/serviceAccount.json ../config/serviceAccount.json
   ```

2. **Start the development server:**
   ```bash
   # Linux/Mac
   ./start.sh

   # Windows PowerShell
   .\start.ps1
   ```

3. **Access the API:**
   ```
   http://localhost:8192
   ```

## Scripts

| Script | Description |
|--------|-------------|
| `start.sh` / `start.ps1` | Start dev environment with logs |
| `stop.sh` / `stop.ps1` | Stop containers (use `--clean` to remove volumes) |
| `test.sh` / `test.ps1` | Run the test suite |

## Running Tests

```bash
# Linux/Mac
./test.sh

# Windows PowerShell
.\test.ps1

# Or manually
docker compose up -d
docker compose exec mesh-router-backend pnpm test
```

### Test Output

```
IP Registration API
  POST /ip/:userid/:sig
    ✔ should register VPN IP with valid signature
    ✔ should reject invalid signature
    ✔ should reject missing vpnIp in body
    ✔ should reject invalid IP format
    ✔ should reject non-existent user
    ✔ should accept valid IPv6 address
    ✔ should update existing IP with new value
  GET /resolve/:domain
    ✔ should resolve domain to IP
    ✔ should return 404 for unknown domain
    ✔ should return 404 for domain without IP registered
    ✔ should handle case-insensitive domain lookup

11 passing
```

## Architecture

```
dev/
├── Dockerfile.dev        # Node 22 Alpine + pnpm (thin image)
├── docker-compose.yml    # Service definition with volume mounts
├── entrypoint-dev.sh     # Smart startup script
├── start.sh / start.ps1  # Start dev environment
├── stop.sh / stop.ps1    # Stop dev environment
├── test.sh / test.ps1    # Run tests
├── .env.example          # Environment template
├── .gitignore            # Excludes secrets
└── README.md             # This file
```

## Docker Compose Configuration

### Volumes

| Volume | Purpose |
|--------|---------|
| `..:/app` | Source code (hot reload) |
| `node_modules` | Named volume for dependencies (performance) |
| `pnpm-store` | pnpm cache (faster installs) |
| `../config:/app/config` | Firebase service account |

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Node environment | `development` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to Firebase service account | `/app/config/serviceAccount.json` |

## Development Workflow

### Hot Reload

The dev server uses `tsc-watch` for automatic TypeScript compilation and restart on file changes:

1. Edit any `.ts` file in `src/`
2. Save the file
3. TypeScript recompiles automatically
4. Server restarts with new code

### Viewing Logs

```bash
# Follow logs
docker compose logs -f

# Last 100 lines
docker compose logs --tail 100
```

### Shell Access

```bash
docker compose exec mesh-router-backend bash
```

### Manual Commands Inside Container

```bash
# Install dependencies
pnpm install

# Build only
pnpm build

# Run tests
pnpm test

# Lint
pnpm lint
```

## API Endpoints

### Domain Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/available/:domain` | Public | Check domain availability |
| GET | `/domain/:userid` | Public | Get user's domain info |
| POST | `/domain` | Firebase | Register/update domain |
| DELETE | `/domain` | Firebase | Delete domain |
| GET | `/verify/:userid/:sig` | Public | Verify domain ownership |

### IP Registration (New)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/ip/:userid/:sig` | Ed25519 Signature | Register VPN IP for user |
| GET | `/resolve/:domain` | Public | Resolve domain to VPN IP |

### Example Usage

```bash
# Check domain availability
curl http://localhost:8192/available/myname

# Resolve domain to IP (like DNS)
curl http://localhost:8192/resolve/myname
# Response: {"vpnIp":"10.77.0.5","domainName":"myname","serverDomain":"nsl.sh"}

# Register IP (requires signature)
curl -X POST http://localhost:8192/ip/{userid}/{signature} \
  -H "Content-Type: application/json" \
  -d '{"vpnIp": "10.77.0.5"}'
```

## Troubleshooting

### Container won't start

1. Check if port 8192 is in use:
   ```bash
   lsof -i :8192  # Linux/Mac
   netstat -ano | findstr 8192  # Windows
   ```

2. Check Docker logs:
   ```bash
   docker compose logs
   ```

### Firebase errors

1. Ensure `serviceAccount.json` exists in `../config/`
2. Check the file is valid JSON
3. Verify the service account has Firestore access

### Dependencies not installing

```bash
# Clean and reinstall
./stop.sh --clean
./start.sh
```

### TypeScript errors

```bash
# Check compilation manually
docker compose exec mesh-router-backend pnpm build
```

## Cleanup

```bash
# Stop containers, keep volumes (node_modules preserved)
./stop.sh

# Full cleanup (removes node_modules volume)
./stop.sh --clean
```
