import express from "express";
import {authenticate, AuthUserRequest} from "./ExpressAuthenticateMiddleWare.js";
import {InstanceOperations} from "../providers/InstanceOperations.js";

const jobStatusMap = new Map<string, {status: string, result?: any, error?: any}>();

export function vnasAPI(expressApp: express.Application, instanceOperations: InstanceOperations) {
  let router = express.Router();

  router.post("/reboot", authenticate, async (req: AuthUserRequest, res) => {
    try {
      const uid = req.user.uid;

      // Generate a unique job ID
      const jobId = `${uid}-reboot-${Date.now()}`;

      // Store initial job status
      jobStatusMap.set(jobId, { status: 'processing' });

      // Respond immediately with the job ID
      res.json({ jobId, status: 'processing' });

      // Execute the reboot task asynchronously
      instanceOperations.reboot(uid)
          .then(result => {
            jobStatusMap.set(jobId, { status: 'completed', result });
          })
          .catch(error => {
            console.log(error);
            jobStatusMap.set(jobId, { status: 'failed', error: error.toString() });
          });
    } catch (e) {
      console.log(e);
      res.status(500).json({ error: e });
    }
  });

  router.post("/delete", authenticate, async (req: AuthUserRequest, res) => {
    try {
      const uid = req.user.uid;

      // Generate a unique job ID
      const jobId = `${uid}-delete-${Date.now()}`;

      // Store initial job status
      jobStatusMap.set(jobId, { status: 'processing' });

      // Respond immediately with the job ID
      res.json({ jobId, status: 'processing' });

      // Execute the delete task asynchronously
      instanceOperations.delete(uid)
          .then(result => {
            jobStatusMap.set(jobId, { status: 'completed', result });
          })
          .catch(error => {
            console.log(error);
            jobStatusMap.set(jobId, { status: 'failed', error: error.toString() });
          });
    } catch (e) {
      console.log(e);
      res.status(500).json({ error: e });
    }
  });

  router.post("/status", authenticate, async (req: AuthUserRequest, res) => {
    try {
      const uid = req.user.uid;
      const result = await instanceOperations.has(uid);
      res.json(result);
    } catch (e) {
      console.log(e);
      res.status(500).json({ error: e });
    }
  });

  router.post("/create", authenticate, async (req: AuthUserRequest, res) => {
    try {
      const uid = req.user.uid;
      const options = req.body;

      // Generate a unique job ID (simple implementation - consider using UUID in production)
      const jobId = `${uid}-create-${Date.now()}`;

      // Store initial job status
      jobStatusMap.set(jobId, { status: 'processing' });

      // Respond immediately with the job ID
      res.json({ jobId, status: 'processing' });

      // Execute the long-running task asynchronously
      instanceOperations.create(uid, options)
          .then(result => {
            jobStatusMap.set(jobId, { status: 'completed', result });
          })
          .catch(error => {
            console.log(error);
            jobStatusMap.set(jobId, { status: 'failed', error: error.toString() });
          });

    } catch (e) {
      console.log(e);
      res.status(500).json({ error: e });
    }
  });

  router.get("/job/:jobId", authenticate, async (req: AuthUserRequest, res) => {
    try {
      const { jobId } = req.params;
      const uid = req.user.uid;

      // Basic security check - ensure the job belongs to the requesting user
      if (!jobId.startsWith(uid)) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const jobStatus = jobStatusMap.get(jobId);

      if (!jobStatus) {
        return res.status(404).json({ error: 'Job not found' });
      }

      res.json(jobStatus);

      // Optionally, clean up completed/failed jobs after some time
      if (jobStatus.status === 'completed' || jobStatus.status === 'failed') {
        setTimeout(() => {
          jobStatusMap.delete(jobId);
        }, 3600000); // Remove after 1 hour
      }

    } catch (e) {
      console.log(e);
      res.status(500).json({ error: e });
    }
  });

  expressApp.use('/pcs/', router);
}