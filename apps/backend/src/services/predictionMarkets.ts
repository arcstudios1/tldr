import { prisma } from "../db/client";
import { Category } from "@prisma/client";

interface PolymarketEvent {
  id: string;
  title: string;
  slug: string;
  image: string;
  volume: number;
  endDate: string;
  markets: {
    id: string;
    question: string;
    outcomePrices: string;
    volume: number;
    endDate: string;
    active: boolean;
  }[];
}

interface KalshiMarket {
  ticker: string;
  title: string;
  category: string;
  yes_ask: number;
  volume: number;
  close_time: string;
  status: string;
  url: string;
}

const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  POLITICS: ["election", "president", "congress", "senate", "trump", "biden", "democrat", "republican", "vote", "impeach", "policy", "government", "political", "nominee", "cabinet", "supreme court", "legislation"],
  FINANCE: ["stock", "bitcoin", "crypto", "fed", "interest rate", "gdp", "inflation", "recession", "market", "s&p", "nasdaq", "dow", "treasury", "earnings", "ipo", "economy"],
  TECH: ["ai", "openai", "google", "apple", "meta", "tesla", "spacex", "launch", "chip", "semiconductor", "software", "startup", "silicon valley", "tech"],
  SPORTS: ["nfl", "nba", "mlb", "super bowl", "championship", "playoffs", "world cup", "olympics", "mvp", "draft", "trade", "season", "game", "match", "winner"],
  CULTURE: ["oscar", "grammy", "movie", "film", "album", "celebrity", "award", "entertainment", "music", "streaming"],
};

function classifyMarket(question: string): Category {
  const q = question.toLowerCase();
  let best: Category = "POLITICS";
  let bestScore = 0;

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.filter((kw) => q.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      best = cat as Category;
    }
  }

  return best;
}

async function fetchPolymarket(): Promise<void> {
  try {
    const res = await fetch(
      "https://gamma-api.polymarket.com/events?closed=false&limit=30&active=true&order=volume&ascending=false",
      { headers: { "User-Agent": "gists-bot/1.0" } }
    );

    if (!res.ok) {
      console.warn(`[PredictionMarkets] Polymarket responded ${res.status}`);
      return;
    }

    const events = (await res.json()) as PolymarketEvent[];

    // For multi-outcome events (e.g. "2028 Presidential Nominee"), use the event
    // as a single market entry rather than iterating each outcome individually.
    for (const event of events) {
      const hasMultipleMarkets = event.markets.length > 1;

      if (hasMultipleMarkets) {
        // Represent the whole event as one market — use event-level volume
        const externalId = `poly_event_${event.id}`;
        const category = classifyMarket(event.title);
        const eventVolume = event.volume || 0;

        // Find the leading outcome (highest yes price)
        let leadPrice = 0.5;
        let leadQuestion = event.title;
        for (const m of event.markets) {
          try {
            const prices = JSON.parse(m.outcomePrices);
            const p = parseFloat(prices[0]) || 0;
            if (p > leadPrice) { leadPrice = p; leadQuestion = m.question; }
          } catch { /* keep default */ }
        }

        await prisma.predictionMarket.upsert({
          where: { externalId },
          create: {
            externalId,
            platform: "polymarket",
            question: event.title,
            category,
            yesPrice: leadPrice,
            volume: eventVolume,
            url: `https://polymarket.com/event/${event.slug}`,
            affiliateUrl: `https://polymarket.com/event/${event.slug}`,
            imageUrl: event.image || null,
            endDate: event.endDate ? new Date(event.endDate) : null,
            lastUpdated: new Date(),
          },
          update: { yesPrice: leadPrice, volume: eventVolume, lastUpdated: new Date() },
        });
      } else {
        // Single binary market — store as-is
        const market = event.markets[0];
        if (!market || !market.active) continue;

        let yesPrice = 0.5;
        try {
          const prices = JSON.parse(market.outcomePrices);
          yesPrice = parseFloat(prices[0]) || 0.5;
        } catch { /* default */ }

        const category = classifyMarket(event.title);
        const externalId = `poly_${market.id}`;
        const eventVolume = event.volume || market.volume || 0;

        await prisma.predictionMarket.upsert({
          where: { externalId },
          create: {
            externalId,
            platform: "polymarket",
            question: event.title,
            category,
            yesPrice,
            volume: eventVolume,
            url: `https://polymarket.com/event/${event.slug}`,
            affiliateUrl: `https://polymarket.com/event/${event.slug}`,
            imageUrl: event.image || null,
            endDate: market.endDate ? new Date(market.endDate) : null,
            lastUpdated: new Date(),
          },
          update: { yesPrice, volume: eventVolume, lastUpdated: new Date() },
        });
      }
    }

    console.log(`[PredictionMarkets] Polymarket: synced ${events.length} events`);
  } catch (err) {
    console.error("[PredictionMarkets] Polymarket fetch failed:", err);
  }
}

async function fetchKalshi(): Promise<void> {
  // Kalshi's public read API requires authentication as of 2024.
  // Skip silently — Polymarket alone covers all categories well.
  console.log("[PredictionMarkets] Kalshi: skipped (auth required for public API)");
}

export async function syncPredictionMarkets(): Promise<void> {
  console.log("[PredictionMarkets] Syncing...");
  await Promise.allSettled([fetchPolymarket(), fetchKalshi()]);

  // Prune markets that closed more than 7 days ago
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const deleted = await prisma.predictionMarket.deleteMany({
    where: { endDate: { lt: cutoff } },
  });
  if (deleted.count > 0) {
    console.log(`[PredictionMarkets] Pruned ${deleted.count} expired markets`);
  }
}
