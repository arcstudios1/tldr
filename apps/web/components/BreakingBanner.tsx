"use client";

import { useState, useEffect } from "react";
import { api, Article } from "@/lib/api";

interface Props {
  onSelectArticle: (article: Article) => void;
}

export function BreakingBanner({ onSelectArticle }: Props) {
  const [breakingItems, setBreakingItems] = useState<Article[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    api.getBreaking()
      .then((res) => {
        if (res.count > 0) setBreakingItems(res.items);
      })
      .catch(() => {});

    const interval = setInterval(() => {
      api.getBreaking()
        .then((res) => {
          if (res.count > 0) setBreakingItems(res.items);
        })
        .catch(() => {});
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (breakingItems.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % breakingItems.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [breakingItems.length]);

  if (dismissed || breakingItems.length === 0) return null;

  const current = breakingItems[currentIndex];

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 shrink-0 cursor-pointer transition-colors"
      style={{
        backgroundColor: "#f8717115",
        borderBottom: "1px solid #f8717130",
      }}
      onClick={() => onSelectArticle(current)}
    >
      <div className="flex items-center gap-2 shrink-0">
        <span
          className="inline-block animate-pulse"
          style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#f87171" }}
        />
        <span className="text-xs font-bold tracking-wider" style={{ color: "#f87171" }}>
          BREAKING
        </span>
      </div>
      <p
        className="text-sm flex-1 min-w-0 truncate font-medium"
        style={{ color: "var(--text-primary)" }}
      >
        {current.title}
      </p>
      {breakingItems.length > 1 && (
        <span className="text-xs tabular-nums shrink-0" style={{ color: "#f87171" }}>
          {currentIndex + 1}/{breakingItems.length}
        </span>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); setDismissed(true); }}
        className="text-xs shrink-0 w-5 h-5 rounded flex items-center justify-center"
        style={{ color: "var(--text-muted)" }}
      >
        ×
      </button>
    </div>
  );
}
