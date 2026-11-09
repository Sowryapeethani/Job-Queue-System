import { Job } from "../models/job.js";
import { jobQueue } from "../queue/queue.js";

// 🔹 DB Operations
export const createJobRecord = async (data) => {
    return await Job.create(data);
};

export const updateJobStatus = async (jobId, update) => {
    return await Job.findOneAndUpdate({ jobId }, update, {
        returnDocument: "after",
    });
};

export const getJobById = async (jobId) => {
    return await Job.findOne({ jobId });
};

// 🔹 Queue Logic (ONLY HERE)
export const addJob = async (type, payload, priority = 5) => {
    const job = await jobQueue.add(type, payload, {
        priority,
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 2000,
        },
        removeOnComplete: false,
        removeOnFail: false,
    });

    return job;
};
