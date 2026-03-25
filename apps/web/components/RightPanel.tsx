"use client";

import { Article } from "@/lib/api";

const CATEGORY_COLORS: Record<string, string> = {
  TECH: "#60a5fa",
  FINANCE: "#34d399",
  POLITICS: "#f87171",
  CULTURE: "#c084fc",
  SPORTS: "#fb923c",
};

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

interface Props {
  trendingArticles: Article[];
  onScrollToArticle: (id: string) => void;
}

export function RightPanel({ trendingArticles, onScrollToArticle }: Props) {
  return (
    <div
      className="hidden lg:flex flex-col gap-0 pt-6 pl-8"
      style={{ width: 260, flexShrink: 0 }}
    >
      <div
        className="text-xs font-semibold tracking-widest mb-4"
        style={{ color: "var(--text-muted)" }}
      >
        TRENDING GISTS
      </div>

      {trendingArticles.length === 0 ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-3 items-start">
              <div className="skeleton" style={{ width: 14, height: 14, borderRadius: 4, flexShrink: 0, marginTop: 2 }} />
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="skeleton" style={{ width: 48, height: 16, borderRadius: 4 }} />
                <div className="skeleton skeleton-text w-full" />
                <div className="skeleton skeleton-text w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {trendingArticles.map((article, i) => (
            <button
              key={article.id}
              onClick={() => onScrollToArticle(article.id)}
              className="flex gap-3 items-start text-left group w-full"
            >
              <span
                className="text-xs font-bold tabular-nums mt-0.5 shrink-0"
                style={{ color: "var(--text-muted)", width: 14 }}
              >
                {i + 1}
              </span>
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className="text-xs font-semibold px-1 py-0.5 rounded self-start"
                    style={{
                      color: CATEGORY_COLORS[article.category],
                      backgroundColor: `${CATEGORY_COLORS[article.category]}18`,
                    }}
                  >
                    {article.category}
                  </span>
                  {article.sourceCount > 1 && (
                    <span className="source-badge">
                      {article.sourceCount} sources
                    </span>
                  )}
                </div>
                <span
                  className="text-sm leading-snug line-clamp-2 group-hover:underline"
                  style={{ color: "var(--text-primary)" }}
                >
                  {article.title}
                </span>
                <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                  <span>↑ {article.upvotes}</span>
                  <span>·</span>
                  <span>{article.commentCount} comments</span>
                  <span>·</span>
                  <span>{formatTimeAgo(new Date(article.publishedAt))}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      <div
        className="mt-8 px-3 py-3 rounded-xl"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div
          className="text-xs font-semibold tracking-widest mb-3"
          style={{ color: "var(--text-muted)" }}
        >
          SHORTCUTS
        </div>
        <div className="flex flex-col gap-2">
          {[
            { keys: ["j", "k"], label: "Navigate gists" },
            { keys: ["/"], label: "Search" },
            { keys: ["b"], label: "Bookmark" },
            { keys: ["o"], label: "Open source" },
          ].map((shortcut) => (
            <div key={shortcut.label} className="flex items-center justify-between">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{shortcut.label}</span>
              <div className="flex items-center gap-1">
                {shortcut.keys.map((key) => (
                  <span key={key} className="kbd">{key}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
