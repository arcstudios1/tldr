"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api, Article, DigestResponse } from "@/lib/api";
import { ThemeToggle } from "@/components/ThemeToggle";

const CATEGORY_COLORS: Record<string, string> = {
  TECH: "var(--category-tech)",
  FINANCE: "var(--category-finance)",
  POLITICS: "var(--category-politics)",
  CULTURE: "var(--category-culture)",
  SPORTS: "var(--category-sports)",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function DigestPage() {
  const [digest, setDigest] = useState<DigestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.getDigest()
      .then(setDigest)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg)" }}>
        <DigestNav />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
        </div>
      </div>
    );
  }

  if (error || !digest) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--bg)" }}>
        <DigestNav />
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <p style={{ color: "var(--text-secondary)" }}>Failed to load digest.</p>
          <button onClick={() => window.location.reload()} className="text-sm px-4 py-2 rounded-full" style={{ color: "var(--accent)", border: "1px solid var(--accent)" }}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  const heroArticle = digest.items[0];
  const remainingArticles = digest.items.slice(1);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      <DigestNav />

      <div className="max-w-3xl mx-auto px-6 pt-10 pb-20">
        {/* Digest header */}
        <div className="mb-12" style={{ animation: "fadeInUp 0.5s ease both" }}>
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "var(--accent-dim)", border: "1px solid var(--accent)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent)" }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                Daily Gist
              </h1>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {formatDate(digest.date)}
              </p>
            </div>
          </div>

          {/* Stats bar */}
          <div
            className="flex items-center gap-6 px-5 py-3 rounded-xl"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Gists today</span>
              <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                {digest.stats.totalArticles}
              </span>
            </div>
            <div style={{ width: 1, height: 16, backgroundColor: "var(--border)" }} />
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Sources</span>
              <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                {digest.stats.totalSources}
              </span>
            </div>
            <div style={{ width: 1, height: 16, backgroundColor: "var(--border)" }} />
            <div className="flex items-center gap-2 flex-wrap">
              {digest.stats.categories.map((c) => (
                <span
                  key={c.category}
                  className="text-xs font-semibold px-1.5 py-0.5 rounded"
                  style={{
                    color: CATEGORY_COLORS[c.category],
                    backgroundColor: `${CATEGORY_COLORS[c.category]}18`,
                  }}
                >
                  {c.category} {c.count}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Hero story */}
        {heroArticle && (
          <div className="mb-12" style={{ animation: "fadeInUp 0.5s ease 0.1s both" }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold tracking-widest" style={{ color: "var(--accent)" }}>
                #1 TOP STORY
              </span>
              {heroArticle.sourceCount > 1 && (
                <span className="source-badge">{heroArticle.sourceCount} sources</span>
              )}
            </div>
            <a href={heroArticle.sourceUrl} target="_blank" rel="noopener noreferrer" className="block group">
              <div className="digest-card">
                {heroArticle.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={heroArticle.imageUrl}
                    alt={heroArticle.title}
                    className="w-full object-cover"
                    style={{ height: 280 }}
                  />
                )}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="text-xs font-semibold px-1.5 py-0.5 rounded border"
                      style={{ color: CATEGORY_COLORS[heroArticle.category], borderColor: CATEGORY_COLORS[heroArticle.category] }}
                    >
                      {heroArticle.category}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {heroArticle.sourceName}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      · {formatTimeAgo(new Date(heroArticle.publishedAt))}
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold mb-4 group-hover:underline" style={{ color: "var(--text-primary)", lineHeight: 1.3 }}>
                    {heroArticle.title}
                  </h2>
                  <div className="flex gap-2">
                    <div className="summary-bar" />
                    <div className="flex flex-col gap-1.5">
                      <span className="wordmark text-xs" style={{ color: "var(--accent)" }}>the gist</span>
                      {heroArticle.summary.split("\n").filter(Boolean).map((point, i) => (
                        <div key={i} className="flex gap-1.5 items-start">
                          <span className="shrink-0 mt-1.5" style={{ color: "var(--accent)", fontSize: 6 }}>●</span>
                          <p className="text-base leading-relaxed" style={{ color: "var(--text-primary)" }}>{point}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </a>
          </div>
        )}

        {/* Remaining stories */}
        <div className="flex flex-col gap-6">
          {remainingArticles.map((article, i) => (
            <DigestArticle key={article.id} article={article} rank={i + 2} />
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <Link
            href="/feed"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: "var(--accent)", color: "var(--accent-on)" }}
          >
            Open the full feed →
          </Link>
        </div>
      </div>
    </div>
  );
}

function DigestNav() {
  return (
    <nav
      className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
      style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--nav-bg)", backdropFilter: "blur(12px)" }}
    >
      <Link href="/feed" className="wordmark text-xl font-bold" style={{ color: "var(--text-primary)" }}>
        gists
      </Link>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Link
          href="/feed"
          className="text-sm px-4 py-2 rounded-full transition-colors"
          style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
        >
          ← Feed
        </Link>
      </div>
    </nav>
  );
}

function DigestArticle({ article, rank }: { article: Article; rank: number }) {
  const catColor = CATEGORY_COLORS[article.category] ?? "var(--category-tech)";
  const bullets = article.summary.split("\n").filter(Boolean);

  return (
    <a
      href={article.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block group"
      style={{ animation: `fadeInUp 0.4s ease ${0.05 * rank}s both` }}
    >
      <div className="digest-card flex flex-col sm:flex-row">
        {article.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.imageUrl}
            alt={article.title}
            className="w-full sm:w-48 h-40 sm:h-auto object-cover shrink-0"
          />
        )}
        <div className="flex-1 p-5">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-xs font-bold tabular-nums"
              style={{ color: "var(--text-muted)" }}
            >
              #{rank}
            </span>
            <span
              className="text-xs font-semibold px-1.5 py-0.5 rounded border"
              style={{ color: catColor, borderColor: catColor }}
            >
              {article.category}
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {article.sourceName}
            </span>
            {article.sourceCount > 1 && (
              <span className="source-badge">{article.sourceCount} sources</span>
            )}
          </div>
          <h3 className="font-bold text-lg mb-2 group-hover:underline" style={{ color: "var(--text-primary)", lineHeight: 1.3 }}>
            {article.title}
          </h3>
          <div className="flex flex-col gap-1">
            {bullets.slice(0, 2).map((point, i) => (
              <div key={i} className="flex gap-1.5 items-start">
                <span className="shrink-0 mt-1.5" style={{ color: "var(--accent)", fontSize: 5 }}>●</span>
                <p className="text-sm leading-snug" style={{ color: "var(--text-secondary)" }}>{point}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
            <span>↑ {article.upvotes}</span>
            <span>{article.commentCount} comments</span>
            <span>{formatTimeAgo(new Date(article.publishedAt))}</span>
          </div>
        </div>
      </div>
    </a>
  );
}
