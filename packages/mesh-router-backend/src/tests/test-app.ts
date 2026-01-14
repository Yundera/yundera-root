import cors from "cors";
import bodyParser from "body-parser";
import express from "express";
import { initializeFb } from "../firebase/firebaseIntegration.js";
import { routerAPI } from "../services/RouterAPI.js";

let initialized = false;

/**
 * Create and configure the Express app for testing
 */
export function createTestApp(): express.Application {
  // Initialize Firebase only once
  if (!initialized) {
    initializeFb();
    initialized = true;
  }

  const app = express();
  app.use(bodyParser.json());
  app.use(cors());

  routerAPI(app);

  return app;
}
