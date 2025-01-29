import express from "express";
import {verifySignature} from "../library/KeyLib.js";
import {authenticate, AuthUserRequest} from "./ExpressAuthenticateMiddleWare.js";
import {checkDomainAvailability, deleteUserDomain, getUserDomain, updateUserDomain} from "./Domain.js";

/*
full domain = domainName+"."+serverDomain
model
nsl-router/%uid%
- domainName:string // eg foo
- serverDomain:string //always nsl.sh
- publicKey:string
*/

export function routerAPI(expressApp: express.Application) {
  let router = express.Router();

  /**
   * GET /available/:domain
   * Checks if a domain name is available.
   */
  router.get('/available/:domain', async (req, res) => {
    try {
      const domain = req.params.domain.trim();
      const availability = await checkDomainAvailability(domain);
      return res.status(availability.available ? 200 : 209).json(availability);
    } catch (error) {
      console.error("Error in /available/:domain:", error);
      return res.status(500).json({ error: error.toString() });
    }
  });

  //used by mesh router
  router.get('/verify/:userid/:sig', async (req, res) => {
    const {userid, sig} = req.params;
    try {
      const userData = await getUserDomain(userid);

      if (userData) {
        const isValid = await verifySignature(userData.publicKey, sig, userid);
        console.log('Verifying signature for', req.params, isValid);

        if (isValid) {
          res.json({
            serverDomain: userData.serverDomain,
            domainName: userData.domainName
          });
        } else {
          res.json("" + isValid);
        }
      } else {
        res.json({err: "unknown user"});
      }
    } catch (error) {
      res.json({err: error.toString()});
    }
  });

  /**
   * GET /domain/:userid
   * Retrieves the domain information for the specified user.
   */
  router.get('/domain/:userid', async (req, res) => {
    try {
      const userData = await getUserDomain(req.params.userid);

      if (!userData) {
        return res.status(280).json({ error: "User not found." });
      }

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
    const { domainName, serverDomain = "nsl.sh", publicKey } = req.body;

    try {
      if (!domainName && !serverDomain && !publicKey) {
        return res.status(400).json({ error: "At least one of 'domainName', 'serverDomain', or 'publicKey' must be provided." });
      }

      await updateUserDomain(req.user.uid, { domainName, serverDomain, publicKey });
      return res.status(200).json({ message: "Domain information updated successfully." });
    } catch (error) {
      console.error("Error in POST /domain", error);
      return res.status(500).json({ error: error.toString() });
    }
  });

  router.delete('/domain', authenticate, async (req: AuthUserRequest, res) => {
    try {
      await deleteUserDomain(req.user.uid);
      return res.status(200).json({ message: "Domain information deleted successfully." });
    } catch (error) {
      console.error("Error in DELETE /domain", error);
      return res.status(500).json({ error: error.toString() });
    }
  });
  expressApp.use('/', router);
}