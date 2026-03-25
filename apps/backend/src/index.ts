import "dotenv/config";
import express from "express";
import cors from "cors";
import feedRouter from "./routes/feed";
import searchRouter from "./routes/search";
import digestRouter from "./routes/digest";
import votesRouter from "./routes/votes";
import commentsRouter from "./routes/comments";
import preferencesRouter from "./routes/preferences";
import bookmarksRouter from "./routes/bookmarks";
import sourcesRouter from "./routes/sources";
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
app.use("/search", feedLimiter, searchRouter);
app.use("/digest", feedLimiter, digestRouter);
app.use("/articles", writeLimiter, votesRouter);
app.use("/articles", writeLimiter, commentsRouter);
app.use("/articles", feedLimiter, sourcesRouter);
app.use("/users", writeLimiter, preferencesRouter);
app.use("/users", writeLimiter, bookmarksRouter);

app.listen(PORT, () => {
  console.log(`[Server] Gists backend running on port ${PORT}`);
  startScheduler();
});
