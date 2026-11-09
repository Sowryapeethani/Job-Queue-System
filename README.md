# Distributed Job Queue System

## Node.js + BullMQ + Redis + MongoDB

Most backend applications rely on asynchronous processing for tasks like email delivery, file processing, and retries. This project implements a distributed job queue system to handle such workloads reliably outside the request-response cycle.

---

## Tech stack

- **Node.js + Express** — API layer and backend runtime
- **BullMQ** — Queue management, retry logic, priority handling
- **Redis** — Where the queue actually lives; tracks job state in memory
- **MongoDB + Mongoose** — Persistent job records that survive restarts
- **Bull Board** — Real-time dashboard to watch jobs move through the system
- **Pino** — Structured logging so failures are actually debuggable

---

## Design Decisions

- **Redis for queue state**
  - Fast, in-memory operations required for job scheduling and retries

- **MongoDB for persistence**
  - Ensures job history and status survive Redis restarts

- **Separate workers**
  - Enables horizontal scaling and fault isolation

---

## Features

### Job lifecycle

Every job moves through defined states — `pending → processing → completed` — or falls into `retrying` and eventually `failed` if things go wrong. All of this is persisted in MongoDB, not just held in Redis, so you have a full audit trail even after jobs are done.

### Retry Mechanism (exponential backoff)

When a job fails, it doesn't just die. It retries — up to 3 times by default — with increasing delays between each attempt. This prevents hammering a downstream service that's temporarily down, and stops infinite loops when something is genuinely broken.

### Priority queue

Not all jobs are equal. A password reset email should go out before a weekly digest. Jobs take a priority value — lower number means higher priority — and the worker always picks the most critical job available.

### Rate limiting

Workers use BullMQ’s built-in limiter to control throughput:

- Prevents overwhelming downstream services
- Ensures stable processing under heavy load
- Configurable per worker (jobs/sec)

### Worker crash recovery

A key reliability feature is worker crash recovery. If a worker dies mid-job — crash, OOM kill, whatever — that job doesn't disappear. BullMQ uses Redis persistence and stalled job detection to automatically recover and reprocess interrupted jobs.

### Input validation & security

- Request payloads validated using Zod schemas before entering the queue
- Prevents malformed jobs from being processed
- API protected using API key authentication middleware

### Dead Letter Queue (DLQ)

Jobs that exhaust all their retries don't just vanish. They move to a separate dead letter queue where they can be inspected and reprocessed manually. Silent data loss is one of the worst things that can happen in an async system — this prevents it.

### Structured logging

Every significant event — job start, retry attempt, success, permanent failure — gets logged with context. When something breaks at 2am, you need logs that tell you *what* failed and *why*, not just that something went wrong.

### Concurrency control

Workers process multiple jobs in parallel using configurable concurrency settings.

- Improves throughput
- Simulates real-world worker pools
- Prevents blocking on long-running jobs

### Retry & failure observability

- Retries tracked using attempt counters
- Separate logging for:
  - initial execution
  - retry attempts
  - final failure
- Prevents confusion between temporary and permanent failures

This was implemented using BullMQ job metadata and worker-level logic.

### Monitoring dashboard

Bull Board runs at `/admin/queues` and gives a live view of all queue states — waiting, active, completed, failed. The dashboard provides real-time visibility into job prioritization and execution.

---

## Project structure

```
src/
├── controllers/    # API layer — receives requests, delegates to services
├── services/       # Business logic + queue interaction
├── queues/         # BullMQ queue setup and configuration
├── workers/        # Job processors — this is where actual work happens
├── models/         # MongoDB schemas for persistent job tracking
└── config/         # Redis, DB, and logger setup
```

## Architecture

- **API Layer (Express)**  
  Stateless service responsible for accepting requests and pushing jobs to the queue

- **Queue Layer (BullMQ + Redis)**  
  Handles job scheduling, prioritization, retries, and state transitions

- **Worker Layer**  
  Independent processes that consume and execute jobs

- **Persistence Layer (MongoDB)**  
  Stores job metadata and lifecycle states for long-term tracking

## Data Flow

```
Client → API (Express) → Service Layer → Queue (BullMQ/Redis)
                                      ↓
                                Worker Processes
                                      ↓
                                MongoDB (Persistence)

```

---

## Getting started

**Prerequisites:** Redis and MongoDB running locally (or via Docker).

```bash
git clone <your-repo-url>
cd job-queue-system
npm install
```

Create a `.env` file:

```
PORT=3000
MONGO_URI=your_mongodb_uri
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

Start the server:

```bash
npm run dev
```

Start a worker (in a separate terminal):

```bash
node workers/worker.js
```

The worker runs independently — that's the point. You can scale workers horizontally without touching the API.

---

## API

### Create a job

```
POST /job
```

```json
{
  "type": "email",
  "payload": {
    "to": "user@test.com",
    "message": "Hello"
  },
  "priority": 1
}
```

### Check job status

```
GET /job/:id
```

### Monitoring dashboard

```
http://localhost:3000/admin/queues
```

---

## Testing scenarios

- Submit a high-priority and low-priority job simultaneously — watch the order they get processed
- Force a job to fail intentionally — watch it retry with increasing delays
- Kill the worker mid-job — restart it and watch the stalled job get requeued
- Flood the queue — see rate limiting keep the worker stable

---

## Limitations

- No distributed deployment yet (single-node worker setup)
- Alerting is minimal (logs only; no Slack/email integration)
- No Prometheus/Grafana metrics yet
- DLQ reprocessing is manual (no UI/API for replay)

These are real limitations, not oversights. I wanted the core system solid before layering on infrastructure.

---

## future improvement

- [ ] Prometheus metrics + Grafana dashboard
- [ ] Alerting system (Slack / email hooks)
- [ ] Delayed and cron-based jobs
- [ ] Multi-worker distributed deployment
- [ ] DLQ reprocessing API/UI
- [ ] Load testing and benchmarking

---