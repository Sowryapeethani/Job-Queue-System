import { createJobRecord, getJobById, addJob } from "../services/jobService.js";
import { jobSchema } from "../validators/jobValidator.js";

export const createJob = async (req, res) => {
    try {
        const parsed = jobSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({
                error: "Invalid input",
                details: parsed.error.errors,
            });
        }

        const { type, payload, priority } = req.body;

        if (!type) {
            return res.status(400).json({ error: "Job type is required" });
        }

        const job = await addJob(type, payload, priority);

        await createJobRecord({
            jobId: job.id,
            type,
            payload,
            status: "pending",
            attempts: 0,
        });

        return res.json({
            message: "Job added to queue",
            jobId: job.id,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const getJob = async (req, res) => {
    try {
        const job = await getJobById(req.params.id);

        if (!job) {
            return res.status(404).json({ error: "Job not found" });
        }

        return res.json(job);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
