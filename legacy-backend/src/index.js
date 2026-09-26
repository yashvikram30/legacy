import "dotenv/config";
import express from "express";
import cors from "cors";
import { serve } from "inngest/express";
import { inngest } from "./inngest/client.js";
import {
  heartbeatCadenceWorkflow,
  contestableClaimWorkflow,
} from "./inngest/functions.js";
import { connectDB } from "./services/db.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Inngest HTTP Handler
app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: [
      heartbeatCadenceWorkflow,
      contestableClaimWorkflow,
    ],
  })
);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "legacy-backend", timestamp: Date.now() });
});

// Direct Event Ingestion webhook (allows frontend or external services to dispatch events to Inngest)
app.post("/api/events", async (req, res) => {
  try {
    const { name, data } = req.body;
    if (!name || !data) {
      return res.status(400).json({ error: "Missing 'name' or 'data' in body" });
    }

    const result = await inngest.send({ name, data });
    return res.json({ success: true, eventId: result.ids?.[0] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(` Legacy Backend Running on port ${PORT}`);
    console.log(` Inngest Endpoint: http://localhost:${PORT}/api/inngest`);
    console.log(` Health Endpoint:  http://localhost:${PORT}/health`);
    console.log(`===============================================`);
  });
}

start();
