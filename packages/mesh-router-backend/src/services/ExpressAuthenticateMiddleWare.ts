// Authentication middleware
import admin from "firebase-admin";
import type { Request, Response, NextFunction } from "express";

export interface AuthUserRequest extends Request {
  user?: {
    uid: string;
  };
}

/**
 * Combined authentication middleware that supports:
 * 1. SERVICE_API_KEY authentication (for service-to-service calls)
 *    Format: Bearer SERVICE_API_KEY;uid
 * 2. Firebase authentication (for end-user calls)
 *    Format: Bearer <firebase-id-token>
 */
export const authenticate = async (
  req: AuthUserRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check for SERVICE_API_KEY authentication
    const serviceApiKey = process.env.SERVICE_API_KEY;
    if (serviceApiKey && authHeader.startsWith(`Bearer ${serviceApiKey};`)) {
      const token = authHeader.split("Bearer ")[1];
      const uid = token.split(";")[1];
      if (!uid) {
        return res.status(401).json({ error: "Unauthorized: Missing uid in service token" });
      }
      req.user = { uid };
      return next();
    }

    // Fall back to Firebase authentication
    const idToken = authHeader.split("Bearer ")[1];

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.user = { uid: decodedToken.uid };
      next();
    } catch (firebaseError) {
      console.error("Error verifying Firebase ID token:", firebaseError);
      return res.status(401).json({ error: "Unauthorized" });
    }
  } catch (error) {
    console.error("Error in authentication middleware:", error);
    return res.status(401).json({ error: "Unauthorized" });
  }
};
