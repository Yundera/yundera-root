import { generateKeyPair, sign } from "../library/KeyLib.js";
import admin from "firebase-admin";
import { NSL_ROUTER_COLLECTION, NSLRouterData } from "../DataBaseDTO/DataBaseNSLRouter.js";

// Test user prefix to identify test data (alphanumeric only for domain validation)
export const TEST_USER_PREFIX = "testuser";

/**
 * Generate a unique test user ID (alphanumeric only to pass domain validation)
 */
export function generateTestUserId(): string {
  const timestamp = Date.now().toString(36); // Convert to base36 for shorter string
  const random = Math.random().toString(36).substring(2, 8);
  return `${TEST_USER_PREFIX}${timestamp}${random}`;
}

/**
 * Create a test user with keypair in Firebase
 * The domainName is the userId itself (alphanumeric, valid for domain)
 */
export async function createTestUser(userId: string): Promise<{ publicKey: string; privateKey: string }> {
  const keyPair = await generateKeyPair();

  const userData: NSLRouterData = {
    domainName: userId, // userId is now alphanumeric and valid as domain
    serverDomain: "nsl.sh",
    publicKey: keyPair.pub,
  };

  await admin.firestore().collection(NSL_ROUTER_COLLECTION).doc(userId).set(userData);

  return {
    publicKey: keyPair.pub,
    privateKey: keyPair.priv,
  };
}

/**
 * Sign a message with a private key
 */
export async function signMessage(privateKey: string, message: string): Promise<string> {
  return sign(privateKey, message);
}

/**
 * Delete a test user from Firebase
 */
export async function deleteTestUser(userId: string): Promise<void> {
  await admin.firestore().collection(NSL_ROUTER_COLLECTION).doc(userId).delete();
}

/**
 * Clean up all test users (those with TEST_USER_PREFIX)
 */
export async function cleanupAllTestUsers(): Promise<void> {
  const snapshot = await admin.firestore()
    .collection(NSL_ROUTER_COLLECTION)
    .where("domainName", ">=", "")
    .get();

  const batch = admin.firestore().batch();
  let count = 0;

  snapshot.docs.forEach((doc) => {
    if (doc.id.startsWith(TEST_USER_PREFIX)) {
      batch.delete(doc.ref);
      count++;
    }
  });

  if (count > 0) {
    await batch.commit();
    console.log(`[Test Cleanup] Deleted ${count} test users`);
  }
}

/**
 * Get test user data from Firebase
 */
export async function getTestUserData(userId: string): Promise<NSLRouterData | null> {
  const doc = await admin.firestore().collection(NSL_ROUTER_COLLECTION).doc(userId).get();
  return doc.exists ? (doc.data() as NSLRouterData) : null;
}
