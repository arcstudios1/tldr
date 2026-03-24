"use client";

import { useMemo } from "react";
import { Article, Category } from "@/lib/api";

const CATEGORY_CONFIG: { value: Category; label: string; color: string }[] = [
  { value: "TECH", label: "Tech", color: "#60a5fa" },
  { value: "FINANCE", label: "Finance", color: "#34d399" },
  { value: "POLITICS", label: "Politics", color: "#f87171" },
  { value: "CULTURE", label: "Culture", color: "#c084fc" },
];

function formatLastUpdated(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

interface Props {
  articles: Article[];
  selected: Category | null;
  onSelect: (cat: Category | null) => void;
}

export function LeftPanel({ articles, selected, onSelect }: Props) {
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    articles.forEach((a) => {
      c[a.category] = (c[a.category] ?? 0) + 1;
    });
    return c;
  }, [articles]);

  const total = articles.length;

  // Most recent article's publish date as a proxy for last updated
  const lastUpdated = articles.length > 0 ? new Date(articles[0].publishedAt) : null;

  return (
    <div
      className="hidden lg:flex flex-col gap-8 pt-6 pr-8"
      style={{ width: 220, flexShrink: 0 }}
    >
      {/* Wordmark + tagline */}
      <div>
        <div className="wordmark text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          tl;dr
        </div>
        <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          The news. In seconds.
        </div>
      </div>

      {/* Category breakdown */}
      <div>
        <div
          className="text-xs font-semibold tracking-widest mb-4"
          style={{ color: "var(--text-muted)" }}
        >
          TODAY&apos;S STORIES
        </div>
        <div className="flex flex-col gap-4">
          {CATEGORY_CONFIG.map((cat) => {
            const count = counts[cat.value] ?? 0;
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            const isActive = selected === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => onSelect(isActive ? null : cat.value)}
                className="flex flex-col gap-1.5 text-left w-full"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-sm font-medium transition-colors"
                    style={{ color: isActive ? cat.color : "var(--text-secondary)" }}
                  >
                    {cat.label}
                  </span>
                  <span
                    className="text-xs tabular-nums"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {count}
                  </span>
                </div>
                {/* Progress bar */}
                <div
                  className="w-full rounded-full"
                  style={{ height: 2, backgroundColor: "var(--border)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: cat.color,
                      opacity: isActive ? 1 : 0.35,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ backgroundColor: "#22c55e" }}
        />
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {lastUpdated
            ? `Updated ${formatLastUpdated(lastUpdated)}`
            : "Live · Hourly updates"}
        </span>
      </div>
    </div>
  );
}
