import cron from "node-cron";
import {vnasAdminAction} from "./lib/VNASProviders.js";
import {getConfig} from "./EnvConfig.js";

async function task() {
    console.log(`Running scheduled cleanup at ${new Date().toISOString()}`);
    await vnasAdminAction(getConfig("DEMO_UID"),"create",{
        'ENVIRONMENT': {
            "USER": "demo:demodemo"
        }
    });
    console.log(`Scheduled cleanup completed at ${new Date().toISOString()}`);
}

// Schedule the job to run at 7 AM UTC daily
cron.schedule("0 7 * * *", async () => {
    task().catch(console.error).then(() => {
        console.log("task completed");
    });
});

console.log("Scheduler started. Waiting for next run...");
task().catch(console.error).then(() => {
    console.log("initial task completed");
});
