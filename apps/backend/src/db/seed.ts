import "dotenv/config";
import { prisma } from "./client";
import { runPipeline } from "../services/scheduler";

async function main() {
  console.log("[Seed] Running initial content pipeline...");
  await runPipeline();
  console.log("[Seed] Done.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
