import "dotenv/config";
import express from "express";
import cors from "cors";
import feedRouter from "./routes/feed";
import votesRouter from "./routes/votes";
import commentsRouter from "./routes/comments";
import preferencesRouter from "./routes/preferences";
import bookmarksRouter from "./routes/bookmarks";
import { feedLimiter, writeLimiter } from "./middleware/rateLimiter";
import { startScheduler, runPipeline } from "./services/scheduler";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Manual pipeline trigger — hit this URL to populate articles on demand
app.post("/admin/run-pipeline", async (_req, res) => {
  res.json({ message: "Pipeline started" });
  runPipeline().catch(console.error);
});

app.use("/feed", feedLimiter, feedRouter);
app.use("/articles", writeLimiter, votesRouter);
app.use("/articles", writeLimiter, commentsRouter);
app.use("/users", writeLimiter, preferencesRouter);
app.use("/users", writeLimiter, bookmarksRouter);

app.listen(PORT, () => {
  console.log(`[Server] tl;dr backend running on port ${PORT}`);
  startScheduler();
});
