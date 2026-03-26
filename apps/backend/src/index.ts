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
import marketsRouter from "./routes/markets";
import referralsRouter from "./routes/referrals";
import submissionsRouter from "./routes/submissions";
import breakingRouter from "./routes/breaking";
import { feedLimiter, writeLimiter } from "./middleware/rateLimiter";
import { adminAuth } from "./middleware/adminAuth";
import { requireAuth } from "./middleware/requireAuth";
import { startScheduler, runPipeline } from "./services/scheduler";

const app = express();
const PORT = process.env.PORT ?? 3001;

// Trust Railway/Vercel reverse proxy so rate limiter sees real client IPs
app.set("trust proxy", 1);

// CORS — restrict to known frontend origins in production
const ALLOWED_ORIGINS = [
  "https://gists.news",
  "https://www.gists.news",
  "https://tldr-blue.vercel.app",
  // Allow any *.vercel.app preview deploy
  /^https:\/\/tldr.*\.vercel\.app$/,
  // Local development
  "http://localhost:3000",
  "http://localhost:19006",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server / curl (no origin header)
      if (!origin) return callback(null, true);
      const allowed = ALLOWED_ORIGINS.some((o) =>
        typeof o === "string" ? o === origin : o.test(origin)
      );
      if (allowed) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Admin endpoints — require ADMIN_SECRET header
app.post("/admin/run-pipeline", adminAuth, async (_req, res) => {
  res.json({ message: "Pipeline started" });
  runPipeline().catch(console.error);
});

app.post("/admin/run-markets", adminAuth, async (_req, res) => {
  res.json({ message: "Markets sync started" });
  import("./services/predictionMarkets").then(({ syncPredictionMarkets }) =>
    syncPredictionMarkets().catch(console.error)
  );
});

// Public read routes
app.use("/feed", feedLimiter, feedRouter);
app.use("/search", feedLimiter, searchRouter);
app.use("/digest", feedLimiter, digestRouter);
app.use("/articles", feedLimiter, sourcesRouter);
app.use("/markets", feedLimiter, marketsRouter);
app.use("/breaking", feedLimiter, breakingRouter);

// Authenticated write routes — JWT required
app.use("/articles", writeLimiter, requireAuth, votesRouter);
app.use("/articles", writeLimiter, requireAuth, commentsRouter);
app.use("/users", writeLimiter, requireAuth, preferencesRouter);
app.use("/users", writeLimiter, requireAuth, bookmarksRouter);
app.use("/users", writeLimiter, requireAuth, referralsRouter);
app.use("/gists", writeLimiter, requireAuth, submissionsRouter);

app.listen(PORT, () => {
  console.log(`[Server] Gists backend running on port ${PORT}`);
  startScheduler();
});
