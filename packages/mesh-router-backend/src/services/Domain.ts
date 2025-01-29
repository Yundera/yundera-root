import {NSL_ROUTER_COLLECTION, NSLRouterData} from "../DataBaseDTO/DataBaseNSLRouter.js";
import admin from "firebase-admin";

//https://www.nic.ad.jp/timeline/en/20th/appendix1.html#:~:text=Format%20of%20a%20domain%20name,a%20maximum%20of%20253%20characters.

/**
 * Validates a domain name according to standard naming conventions.
 * Rules:
 * - Must start with a letter or number
 * - Can contain only lower case letters and numbers
 * - Must be between 1 and 63 characters long
 * @param domain - The domain name to validate
 * @returns An object containing validation result and error message if any
 */
function validateDomainName(domain: string): { isValid: boolean; message: string } {
  if (!domain) {
    return { isValid: false, message: "Domain name cannot be empty." };
  }

  if (domain.length > 63) {
    return { isValid: false, message: "Domain name cannot be longer than 63 characters." };
  }

  // Check if domain contains only valid characters (letters and numbers)
  const validCharRegex = /^[a-z0-9]+$/;
  if (!validCharRegex.test(domain)) {
    return {
      isValid: false,
      message: "Domain name can only contain letters and numbers."
    };
  }

  // Check if first character is a letter or number
  const firstCharRegex = /^[a-z0-9]/;
  if (!firstCharRegex.test(domain)) {
    return {
      isValid: false,
      message: "Domain name must start with a letter or number."
    };
  }

  return { isValid: true, message: "Domain name is valid." };
}

/**
 * Checks the availability of a given domain name.
 * @param domain - The domain name to check. (just the subdomain part of the domain xxx.domain.com
 * @returns A promise that resolves to true if available, false otherwise.
 */
export async function getDomain(domain: string): Promise<{ uid: string, domain: NSLRouterData }> {
  if (!domain) {
    throw new Error("Domain name is required for availability check.");
  }

  const validation = validateDomainName(domain);
  if (!validation.isValid) {
    throw new Error(validation.message);
  }

  const nslRouterCollection = admin.firestore().collection(NSL_ROUTER_COLLECTION);
  const querySnapshot = await nslRouterCollection.where('domainName', '==', domain).get();

  if (querySnapshot.empty) {
    return null;
  } else {
    return {
      uid: querySnapshot.docs[0].id,
      domain: querySnapshot.docs[0].data() as NSLRouterData
    };
  }
}

const RESERVED_DOMAINS = ["root", "app", "www"];

/**
 * Checks if a domain name is available.
 * @param domain - The domain name to check
 * @returns Promise<{ available: boolean, message: string }>
 */
export async function checkDomainAvailability(domain: string): Promise<{ available: boolean, message: string }> {
  if (!domain) {
    throw new Error("Domain name is required.");
  }

  const validation = validateDomainName(domain);
  if (!validation.isValid) {
    return { available: false, message: validation.message };
  }

  if (RESERVED_DOMAINS.includes(domain)) {
    return { available: false, message: "Domain name is not available." };
  }

  const existingDomain = await getDomain(domain);
  return {
    available: existingDomain === null,
    message: existingDomain === null ? "Domain name is available." : "Domain name is not available."
  };
}

/**
 * Gets domain information for a specific user.
 * @param userId - The user ID
 * @returns Promise<NSLRouterData>
 */
export async function getUserDomain(userId: string): Promise<NSLRouterData | null> {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  const userDoc = await admin.firestore().collection(NSL_ROUTER_COLLECTION).doc(userId).get();
  return userDoc.exists ? userDoc.data() as NSLRouterData : null;
}

/**
 * Updates or creates domain information for a user.
 * @param userId - The user ID
 * @param domainData - The domain data to update
 */
export async function updateUserDomain(
  userId: string,
  domainData: Partial<NSLRouterData>
): Promise<void> {
  const { domainName } = domainData;

  // 2 possibility for domain update/create
  // 1. domain creation => domain must be available
  // 2. domain update => domain must be owned by the user (check with uid)
  // note that 1 user = 0-1 domain (no multiple domain per user)
  if (domainName) {
    const validation = validateDomainName(domainName);
    if (!validation.isValid) {
      throw new Error(validation.message);
    }

    const domain = await getDomain(domainName);
    const isAvailable = domain === null;
    const isOwned = domain?.uid === userId;

    if (!isAvailable && !isOwned) {
      throw new Error(domain ? "Domain name is not owned by you." : "Domain name is already in use.");
    }
  }

  // Clean the data by removing undefined values before sending to Firestore
  const cleanedData = Object.fromEntries(
    Object.entries(domainData).filter(([_, value]) => value !== undefined)
  );

  // Additional validation to ensure required fields are present
  if (Object.keys(cleanedData).length === 0) {
    throw new Error("No valid data provided for update");
  }

  const userDocRef = admin.firestore().collection(NSL_ROUTER_COLLECTION).doc(userId);
  await userDocRef.set(cleanedData, { merge: true });
}

/**
 * Deletes domain information for a user.
 * @param userId - The user ID
 */
export async function deleteUserDomain(userId: string): Promise<void> {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  await admin.firestore().collection(NSL_ROUTER_COLLECTION).doc(userId).delete();
}