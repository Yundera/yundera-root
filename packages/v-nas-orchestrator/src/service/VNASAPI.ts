import express from "express";
import {ScalewayInstanceOperations} from "../providers/scaleway/ScalewayInstanceOperations.js";
import {authenticate, AuthUserRequest} from "./ExpressAuthenticateMiddleWare.js";

export function vnasAPI(expressApp: express.Application,instanceOperations:ScalewayInstanceOperations) {
  let router = express.Router();

  router.post("/reboot", authenticate, async (req:AuthUserRequest, res) => {
    try {
      const uid  = req.user.uid;
      const result = await instanceOperations.reboot(uid);
      res.json(result);
    } catch (e) {
      console.log(e);
      res.status(500).json({ error: e });
    }
  });

  router.post("/delete", authenticate, async (req:AuthUserRequest, res) => {
    try {
      const uid  = req.user.uid;
      const result = await instanceOperations.delete(uid);
      res.json(result);
    } catch (e) {
      console.log(e);
      res.status(500).json({ error: e });
    }
  });

  router.post("/status", authenticate, async (req:AuthUserRequest, res) => {
    try {
      const uid  = req.user.uid;
      const result = await instanceOperations.status(uid);
      res.json(result);
    } catch (e) {
      console.log(e);
      res.status(500).json({ error: e });
    }
  });

  router.post("/create", authenticate, async (req:AuthUserRequest, res) => {
    try {
      const uid  = req.user.uid;
      const options = req.body;
      const result = await instanceOperations.setup(uid,options);
      res.json(result);
    } catch (e) {
      console.log(e);
      res.status(500).json({ error: e });
    }
  });

  expressApp.use('/vnas/', router);
}