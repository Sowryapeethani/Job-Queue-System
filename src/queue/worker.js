import { Worker } from "bullmq";
import { redisConnection } from "../config/redis.js";
import { updateJobStatus } from "../services/jobService.js";
import { connectDB } from "../config/db.js";
import { logger } from "../config/logger.js";
import { deadLetterQueue } from "../queue/deadLetterQueue.js";

await connectDB();

const worker = new Worker(
    "jobQueue",
    async (job) => {
        const currentAttempt = job.attemptsMade + 1;

        if (currentAttempt > 1) {
            logger.warn({
                message: "Retrying job",
                jobId: job.id,
                attempt: currentAttempt,
            });
        }

        await updateJobStatus(job.id, {
            status: currentAttempt > 1 ? "retrying" : "processing",
            attempts: currentAttempt,
        });

        logger.info({
            message: "Job started",
            jobId: job.id,
            attempt: currentAttempt,
            type: job.name,
        });

        try {
            // ***intentional failure****
            if (job.data.shouldFail && currentAttempt <= 2) {
                throw new Error("Intentional failure for retry testing");
            }

            await new Promise((r) => setTimeout(r, 2000));

            const result = { success: true };

            await updateJobStatus(job.id, {
                status: "completed",
                result,
                attempts: currentAttempt,
            });

            logger.info({
                message: "Job completed",
                jobId: job.id,
                attempt: currentAttempt,
            });

            return result;
        } catch (err) {
            logger.error({
                message: "Job failed",
                jobId: job.id,
                attempt: currentAttempt,
                error: err.message,
            });

            //Log retry scheduling
            if (currentAttempt < job.opts.attempts) {
                logger.warn({
                    message: "Job scheduled for retry",
                    jobId: job.id,
                    nextAttempt: currentAttempt + 1,
                });
            }

            if (currentAttempt >= job.opts.attempts) {
                await updateJobStatus(job.id, {
                    status: "failed",
                    attempts: currentAttempt,
                    result: { error: err.message },
                });

                await deadLetterQueue.add("failedJob", {
                    originalJobId: job.id,
                    data: job.data,
                    error: err.message,
                });

                logger.error({
                    message: "Job permanently failed",
                    jobId: job.id,
                    attempts: currentAttempt,
                });

                console.error("ALERT: Job failed permanently", job.id);
            }

            throw err;
        }
    },
    {
        connection: redisConnection,
        concurrency: 5,
        limiter: {
            max: 10,
            duration: 1000,
        },
        lockDuration: 30000,
        stalledInterval: 15000,
        maxStalledCount: 2,
    },
);

worker.on("failed", (job, err) => {
    logger.error({
        message: "Worker failed event",
        jobId: job?.id,
        error: err.message,
    });
});

worker.on("stalled", (jobId) => {
    logger.warn({
        message: "Job stalled and reprocessed",
        jobId,
    });
});
