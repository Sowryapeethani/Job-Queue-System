import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import { createJob, getJob } from "./controllers/jobController.js";
import { serverAdapter } from "./config/bullBoard.js";
import { apiKeyAuth } from "./middleware/auth.js";

dotenv.config();

await connectDB();

const app = express();
app.use(express.json());

app.post("/job", apiKeyAuth, createJob);
app.get("/job/:id", getJob);
app.use("/admin/queues", serverAdapter.getRouter());

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
