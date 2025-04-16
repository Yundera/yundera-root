import cron from "node-cron";
import {vnasAdminAction, vnasJobStatus} from "./lib/VNASProviders.js";
import {getConfig} from "./EnvConfig.js";
import {sendEmail} from "./lib/Sendgrid.js";


/**
 * Simple function that polls a job until completion
 * @param {string} jobId - The ID of the job to poll
 * @param uid
 * @returns {Promise} - Resolves with job result or rejects with error
 */
async function jobCompleted(jobId:string,uid:string) {
    return new Promise((resolve, reject) => {
        const poll = async () => {
            try {
                // Use the original vnasJobStatus function directly
                const jobStatus = await vnasJobStatus(uid,jobId);

                // Handle error in response
                if (jobStatus.error) {
                    reject(new Error(jobStatus.error));
                    return;
                }

                // Check completion status
                if (jobStatus.status === 'completed') {
                    resolve(jobStatus);
                } else if (jobStatus.status === 'failed') {
                    reject(new Error(jobStatus.error || 'Job failed'));
                } else {
                    // Continue polling after 1 second
                    setTimeout(poll, 1000);
                }
            } catch (error) {
                reject(error);
            }
        };

        // Start polling
        poll();
    });
}


async function task() {
    try {
        const startTime = new Date();
        console.log(`Running scheduled cleanup at ${startTime.toISOString()}`);
        let uid = getConfig("DEMO_UID");
        let job = await vnasAdminAction(uid, "create", {
            'ENVIRONMENT': {
                "USER": "demo:demodemo"
            }
        });
        console.log(job);
        await jobCompleted(job.jobId, uid);
        console.log(`Scheduled cleanup completed at ${new Date().toISOString()} execution time: ${(new Date().getTime() - startTime.getTime()) / 1000} seconds`);
        await sendEmail({
            to:getConfig("SENDMAIL_FROM_EMAIL"),
            subject: "Demo cleanup completed successful",
            text: `Demo cleanup completed successfully execution time: ${(new Date().getTime() - startTime.getTime()) / 1000} seconds`
        });
    }catch (error) {
        await sendEmail({
            to:getConfig("SENDMAIL_FROM_EMAIL"),
            subject: "Demo cleanup completed Error",
            text: `Scheduled cleanup failed: ${error.message}`
        });
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
