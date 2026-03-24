"use client";

import { useState } from "react";
import { Article, api } from "@/lib/api";

const CATEGORY_COLORS: Record<string, string> = {
  TECH: "#60a5fa",
  FINANCE: "#34d399",
  POLITICS: "#f87171",
  CULTURE: "#c084fc",
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
  article: Article;
  userId: string | null;
  email: string | null;
  username: string | null;
  isBookmarked?: boolean;
  cardHeight: number;
}

export function NewsCard({ article, userId, email, username, isBookmarked = false, cardHeight }: Props) {
  const [localVote, setLocalVote] = useState<1 | -1 | 0>(0);
  const [upvotes, setUpvotes] = useState(article.upvotes);
  const [downvotes, setDownvotes] = useState(article.downvotes);
  const [localBookmark, setLocalBookmark] = useState(isBookmarked);

  const categoryColor = CATEGORY_COLORS[article.category] ?? "#60a5fa";
  const timeAgo = formatTimeAgo(new Date(article.publishedAt));
  const imageHeight = Math.round(cardHeight * 0.30);
  const bullets = article.summary.split("\n").filter(Boolean);

  async function handleVote(value: 1 | -1 | 0) {
    if (!userId) return;
    const prev = localVote;
    const next = prev === value ? 0 : value;
    setLocalVote(next);
    // Optimistic update
    setUpvotes(u => u + (next === 1 ? 1 : prev === 1 ? -1 : 0));
    setDownvotes(d => d + (next === -1 ? 1 : prev === -1 ? -1 : 0));
    try {
      await api.vote(article.id, userId, email!, username!, next);
    } catch {
      setLocalVote(prev);
    }
  }

  async function handleBookmark() {
    if (!userId) return;
    const next = !localBookmark;
    setLocalBookmark(next);
    try {
      if (next) await api.addBookmark(article.id, userId, email!, username!);
      else await api.removeBookmark(article.id, userId);
    } catch {
      setLocalBookmark(!next);
    }
  }

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({ title: article.title, url: article.sourceUrl });
    } else {
      await navigator.clipboard.writeText(article.sourceUrl);
    }
  }

  return (
    <div
      className="feed-card flex flex-col"
      style={{
        height: cardHeight,
        backgroundColor: "var(--bg)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Meta row */}
      <div className="flex items-center gap-2 px-5 pt-4 pb-3 shrink-0">
        <span
          className="text-xs font-semibold tracking-wide px-1.5 py-0.5 rounded border"
          style={{ color: categoryColor, borderColor: categoryColor }}
        >
          {article.category}
        </span>
        <span className="text-sm flex-1" style={{ color: "var(--text-secondary)" }}>
          {article.sourceName}
        </span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {timeAgo}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-5 pb-4 gap-3 overflow-hidden">
        {article.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.imageUrl}
            alt={article.title}
            className="w-full rounded-lg object-cover shrink-0"
            style={{ height: imageHeight, backgroundColor: "var(--surface)" }}
          />
        )}

        <h2 className="font-bold leading-tight shrink-0" style={{ fontSize: 20, color: "var(--text-primary)" }}>
          {article.title}
        </h2>

        {/* tl;dr callout */}
        <div className="flex gap-2 shrink-0">
          <div className="summary-bar" />
          <div className="flex flex-col gap-1">
            <span className="wordmark text-xs tracking-wide" style={{ color: "var(--accent)", fontSize: 11 }}>
              tl;dr
            </span>
            {bullets.map((point, i) => (
              <div key={i} className="flex gap-1.5 items-start">
                <span className="shrink-0 mt-1.5" style={{ color: "var(--accent)", fontSize: 6 }}>●</span>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
                  {point}
                </p>
              </div>
            ))}
          </div>
        </div>

        <a
          href={article.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm hover:underline shrink-0"
          style={{ color: "var(--accent)" }}
        >
          Read full story →
        </a>
      </div>

      {/* Action bar */}
      <div
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{ backgroundColor: "var(--bg)" }}
      >
        {/* Vote buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleVote(1)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={{
              backgroundColor: localVote === 1 ? "var(--upvote)" : "var(--surface)",
              color: localVote === 1 ? "#fff" : "var(--text-secondary)",
              border: `1px solid ${localVote === 1 ? "var(--upvote)" : "var(--border)"}`,
            }}
          >
            ↑ {upvotes}
          </button>
          <button
            onClick={() => handleVote(-1)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={{
              backgroundColor: localVote === -1 ? "var(--downvote)" : "var(--surface)",
              color: localVote === -1 ? "#fff" : "var(--text-secondary)",
              border: `1px solid ${localVote === -1 ? "var(--downvote)" : "var(--border)"}`,
            }}
          >
            ↓ {downvotes}
          </button>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleShare}
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
            title="Share"
          >
            ↗
          </button>
          <button
            onClick={handleBookmark}
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors"
            style={{
              backgroundColor: localBookmark ? "var(--accent-dim)" : "var(--surface)",
              border: `1px solid ${localBookmark ? "var(--accent)" : "var(--border)"}`,
              color: localBookmark ? "var(--accent)" : "var(--text-secondary)",
            }}
            title={localBookmark ? "Remove bookmark" : "Bookmark"}
          >
            {localBookmark ? "🔖" : "🏷"}
          </button>
          <div
            className="flex items-center gap-1 px-3 h-8 rounded-full text-xs"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          >
            💬 {article.commentCount}
          </div>
        </div>
      </div>
    </div>
  );
}
