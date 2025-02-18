
## Getting Started

### Installation

Install project dependencies:
```bash
pnpm install
```

### Configuration

Configure the following environment variables by referring to their respective documentation:

1. environment
   path: `./.env`
   Documentation: [env documentation](./.env.md)

3. Service Account  
   Path: `./config/serviceAccount.json`  
   Documentation: [serviceAccount.json documentation](./config/serviceAccount.json.md)

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


# doc firebase admin
https://github.com/firebase/firebase-admin-node
https://www.npmjs.com/package/firebase-admin


# dev stripe
// NOTE for developers: use
// stripe listen --forward-to localhost:4322/api/payment/stripe-listener-webhook to forward events to your local server
// and
// stripe trigger payment_intent.succeeded to trigger a test event
