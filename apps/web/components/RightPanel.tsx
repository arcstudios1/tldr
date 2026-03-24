"use client";

import { useState, useEffect, useRef } from "react";
import { Article, Comment, api } from "@/lib/api";

const CATEGORY_COLORS: Record<string, string> = {
  TECH: "#60a5fa",
  FINANCE: "#34d399",
  POLITICS: "#f87171",
  CULTURE: "#c084fc",
};

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

interface Props {
  commentsOpen: boolean;
  activeArticle: Article | null;
  trendingArticles: Article[];
  userId: string | null;
  email: string | null;
  username: string | null;
  onClose: () => void;
  onScrollToArticle: (id: string) => void;
}

export function RightPanel({
  commentsOpen,
  activeArticle,
  trendingArticles,
  userId,
  email,
  username,
  onClose,
  onScrollToArticle,
}: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch comments when active article changes while panel is open
  useEffect(() => {
    if (!commentsOpen || !activeArticle) return;
    setComments([]);
    setCommentsLoading(true);
    api
      .getComments(activeArticle.id)
      .then((data) => setComments(data.items))
      .catch(() => {})
      .finally(() => setCommentsLoading(false));
  }, [commentsOpen, activeArticle?.id]);

  async function handlePost() {
    if (!body.trim() || !userId || !activeArticle) return;
    setPosting(true);
    try {
      const comment = await api.postComment(
        activeArticle.id,
        userId,
        email!,
        username!,
        body.trim()
      );
      setComments((prev) => [comment, ...prev]);
      setBody("");
    } catch {
      // silent fail
    } finally {
      setPosting(false);
    }
  }

  return (
    <div
      className="hidden lg:flex flex-col gap-0 pt-6 pl-8"
      style={{ width: 240, flexShrink: 0 }}
    >
      {commentsOpen && activeArticle ? (
        /* ── Comments mode ── */
        <div className="flex flex-col h-full" style={{ maxHeight: "calc(100vh - 48px)" }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-4 shrink-0">
            <span
              className="text-xs font-semibold tracking-widest"
              style={{ color: "var(--text-muted)" }}
            >
              COMMENTS
            </span>
            <button
              onClick={onClose}
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
              }}
            >
              ✕
            </button>
          </div>

          {/* Article title context */}
          <div
            className="text-xs mb-4 leading-snug shrink-0 pb-4"
            style={{
              color: "var(--text-secondary)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {activeArticle.title}
          </div>

          {/* Comment list */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-3 min-h-0 pr-1">
            {commentsLoading ? (
              <div className="flex justify-center pt-6">
                <div
                  className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
                />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-xs pt-4 text-center" style={{ color: "var(--text-muted)" }}>
                No comments yet. Be the first.
              </p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-xs font-semibold"
                      style={{ color: "var(--accent)" }}
                    >
                      {c.user.username}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      · {timeAgo(new Date(c.createdAt))}
                    </span>
                  </div>
                  <p className="text-sm leading-snug" style={{ color: "var(--text-primary)" }}>
                    {c.body}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Comment input */}
          <div
            className="shrink-0 pt-3 mt-3"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            {userId ? (
              <div className="flex flex-col gap-2">
                <textarea
                  ref={inputRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Add a comment…"
                  rows={2}
                  className="w-full resize-none text-sm rounded-lg px-3 py-2 outline-none"
                  style={{
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handlePost();
                  }}
                />
                <button
                  onClick={handlePost}
                  disabled={!body.trim() || posting}
                  className="self-end text-xs px-3 py-1.5 rounded-full font-medium transition-opacity disabled:opacity-40"
                  style={{
                    backgroundColor: "var(--accent)",
                    color: "#000",
                  }}
                >
                  {posting ? "Posting…" : "Post"}
                </button>
              </div>
            ) : (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                <a href="/sign-in" style={{ color: "var(--accent)" }}>
                  Sign in
                </a>{" "}
                to join the conversation.
              </p>
            )}
          </div>
        </div>
      ) : (
        /* ── Trending mode ── */
        <div>
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
      )}
    </div>
  );
}
