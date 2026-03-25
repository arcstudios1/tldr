import { prisma } from "../db/client";
import { Category } from "@prisma/client";

interface PolymarketEvent {
  id: string;
  title: string;
  slug: string;
  image: string;
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
      "https://gamma-api.polymarket.com/events?closed=false&limit=25&active=true&order=volume",
      { headers: { "User-Agent": "gists-bot/1.0" } }
    );

    if (!res.ok) {
      console.warn(`[PredictionMarkets] Polymarket responded ${res.status}`);
      return;
    }

    const events = (await res.json()) as PolymarketEvent[];

    for (const event of events) {
      for (const market of event.markets) {
        if (!market.active) continue;

        let yesPrice = 0.5;
        try {
          const prices = JSON.parse(market.outcomePrices);
          yesPrice = parseFloat(prices[0]) || 0.5;
        } catch { /* default */ }

        const category = classifyMarket(market.question || event.title);
        const externalId = `poly_${market.id}`;

        await prisma.predictionMarket.upsert({
          where: { externalId },
          create: {
            externalId,
            platform: "polymarket",
            question: market.question || event.title,
            category,
            yesPrice,
            volume: market.volume || 0,
            url: `https://polymarket.com/event/${event.slug}`,
            affiliateUrl: `https://polymarket.com/event/${event.slug}`,
            imageUrl: event.image || null,
            endDate: market.endDate ? new Date(market.endDate) : null,
            lastUpdated: new Date(),
          },
          update: {
            yesPrice,
            volume: market.volume || 0,
            lastUpdated: new Date(),
          },
        });
      }
    }

    console.log(`[PredictionMarkets] Polymarket: synced ${events.length} events`);
  } catch (err) {
    console.error("[PredictionMarkets] Polymarket fetch failed:", err);
  }
}

async function fetchKalshi(): Promise<void> {
  try {
    const res = await fetch(
      "https://api.elections.kalshi.com/trade-api/v2/markets?limit=25&status=open",
      { headers: { "User-Agent": "gists-bot/1.0", Accept: "application/json" } }
    );

    if (!res.ok) {
      console.warn(`[PredictionMarkets] Kalshi responded ${res.status}`);
      return;
    }

    const data = (await res.json()) as { markets?: KalshiMarket[] };
    const markets: KalshiMarket[] = data.markets ?? [];

    for (const market of markets) {
      if (market.status !== "open") continue;

      const category = classifyMarket(market.title);
      const externalId = `kalshi_${market.ticker}`;

      await prisma.predictionMarket.upsert({
        where: { externalId },
        create: {
          externalId,
          platform: "kalshi",
          question: market.title,
          category,
          yesPrice: market.yes_ask ?? 0.5,
          volume: market.volume ?? 0,
          url: `https://kalshi.com/markets/${market.ticker}`,
          affiliateUrl: `https://kalshi.com/markets/${market.ticker}`,
          endDate: market.close_time ? new Date(market.close_time) : null,
          lastUpdated: new Date(),
        },
        update: {
          yesPrice: market.yes_ask ?? 0.5,
          volume: market.volume ?? 0,
          lastUpdated: new Date(),
        },
      });
    }

    console.log(`[PredictionMarkets] Kalshi: synced ${markets.length} markets`);
  } catch (err) {
    console.error("[PredictionMarkets] Kalshi fetch failed:", err);
  }
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
