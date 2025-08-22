# V-NAS Demo Service

A scheduled cleanup service that manages demo Personal Cloud Server (PCS) instances for the Yundera platform. This service automatically destroys and recreates demo environments daily to ensure clean, fresh demo experiences for users.

## Overview

The V-NAS Demo service is a TypeScript/Node.js application that:

- Runs a daily cron job at 7:00 AM UTC
- Deletes existing demo PCS instances
- Creates fresh demo PCS instances with default configurations
- Sends email notifications about operation status via SendGrid
- Integrates with the PCS orchestrator API for VM lifecycle management

## Architecture

```
┌─────────────────┐    HTTP/REST    ┌──────────────────────┐
│   v-nas-demo    │ ──────────────► │   pcs-orchestrator   │
│   (scheduler)   │                 │   (VM lifecycle)     │
└─────────────────┘                 └──────────────────────┘
         │                                       │
         │ SendGrid API                          │ Proxmox API
         ▼                                       ▼
┌─────────────────┐                 ┌──────────────────────┐
│   SendGrid      │                 │   Proxmox Cluster    │
│   (email)       │                 │   (virtualization)   │
└─────────────────┘                 └──────────────────────┘
```

## Installation

### Prerequisites

- Node.js 18+
- pnpm package manager
- Access to Yundera PCS orchestrator API
- SendGrid account for email notifications

### Setup

1. Install dependencies:
```bash
pnpm install
```

2. Configure environment variables (see [Environment Configuration](#environment-configuration))

3. Build the project:
```bash
pnpm build
```

## Usage

### Development

Start in development mode with hot reload:
```bash
pnpm start
```

### Production

Build and run the compiled application:
```bash
pnpm build
pnpm exec
```

### Docker

Build and run using Docker:
```bash
docker build -t pcs-demo .
docker run --env-file .env pcs-demo
```

## Environment Configuration

Copy the `.env.md` template and configure the following variables:

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `VNAS_BACKEND` | PCS orchestrator API endpoint | Yes | `https://app.yundera.com/service/pcs` |
| `VNAS_SERVICE_API_KEY` | API key for PCS orchestrator authentication | Yes | `your-api-key` |
| `DEMO_UID` | User ID for demo instance management | Yes | `nzEHxxxxxxxxxx` |
| `SENDGRID_API_KEY` | SendGrid API key for email notifications | Yes | `SG.xxxx` |
| `SENDMAIL_FROM_EMAIL` | From email address for notifications | Yes | `admin@yundera.com` |

## How It Works

### Scheduled Execution

The service uses `node-cron` to schedule daily execution:

1. **Initial Run**: Executes immediately on startup for testing
2. **Daily Schedule**: Runs at 7:00 AM UTC every day
3. **Job Polling**: Monitors job completion with 1-second intervals

### Demo Lifecycle Process

1. **Cleanup Phase**: 
   - Attempts to delete existing demo PCS instance
   - Ignores errors if no instance exists

2. **Creation Phase**:
   - Creates new demo PCS instance
   - Applies default demo user configuration: `"demo:demodemo"`
   - Waits for job completion

3. **Notification Phase**:
   - Sends success email with execution time
   - Sends failure email if any errors occur

### Job Management

The service implements a polling mechanism for async job tracking:

```typescript
// Poll job status until completion
const jobStatus = await pcsJobStatus(uid, jobId);
if (jobStatus.status === 'completed') {
    // Success - continue
} else if (jobStatus.status === 'failed') {
    // Handle failure
} else {
    // Continue polling
}
```

## API Integration

### PCS Orchestrator API

The service communicates with the PCS orchestrator using these endpoints:

- `POST /pcs/delete` - Delete existing PCS instance
- `POST /pcs/create` - Create new PCS instance
- `GET /pcs/job/{jobId}` - Check job status

Authentication uses Bearer token format:
```
Authorization: Bearer {API_KEY};{USER_ID}
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm start` | Development mode with hot reload |
| `pnpm build` | Compile TypeScript to JavaScript |
| `pnpm exec` | Build and run compiled application |
| `pnpm test` | Run test suite |
| `pnpm lint` | Run ESLint code analysis |

## Error Handling

- **Delete Failures**: Ignored (assumes no instance to delete)
- **Create Failures**: Service stops and sends error notification
- **Job Polling**: Continues until completion or failure
- **Email Failures**: Logged but don't stop the main process

## Monitoring

The service provides execution feedback through:

- Console logging for all major operations
- Email notifications for success/failure
- Execution time tracking
- Job status monitoring

## Security Considerations

- Environment variables contain sensitive credentials
- API keys should never be committed to version control
- Service authentication uses secure Bearer token format
- Email notifications may contain operational details

## Contributing

This service follows the Yundera monorepo patterns:

- TypeScript with ES modules
- pnpm package management
- Docker containerization
- Environment-based configuration

## Deployment

The service is containerized and deployed to the Scaleway Container Registry:
- Registry: `rg.fr-par.scw.cloud/aptero`
- Image: `pcs-demo`
- Version: Managed via `dockflow.json`