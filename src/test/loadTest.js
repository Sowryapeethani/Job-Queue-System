import axios from "axios";

const sendJobs = async () => {
    const jobs = [];

    for (let i = 0; i < 50; i++) {
        jobs.push(
            axios.post("http://localhost:3000/job", {
                type: "email",
                payload: {
                    to: `user${i}@test.com`,
                    message: `Hello ${i}`,
                },
            }),
        );
    }

    await Promise.all(jobs);
    console.log("50 jobs sent");
};

sendJobs();
