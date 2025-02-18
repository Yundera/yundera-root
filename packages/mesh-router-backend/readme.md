# mesh router backend

## Getting Started

### Installation

Install project dependencies:
```bash
pnpm install
```

### Configuration

Configure the following environment variables by referring to their respective documentation:

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

## doc firebase admin
https://github.com/firebase/firebase-admin-node
https://www.npmjs.com/package/firebase-admin