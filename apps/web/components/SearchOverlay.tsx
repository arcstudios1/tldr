"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Article, api } from "@/lib/api";

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
  onClose: () => void;
  onSelectArticle?: (article: Article) => void;
  isAuthenticated?: boolean;
}

export function SearchOverlay({ onClose, onSelectArticle, isAuthenticated = false }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.search(q.trim());
      setResults(res.items);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
    >
      {/* Search bar */}
      <div
        className="animate-slide-down shrink-0"
        style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg)" }}
      >
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Search gists, topics, sources…"
            className="flex-1 bg-transparent text-lg outline-none"
            style={{ color: "var(--text-primary)" }}
          />
          <button
            onClick={onClose}
            className="shrink-0 text-xs px-3 py-1.5 rounded-full"
            style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
          >
            <span className="kbd">esc</span>
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
        <div className="max-w-2xl mx-auto px-5 py-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div
                className="w-5 h-5 rounded-full border-2 animate-spin"
                style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
              />
            </div>
          ) : !searched ? (
            <div className="text-center py-12">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Type to search across all gists
              </p>
              <div className="flex items-center justify-center gap-4 mt-4">
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                  <span className="kbd">↑</span><span className="kbd">↓</span> Navigate
                </div>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                  <span className="kbd">Enter</span> Open
                </div>
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                  <span className="kbd">Esc</span> Close
                </div>
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                No results for &ldquo;{query}&rdquo;
              </p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Try a different search term or browse by category
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                {results.length} result{results.length !== 1 ? "s" : ""}
              </p>
              {(isAuthenticated ? results : results.slice(0, 2)).map((article) => {
                const catColor = CATEGORY_COLORS[article.category] ?? "#60a5fa";
                return (
                  <button
                    key={article.id}
                    onClick={() => onSelectArticle?.(article)}
                    className="flex gap-4 items-start text-left w-full p-4 rounded-xl transition-colors"
                    style={{ backgroundColor: "transparent" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--surface)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    {article.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={article.imageUrl}
                        alt=""
                        className="w-16 h-16 rounded-lg object-cover shrink-0"
                        style={{ backgroundColor: "var(--surface)" }}
                      />
                    ) : (
                      <div
                        className="w-16 h-16 rounded-lg shrink-0 flex items-center justify-center"
                        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
                      >
                        <span className="wordmark text-xs" style={{ color: "var(--border)" }}>gists</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-xs font-semibold px-1 py-0.5 rounded"
                          style={{ color: catColor, backgroundColor: `${catColor}18` }}
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
                      <h3 className="font-semibold text-sm leading-snug line-clamp-2 mb-1" style={{ color: "var(--text-primary)" }}>
                        {article.title}
                      </h3>
                      <p className="text-xs line-clamp-1" style={{ color: "var(--text-muted)" }}>
                        {formatTimeAgo(new Date(article.publishedAt))} · ↑ {article.upvotes} · {article.commentCount} comments
                      </p>
                    </div>
                  </button>
                );
              })}

              {!isAuthenticated && results.length > 2 && (
                <div className="mt-4 text-center py-8 px-6 rounded-xl" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
                  <p className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>
                    Sign in to see all {results.length} results
                  </p>
                  <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                    Create a free account to unlock full search across every gist.
                  </p>
                  <a
                    href="/sign-up"
                    className="inline-block px-5 py-2 rounded-full text-sm font-semibold"
                    style={{ backgroundColor: "var(--accent)", color: "#000" }}
                  >
                    Create free account
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
