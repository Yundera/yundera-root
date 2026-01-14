# mesh-router-backend

Express.js API for NSL Router domain management and VPN IP resolution. Handles user domain registration, verification, and IP-to-domain mapping for the mesh network.

## API Endpoints

### Domain Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/available/:domain` | Public | Check if domain name is available |
| GET | `/domain/:userid` | Public | Get user's domain info |
| POST | `/domain` | Firebase | Register or update domain |
| DELETE | `/domain` | Firebase | Delete user's domain |
| GET | `/verify/:userid/:sig` | Public | Verify domain ownership via Ed25519 signature |

### IP Registration

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/ip/:userid/:sig` | Ed25519 Signature | Register VPN IP for a user |
| GET | `/resolve/:domain` | Public | Resolve domain name to VPN IP |

### Example Usage

```bash
# Check domain availability
curl http://localhost:8192/available/myname
# Response: {"available":true,"message":"Domain name is available."}

# Resolve domain to VPN IP (like DNS)
curl http://localhost:8192/resolve/myname
# Response: {"vpnIp":"10.77.0.5","domainName":"myname","serverDomain":"nsl.sh"}

# Register VPN IP (requires Ed25519 signature of userid)
curl -X POST http://localhost:8192/ip/{userid}/{signature} \
  -H "Content-Type: application/json" \
  -d '{"vpnIp": "10.77.0.5"}'
# Response: {"message":"VPN IP registered successfully.","vpnIp":"10.77.0.5","domain":"myname.nsl.sh"}

# Verify domain ownership
curl http://localhost:8192/verify/{userid}/{signature}
# Response: {"serverDomain":"nsl.sh","domainName":"myname"}
```

## Getting Started

### Installation

```bash
pnpm install
```

### Configuration

**Service Account** (required):
- Path: `./config/serviceAccount.json`
- Documentation: [serviceAccount.json documentation](./config/serviceAccount.json.md)

### Development

#### Option 1: Docker (Recommended)

See [dev/README.md](./dev/README.md) for the Docker-based development environment with hot reload.

```bash
cd dev
./start.sh      # Linux/Mac
.\start.ps1     # Windows
```

#### Option 2: Local

```bash
pnpm start      # Development with hot reload
pnpm build      # Build TypeScript
pnpm exec       # Build and run
```

### Testing

```bash
# Using Docker dev environment
cd dev
./test.sh       # Linux/Mac
.\test.ps1      # Windows

# Or run directly
pnpm test
```

## Deployment

Build and publish using Dockflow:

```bash
npx dockflow build
npx dockflow publish
```

## Architecture

```
src/
├── index.ts                    # Express app entry point
├── services/
│   ├── RouterAPI.ts            # API endpoint definitions
│   ├── Domain.ts               # Domain business logic
│   └── ExpressAuthenticateMiddleWare.ts
├── firebase/
│   └── firebaseIntegration.ts  # Firebase Admin SDK setup
├── library/
│   └── KeyLib.ts               # Ed25519 signature utilities
├── DataBaseDTO/
│   └── DataBaseNSLRouter.ts    # Firestore data models
└── tests/
    ├── api.spec.ts             # Integration tests
    ├── test-app.ts             # Test app factory
    └── test-helpers.ts         # Test utilities
```

## References

- [Firebase Admin SDK](https://github.com/firebase/firebase-admin-node)
- [libsodium (Ed25519 signatures)](https://github.com/jedisct1/libsodium.js)