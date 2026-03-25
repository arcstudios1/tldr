"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Article, Category } from "@/lib/api";

const CATEGORY_CONFIG: { value: Category; label: string; color: string }[] = [
  { value: "TECH", label: "Tech", color: "var(--category-tech)" },
  { value: "FINANCE", label: "Finance", color: "var(--category-finance)" },
  { value: "POLITICS", label: "Politics", color: "var(--category-politics)" },
  { value: "CULTURE", label: "Culture", color: "var(--category-culture)" },
  { value: "SPORTS", label: "Sports", color: "var(--category-sports)" },
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

  const uniqueSources = useMemo(() => {
    const sources = new Set<string>();
    articles.forEach((a) => sources.add(a.sourceName));
    return sources.size;
  }, [articles]);

  const multiSourceCount = useMemo(
    () => articles.filter((a) => a.sourceCount > 1).length,
    [articles]
  );

  const lastUpdated = articles.length > 0 ? new Date(articles[0].publishedAt) : null;

  return (
    <div
      className="hidden lg:flex flex-col gap-6 pt-6 pr-8"
      style={{ width: 220, flexShrink: 0 }}
    >
      {/* Wordmark + tagline */}
      <div>
        <div className="wordmark text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          gists
        </div>
        <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          The news. In seconds.
        </div>
      </div>

      {/* Feed transparency stats */}
      {total > 0 && (
        <div
          className="flex flex-col gap-2 px-3 py-3 rounded-xl"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Gists</span>
            <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{total}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Sources</span>
            <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{uniqueSources}</span>
          </div>
          {multiSourceCount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Multi-source</span>
              <span className="text-xs font-semibold tabular-nums" style={{ color: "var(--accent)" }}>{multiSourceCount}</span>
            </div>
          )}
        </div>
      )}

      {/* Category breakdown */}
      <div>
        <div
          className="text-xs font-semibold tracking-widest mb-4"
          style={{ color: "var(--text-muted)" }}
        >
          TODAY&apos;S GISTS
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

      {/* Quick links */}
      <div className="flex flex-col gap-2">
        <Link
          href="/digest"
          className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg transition-colors"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          Daily Gist
        </Link>
        <Link
          href="/referral"
          className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg transition-colors"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
          Invite Friends
        </Link>
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
