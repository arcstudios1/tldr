"use client";

import { useState, useEffect, useRef } from "react";
import { Article, Comment, api } from "@/lib/api";

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
  article: Article;
  userId: string | null;
  email: string | null;
  username: string | null;
  isBookmarked?: boolean;
  cardHeight: number;
}

export function NewsCard({ article, userId, email, username, isBookmarked = false, cardHeight }: Props) {
  const [localVote, setLocalVote] = useState<1 | -1 | 0>((article.userVote as 1 | -1 | 0) ?? 0);
  const [upvotes, setUpvotes] = useState(article.upvotes);
  const [downvotes, setDownvotes] = useState(article.downvotes);
  const [localBookmark, setLocalBookmark] = useState(isBookmarked);
  const [isVoting, setIsVoting] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsFetched, setCommentsFetched] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState(false);
  const [localCommentCount, setLocalCommentCount] = useState(article.commentCount);

  const cardRef = useRef<HTMLDivElement>(null);
  const composeRef = useRef<HTMLInputElement>(null);

  // Reset all local state when a new article occupies this card slot
  useEffect(() => {
    setLocalVote((article.userVote as 1 | -1 | 0) ?? 0);
    setUpvotes(article.upvotes);
    setDownvotes(article.downvotes);
    setLocalCommentCount(article.commentCount);
    setComments([]);
    setCommentBody("");
    setPostError(false);
    setCommentsFetched(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.id]);

  // Sync bookmark when parent finishes loading
  useEffect(() => {
    setLocalBookmark(isBookmarked);
  }, [isBookmarked]);

  // Lazy-load comments when card scrolls into view (avoids N requests on mount)
  useEffect(() => {
    if (commentsFetched) return;
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCommentsFetched(true);
          setCommentsLoading(true);
          api.getComments(article.id)
            .then((data) => setComments(data.items))
            .catch(() => {})
            .finally(() => setCommentsLoading(false));
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.id, commentsFetched]);

  const categoryColor = CATEGORY_COLORS[article.category] ?? "#60a5fa";
  const timeAgo = formatTimeAgo(new Date(article.publishedAt));
  const imageHeight = Math.round(cardHeight * 0.17);
  const bullets = article.summary.split("\n").filter(Boolean);
  const effectiveUsername = username || email?.split("@")[0] || "user";
  const visibleComments = comments.slice(0, 3);
  const hiddenCount = comments.length > 3 ? comments.length - 3 : 0;

  async function handleVote(value: 1 | -1) {
    if (!userId || !email || isVoting) return;
    const prev = localVote;
    const next = prev === value ? 0 : value;
    setIsVoting(true);
    setLocalVote(next);
    setUpvotes(u => u + (next === 1 ? 1 : prev === 1 ? -1 : 0));
    setDownvotes(d => d + (next === -1 ? 1 : prev === -1 ? -1 : 0));
    try {
      const result = await api.vote(article.id, userId, email!, effectiveUsername, next);
      setUpvotes(result.upvotes);
      setDownvotes(result.downvotes);
    } catch (err) {
      console.error("[Vote] failed:", err);
      setLocalVote(prev);
      setUpvotes(article.upvotes);
      setDownvotes(article.downvotes);
    } finally {
      setIsVoting(false);
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

  async function handlePost() {
    if (!commentBody.trim() || !userId || posting) return;
    setPosting(true);
    setPostError(false);
    try {
      const comment = await api.postComment(article.id, userId, email!, effectiveUsername, commentBody.trim());
      setComments((prev) => [comment, ...prev]);
      setCommentBody("");
      setLocalCommentCount((c) => c + 1);
    } catch {
      setPostError(true);
    } finally {
      setPosting(false);
    }
  }

  return (
    <div
      ref={cardRef}
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

      {/* Body: article content (top) + comments (bottom), 50/50 split */}
      <div className="flex-1 flex flex-col min-h-0">

        {/* ── Article content ── */}
        <div className="flex-1 flex flex-col px-5 pb-3 gap-2 overflow-hidden min-h-0">
          {article.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={article.imageUrl}
              alt={article.title}
              className="w-full rounded-lg object-cover shrink-0"
              style={{ height: imageHeight, backgroundColor: "var(--surface)" }}
            />
          ) : (
            <div
              className="w-full rounded-lg shrink-0 flex items-center justify-center"
              style={{ height: imageHeight, backgroundColor: "#0a0a0a", border: "1px solid var(--border)" }}
            >
              <span className="wordmark font-bold" style={{ color: "var(--border)", fontSize: 20 }}>tl;dr</span>
            </div>
          )}

          <h2
            className="font-bold leading-tight shrink-0"
            style={{ fontSize: 22, color: "var(--text-primary)", lineHeight: 1.25 }}
          >
            {article.title}
          </h2>

          <div className="flex gap-2 shrink-0">
            <div className="summary-bar" />
            <div className="flex flex-col gap-1">
              <span className="wordmark text-xs tracking-wide" style={{ color: "var(--accent)", fontSize: 11 }}>
                tl;dr
              </span>
              {bullets.map((point, i) => (
                <div key={i} className="flex gap-1.5 items-start">
                  <span className="shrink-0 mt-1" style={{ color: "var(--accent)", fontSize: 6 }}>●</span>
                  <p className="leading-snug" style={{ fontSize: 15, color: "var(--text-primary)" }}>
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

        {/* ── Divider ── */}
        <div className="shrink-0 mx-5" style={{ height: 1, backgroundColor: "var(--border)" }} />

        {/* ── Comments section ── */}
        <div className="flex-1 flex flex-col px-5 pt-3 pb-2 min-h-0">

          {/* Section label */}
          <div className="flex items-center justify-between mb-2 shrink-0">
            <span className="text-xs font-semibold tracking-widest" style={{ color: "var(--text-muted)" }}>
              DISCUSSION
            </span>
            {localCommentCount > 0 && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {localCommentCount} {localCommentCount === 1 ? "comment" : "comments"}
              </span>
            )}
          </div>

          {/* Comment list */}
          <div className="flex-1 flex flex-col gap-2 overflow-hidden min-h-0">
            {commentsLoading ? (
              <div className="flex justify-center pt-3">
                <div
                  className="w-3.5 h-3.5 rounded-full border-2 animate-spin"
                  style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
                />
              </div>
            ) : visibleComments.length === 0 ? (
              <p className="text-xs pt-1" style={{ color: "var(--text-muted)" }}>
                No comments yet — be the first.
              </p>
            ) : (
              <>
                {visibleComments.map((c) => (
                  <div key={c.id} className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
                        {c.user.username}
                      </span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        · {formatTimeAgo(new Date(c.createdAt))}
                      </span>
                    </div>
                    <p className="text-sm leading-snug" style={{ color: "var(--text-primary)" }}>
                      {c.body}
                    </p>
                  </div>
                ))}
                {hiddenCount > 0 && (
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    +{hiddenCount} more comment{hiddenCount > 1 ? "s" : ""}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Compose row */}
          <div className="shrink-0 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
            {userId ? (
              <>
                <div className="flex gap-2 items-center pt-1">
                  <input
                    ref={composeRef}
                    type="text"
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    placeholder="Add a comment…"
                    className="flex-1 text-sm px-3 py-1.5 rounded-lg outline-none min-w-0"
                    style={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                    }}
                    onKeyDown={(e) => { if (e.key === "Enter") handlePost(); }}
                  />
                  <button
                    onClick={handlePost}
                    disabled={!commentBody.trim() || posting}
                    className="shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity disabled:opacity-40"
                    style={{ backgroundColor: "var(--accent)", color: "#000" }}
                  >
                    {posting ? "…" : "Post"}
                  </button>
                </div>
                {postError && (
                  <p className="text-xs mt-1" style={{ color: "#f87171" }}>Failed to post. Try again.</p>
                )}
              </>
            ) : (
              <p className="text-xs pt-1" style={{ color: "var(--text-muted)" }}>
                <a href="/sign-in" style={{ color: "var(--accent)" }}>Sign in</a> to join the discussion.
              </p>
            )}
          </div>
        </div>

      </div>{/* end body */}

      {/* Action bar */}
      <div
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{ borderTop: "1px solid var(--border)", backgroundColor: "var(--bg)" }}
      >
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleVote(1)}
            disabled={isVoting}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors disabled:cursor-not-allowed"
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
            disabled={isVoting}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors disabled:cursor-not-allowed"
            style={{
              backgroundColor: localVote === -1 ? "var(--downvote)" : "var(--surface)",
              color: localVote === -1 ? "#fff" : "var(--text-secondary)",
              border: `1px solid ${localVote === -1 ? "var(--downvote)" : "var(--border)"}`,
            }}
          >
            ↓ {downvotes}
          </button>
        </div>

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
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{
              backgroundColor: localBookmark ? "var(--accent-dim)" : "var(--surface)",
              border: `1px solid ${localBookmark ? "var(--accent)" : "var(--border)"}`,
              color: localBookmark ? "var(--accent)" : "var(--text-secondary)",
            }}
            title={localBookmark ? "Remove bookmark" : "Bookmark"}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={localBookmark ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
          {/* Comment button focuses the compose input */}
          <button
            onClick={() => composeRef.current?.focus()}
            className="flex items-center gap-1.5 px-3 h-8 rounded-full text-xs transition-colors"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
            </svg>
            {localCommentCount}
          </button>
        </div>
      </div>
    </div>
  );
}
