import { z } from "zod";

export const jobSchema = z.object({
    type: z.string().min(1, "Job type is required"),

    payload: z.object({
        to: z.email("Invalid email format"),
        message: z.string().min(1, "Message cannot be empty"),
    }),

    priority: z.number().int().min(1).max(10).optional(),
});
