"use client";

import { Article } from "@/lib/api";

const CATEGORY_COLORS: Record<string, string> = {
  TECH: "#60a5fa",
  FINANCE: "#34d399",
  POLITICS: "#f87171",
  CULTURE: "#c084fc",
  SPORTS: "#fb923c",
};

interface Props {
  trendingArticles: Article[];
  onScrollToArticle: (id: string) => void;
}

export function RightPanel({ trendingArticles, onScrollToArticle }: Props) {
  return (
    <div
      className="hidden lg:flex flex-col gap-0 pt-6 pl-8"
      style={{ width: 240, flexShrink: 0 }}
    >
      <div
        className="text-xs font-semibold tracking-widest mb-4"
        style={{ color: "var(--text-muted)" }}
      >
        TRENDING TODAY
      </div>

      {trendingArticles.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Loading stories…
        </p>
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
                <span
                  className="text-xs font-semibold px-1 py-0.5 rounded self-start"
                  style={{
                    color: CATEGORY_COLORS[article.category],
                    backgroundColor: `${CATEGORY_COLORS[article.category]}18`,
                  }}
                >
                  {article.category}
                </span>
                <span
                  className="text-sm leading-snug line-clamp-2 group-hover:underline"
                  style={{ color: "var(--text-primary)" }}
                >
                  {article.title}
                </span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  ↑ {article.upvotes} · {article.commentCount} comments
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
