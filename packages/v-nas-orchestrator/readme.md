# PCS Orchestrator (Personal Cloud Server)

## Overview

The PCS (Personal Cloud Server / VM) orchestrator is a Node.js application used to allocate and manage PCS for each user with operations such as allocating, deleting, rebooting or enquiring the status of a given PCS. The orchestrator is designed to provide a RESTful interface for managing PCS instances. It has access to the users Database (via firebase) and has full authority to allocate resources according to the users permissions.

## API Endpoints

Based on the code provided, the following endpoints are available:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/pcs/create` | POST | Create a new PCS instance |
| `/pcs/delete` | POST | Delete a user's PCS instance |
| `/pcs/reboot` | POST | Reboot a user's PCS instance |
| `/pcs/status` | POST | Get status of a user's PCS instance |
| `/pcs/job/:jobId` | GET | Check status of a long-running job |

All endpoints require authentication and use asynchronous processing with job status tracking.

## Authentication

As shown in the provided code, the application uses authentication middleware. All API endpoints require a valid authorization header. Two authentication methods are supported:

1. Firebase authentication via the `firebaseUserAuthenticate` middleware
2. Service API key with format `Bearer SERVICE_API_KEY;uid`

Here's an example of a key-value pair for the authentication header:

In this example:
- The key is `Authorization`
- The value is `Bearer SERVICE_API_KEY;uid`

The value consists of two parts:
1. The authentication scheme (`Bearer`)
2. The token (the JWT string that follows)

For the service API key format mentioned in your code, it would look like:
```
Authorization: Bearer SERVICE_API_KEY;uid
```

Where `SERVICE_API_KEY` would be replaced with your actual API key, and `uid` would be the user ID.

## Implementation Details

- The application uses an in-memory map (`jobStatusMap`) to store job status information
- Long-running operations (create, delete, reboot) return immediately with a job ID
- Job status can be checked with the `/pcs/job/:jobId` endpoint
- Jobs are automatically removed from memory 1 hour after completion or failure
- Jobs are secured by ensuring the requesting user owns the job (checking uid prefix)

## Getting Started

### Installation

Install project dependencies:
```bash
pnpm install
```

### Configuration

Configure the following environment variables by referring to their respective documentation:

1. Environment  
   Path: `./.env`  
   Documentation: [env documentation](./.env.md)

2. Service Account  
   Path: `./config/serviceAccount.json`  
   Documentation: [serviceAccount documentation](./config/serviceAccount.json.md)

### Development

Start the development server:
```bash
pnpm start
```

## Deployment

Build and publish using Dockflow:

```bash
npx dockflow build
npx dockflow publish
```

## Documentation References

- Firebase Admin: https://github.com/firebase/firebase-admin-node
- Firebase Admin NPM Package: https://www.npmjs.com/package/firebase-admin