import cron from "node-cron";
import {pcsAdminAction, pcsJobStatus} from "./lib/PCSProviders.js";
import {getConfig} from "./EnvConfig.js";
import {sendEmail} from "./lib/Sendgrid.js";


/**
 * Simple function that polls a job until completion
 * @param {string} jobId - The ID of the job to poll
 * @param uid
 * @returns {Promise} - Resolves with job result or rejects with error
 */
async function jobCompleted(jobId: string, uid: string) {
    console.log(`Polling job ${jobId} for completion...`);
    while (true) {
        // Use the original function directly
        const jobStatus = await pcsJobStatus(uid, jobId);

        // Handle error in response
        if (jobStatus.error) {
            throw new Error(jobStatus.error);
        }

        // Check completion status
        if (jobStatus.status === 'completed') {
            console.log(`Job ${jobId} completed successfully.`);
            return jobStatus;
        } else if (jobStatus.status === 'failed') {
            console.log(jobStatus.error);
            throw new Error(jobStatus.error || 'Job failed');
        } else if (jobStatus.status === 'processing'){
            // Continue polling after 1 second
            console.log(`Job ${jobId} status: ${jobStatus.status}. Polling...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
            console.log(jobStatus);
            throw new Error(`invalid job state`);
        }
    }
}


async function task() {
    try {
        const startTime = new Date();
        console.log(`Running scheduled cleanup at ${startTime.toISOString()}`);
        let uid = getConfig("DEMO_UID");

        let job;

        try {
            job = await pcsAdminAction(uid, "delete");
            await jobCompleted(job.jobId, uid);
        } catch (e) {
            /* If the delete job fails, we assume it is because there is no job to delete.*/
        }
        //don't add sleep here, it should not be needed, but if you run into issues fix the delete method
        job = await pcsAdminAction(uid, "create", {
            'ENVIRONMENT': {
                "USER": "demo:demodemo"
            }
        });
        await jobCompleted(job.jobId, uid);
        console.log(`Scheduled cleanup completed at ${new Date().toISOString()} execution time: ${(new Date().getTime() - startTime.getTime()) / 1000} seconds`);
        await sendEmail({
            to: getConfig("SENDMAIL_FROM_EMAIL"),
            subject: "Demo cleanup completed successful",
            text: `Demo cleanup completed successfully execution time: ${(new Date().getTime() - startTime.getTime()) / 1000} seconds`
        });
    } catch (error) {
        await sendEmail({
            to: getConfig("SENDMAIL_FROM_EMAIL"),
            subject: "Demo cleanup completed Error",
            text: `Scheduled cleanup failed: ${error.message}`
        });
        throw error; //continue the chain
    }
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
