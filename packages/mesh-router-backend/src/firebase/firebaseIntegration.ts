//https://firebase.google.com/docs/admin/setup/#initialize_the_sdk_in_non-google_environments
import admin from "firebase-admin";
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Convert the module URL to a file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getServiceAccountPath(): string {
  // Check GOOGLE_APPLICATION_CREDENTIALS env var first
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }
  // Fall back to default config path
  return path.join(__dirname, '../../config/serviceAccount.json');
}

let serviceAccount: admin.ServiceAccount | null = null;
const filePath = getServiceAccountPath();

if (fs.existsSync(filePath)) {
  serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
} else {
  console.warn(`[Firebase] Service account not found at: ${filePath}`);
  console.warn('[Firebase] Set GOOGLE_APPLICATION_CREDENTIALS or place serviceAccount.json in config/');
}

export function initializeFb() {
  if (!serviceAccount) {
    console.error('[Firebase] Cannot initialize - no service account configured');
    throw new Error('Firebase service account not configured. See warnings above.');
  }
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}