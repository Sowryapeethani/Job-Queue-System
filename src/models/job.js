import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
    {
        jobId: { type: String, required: true },
        type: String,
        payload: Object,
        status: {
            type: String,
            enum: ["pending", "processing", "completed", "failed"],
            default: "pending",
        },
        result: Object,
        attempts: { type: Number, default: 0 },
    },
    { timestamps: true },
);

export const Job = mongoose.model("Job", jobSchema);
