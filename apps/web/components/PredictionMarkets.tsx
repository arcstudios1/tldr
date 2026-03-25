"use client";

import { useState, useEffect } from "react";
import { api, PredictionMarket, Category } from "@/lib/api";

const CATEGORY_COLORS: Record<string, string> = {
  TECH: "var(--category-tech)",
  FINANCE: "var(--category-finance)",
  POLITICS: "var(--category-politics)",
  CULTURE: "var(--category-culture)",
  SPORTS: "var(--category-sports)",
};

function formatPercent(price: number): string {
  return `${Math.round(price * 100)}%`;
}

function formatVolume(vol: number): string {
  if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `$${(vol / 1_000).toFixed(0)}K`;
  return `$${vol.toFixed(0)}`;
}

function PlatformIcon({ platform }: { platform: string }) {
  if (platform === "polymarket") {
    return (
      <div
        className="w-4 h-4 rounded flex items-center justify-center text-xs font-bold shrink-0"
        style={{ backgroundColor: "#5B48F2", color: "#fff", fontSize: 8 }}
      >
        P
      </div>
    );
  }
  return (
    <div
      className="w-4 h-4 rounded flex items-center justify-center text-xs font-bold shrink-0"
      style={{ backgroundColor: "#00D26A", color: "#000", fontSize: 8 }}
    >
      K
    </div>
  );
}

interface Props {
  category?: Category;
}

export function PredictionMarkets({ category }: Props) {
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getMarkets(category)
      .then((res) => setMarkets(res.items))
      .catch(() => setMarkets([]))
      .finally(() => setLoading(false));
  }, [category]);

  if (loading) {
    return (
      <div className="mt-6">
        <div className="text-xs font-semibold tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>
          PREDICTION MARKETS
        </div>
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 52, borderRadius: 12 }} />
          ))}
        </div>
      </div>
    );
  }

  if (markets.length === 0) return null;

  const visible = expanded ? markets : markets.slice(0, 3);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold tracking-widest" style={{ color: "var(--text-muted)" }}>
          PREDICTION MARKETS
        </div>
        <div className="flex items-center gap-1">
          <PlatformIcon platform="polymarket" />
          <PlatformIcon platform="kalshi" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {visible.map((market) => {
          const catColor = CATEGORY_COLORS[market.category] ?? "var(--category-tech)";
          const percent = formatPercent(market.yesPrice);
          const isHigh = market.yesPrice >= 0.7;
          const isLow = market.yesPrice <= 0.3;

          return (
            <a
              key={market.id}
              href={market.affiliateUrl || market.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <PlatformIcon platform={market.platform} />
              <div className="flex-1 min-w-0">
                <p
                  className="text-xs leading-snug line-clamp-2 group-hover:underline"
                  style={{ color: "var(--text-primary)" }}
                >
                  {market.question}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs" style={{ color: catColor }}>
                    {market.category}
                  </span>
                  {market.volume > 0 && (
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {formatVolume(market.volume)} vol
                    </span>
                  )}
                </div>
              </div>
              <div
                className="text-sm font-bold tabular-nums shrink-0"
                style={{
                  color: isHigh ? "#34d399" : isLow ? "#f87171" : "var(--text-primary)",
                }}
              >
                {percent}
              </div>
            </a>
          );
        })}
      </div>

      {markets.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs mt-2 hover:underline"
          style={{ color: "var(--text-muted)" }}
        >
          {expanded ? "Show less" : `Show ${markets.length - 3} more`}
        </button>
      )}
    </div>
  );
}
