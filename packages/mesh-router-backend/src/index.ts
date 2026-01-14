import cors from "cors";
import express from "express";

import {initializeFb} from "./firebase/firebaseIntegration.js";
import {routerAPI} from "./services/RouterAPI.js";

import 'dotenv/config';

const expressApp = express();
expressApp.use(express.json());
expressApp.use(cors());

const port = 8192;
expressApp.listen(port, () => {
    initializeFb();
    routerAPI(expressApp);
    console.log('Listening on ' + port);
});
