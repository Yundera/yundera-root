import express from "express";
import admin from "firebase-admin";
import {sign, verifySignature} from "../library/KeyLib.js";
import {
  NSL_ROUTER_COLLECTION,
  NSLRouterData
} from "../DataBaseDTO/DataBaseNSLRouter.js";
import {authenticate, AuthUserRequest} from "./ExpressAuthenticateMiddleWare.js";

/*
full domain = domainName+"."+serverDomain
model
nsl-router/%uid%
- domainName:string // eg foo
- serverDomain:string //always nsl.sh
- publicKey:string
*/

/**
 * Checks the availability of a given domain name.
 * @param domain - The domain name to check. (just the subdomain part of the domain xxx.domain.com
 * @returns A promise that resolves to true if available, false otherwise.
 */
async function getDomain(domain: string): Promise<{uid:string,domain:NSLRouterData}> {
  if (!domain) {
    throw new Error("Domain name is required for availability check.");
  }

  const nslRouterCollection = admin.firestore().collection(NSL_ROUTER_COLLECTION);
  const querySnapshot = await nslRouterCollection.where('domainName', '==', domain).get();

  if(querySnapshot.empty) {
    return null;
  } else {
    return {
      uid: querySnapshot.docs[0].id,
      domain:querySnapshot.docs[0].data() as NSLRouterData
    };
  }
}

export function routerAPI(expressApp: express.Application) {
  let router = express.Router();

  /**
   * GET /available/:domain
   * Checks if a domain name is available.
   */
  router.get('/available/:domain', async (req, res) => {
    try {
      const domain = req.params.domain.trim(); // Extract and trim domain from the route parameter

      // Validate that the domain is provided
      if (!domain) {
        return res.status(400).json({ error: "Domain name is required." });
      }


      const reservedList = ["root","app","www"];
      if (reservedList.includes(domain)) {
        return res.status(209).json({ available:false, message: "Domain name is not available." });
      }

      // Use the getDomain function
      const isAvailable = (await getDomain(domain)) == null;

      if (isAvailable) {
        return res.status(200).json({ available:true, message: "Domain name is available." });
      } else {
        return res.status(209).json({ available:false, message: "Domain name is not available." });
      }
    } catch (e) {
      console.error("Error in /available/:domain:", e);
      return res.status(500).json({ error: e.toString() });
    }
  });

  //used by mesh router
  router.get('/verify/:userid/:sig', async (req, res) => {
    let {userid, sig} = req.params;
    try {
      const db = admin.firestore();
      const usersRef = db.collection(NSL_ROUTER_COLLECTION);
      const document = await usersRef.doc(userid).get();
      const user = document.data() as NSLRouterData;

      if (user) {
        let {publicKey} = user;
        const isValid = await verifySignature(publicKey, sig, userid)
        console.log('Verifying signature for', req.params, isValid);
        if (isValid) {
          res.json({
            serverDomain: user.serverDomain,
            domainName: user.domainName
          });
        } else {
          res.json("" + isValid);
        }
      } else {
        res.json({err: "unknown user"});
      }
    } catch (e) {
      res.json({err: e.toString()});
    }
  });

  /**
   * GET /domain/:userid
   * Retrieves the domain information for the specified user.
   */
  router.get('/domain/:userid', async (req, res) => {
    const { userid } = req.params;

    try {
      if (!userid) {
        return res.status(400).json({ error: "User ID is required." });
      }

      const userDoc = await admin.firestore().collection(NSL_ROUTER_COLLECTION).doc(userid).get();

      if (!userDoc.exists) {
        return res.status(280).json({ error: "User not found." });
      }

      const userData = userDoc.data() as NSLRouterData;

      return res.status(200).json({
        domainName: userData.domainName,
        serverDomain: userData.serverDomain,
        publicKey: userData.publicKey
      });
    } catch (error) {
      console.error(error.toString());
      return res.status(500).json({ error: error.toString() });
    }
  });

  /**
   * POST /domain/:userid
   * Updates or sets the domain information for the specified user.
   * Requires authentication.
   */
  router.post('/domain', authenticate, async (req: AuthUserRequest, res) => {
    const { domainName, serverDomain = "nsl.sh", publicKey, source } = req.body;

    try {
      const userid  = req.user.uid;
      // At least one field must be present
      if (!domainName && !serverDomain && !publicKey) {
        return res.status(400).json({ error: "At least one of 'domainName', 'serverDomain', or 'publicKey' must be provided." });
      }

      // 2 possibility for domain update/create
      // 1. domain creation => domain must be available
      // 2. domain update => domain must be owned by the user (check with uid)
      // note that 1 user = 0-1 domain (no multiple domain per user)
      const domain = domainName ? await getDomain(domainName) : null;
      const isAvailable = domain == null;
      const isOwned = domain?.uid === userid; // Using optional chaining and strict equality

      if (!isAvailable && !isOwned) {
        // If domain exists but isn't owned by the user
        return res.status(domain ? 403 : 409).json({
          error: domain ? "Domain name is not owned by you." : "Domain name is already in use."
        });
      }

      const db = admin.firestore();
      const nslRouterCollection = db.collection(NSL_ROUTER_COLLECTION);
      const userDocRef = nslRouterCollection.doc(userid);

      // Prepare the update object
      const updateData: Partial<NSLRouterData> = {};
      if (domainName) updateData.domainName = domainName;
      if (serverDomain) updateData.serverDomain = serverDomain;
      if (publicKey) updateData.publicKey = publicKey;

      // Update the user's document
      await userDocRef.set(updateData, { merge: true });

      return res.status(200).json({ message: "Domain information updated successfully." });
    } catch (error) {
      console.error("Error in POST /domain", error);
      return res.status(500).json({ error: error.toString() });
    }
  });

  router.delete('/domain', authenticate, async (req: AuthUserRequest, res) => {

    try {
      const userid  = req.user.uid;

      const db = admin.firestore();
      const nslRouterCollection = db.collection(NSL_ROUTER_COLLECTION);
      const userDocRef = nslRouterCollection.doc(userid);

      // Update the user's document
      await userDocRef.delete();

      return res.status(200).json({ message: "Domain information deleted successfully." });
    } catch (error) {
      console.error("Error in DELETE /domain", error);
      return res.status(500).json({ error: error.toString() });
    }
  });

  expressApp.use('/', router);
}