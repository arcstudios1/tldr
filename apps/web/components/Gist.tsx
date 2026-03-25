"use client";

import { useState, useEffect, useRef } from "react";
import { Article, Comment, GistSource, PredictionMarket, api } from "@/lib/api";

const CATEGORY_COLORS: Record<string, string> = {
  TECH: "var(--category-tech)",
  FINANCE: "var(--category-finance)",
  POLITICS: "var(--category-politics)",
  CULTURE: "var(--category-culture)",
  SPORTS: "var(--category-sports)",
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

function getGistReadTime(): string {
  return "30 sec";
}

function getFreshnessTag(publishedAt: string, feedScore: number): "breaking" | "new" | null {
  const hoursOld = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60);
  if (hoursOld <= 2 && feedScore > 1.5) return "breaking";
  if (hoursOld <= 4) return "new";
  return null;
}

interface Props {
  article: Article;
  userId: string | null;
  email: string | null;
  username: string | null;
  isBookmarked?: boolean;
  cardHeight: number;
  isActive?: boolean;
  isRead?: boolean;
}

export function GistSkeleton({ cardHeight }: { cardHeight: number }) {
  const showComments = cardHeight >= 640;
  const imageH = Math.round(cardHeight * (cardHeight >= 640 ? 0.22 : cardHeight >= 520 ? 0.18 : 0.15));
  return (
    <div
      className="feed-card flex flex-col"
      style={{ height: cardHeight, backgroundColor: "var(--bg)", borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-2 px-5 pt-4 pb-3 shrink-0">
        <div className="skeleton" style={{ width: 56, height: 20 }} />
        <div className="skeleton flex-1" style={{ height: 14 }} />
        <div className="skeleton" style={{ width: 40, height: 14 }} />
      </div>
      <div className="flex-1 flex flex-col px-5 pb-3 gap-3" style={{ flex: "7 1 0" }}>
        <div className="skeleton w-full rounded-lg shrink-0" style={{ height: imageH }} />
        <div className="skeleton skeleton-text-lg w-4/5" />
        <div className="skeleton skeleton-text-lg w-3/5" />
        <div className="flex flex-col gap-2 mt-1">
          <div className="skeleton skeleton-text w-full" />
          <div className="skeleton skeleton-text w-11/12" />
          <div className="skeleton skeleton-text w-4/5" />
        </div>
      </div>
      {showComments && <div className="shrink-0 mx-5" style={{ height: 1, backgroundColor: "var(--border)" }} />}
      {showComments && <div className="px-5 pt-3 pb-2" style={{ flex: "3 1 0" }}>
        <div className="skeleton skeleton-text w-1/3 mb-3" />
        <div className="skeleton skeleton-text w-full mb-2" />
        <div className="skeleton skeleton-text w-2/3" />
      </div>}
      <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="flex items-center gap-1.5">
          <div className="skeleton" style={{ width: 52, height: 28, borderRadius: 9999 }} />
          <div className="skeleton" style={{ width: 52, height: 28, borderRadius: 9999 }} />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 9999 }} />
          <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 9999 }} />
          <div className="skeleton" style={{ width: 52, height: 32, borderRadius: 9999 }} />
        </div>
      </div>
    </div>
  );
}

export function Gist({ article, userId, email, username, isBookmarked = false, cardHeight, isActive = false, isRead = false }: Props) {
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

  const [matchedMarket, setMatchedMarket] = useState<PredictionMarket | null | undefined>(undefined);

  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [sourcesData, setSourcesData] = useState<GistSource[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [votePulse, setVotePulse] = useState<"up" | "down" | null>(null);
  const [bookmarkPop, setBookmarkPop] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const composeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalVote((article.userVote as 1 | -1 | 0) ?? 0);
    setUpvotes(article.upvotes);
    setDownvotes(article.downvotes);
    setLocalCommentCount(article.commentCount);
    setComments([]);
    setCommentBody("");
    setPostError(false);
    setCommentsFetched(false);
    setSourcesOpen(false);
    setSourcesData([]);
    setShareMenuOpen(false);
    setMatchedMarket(undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.id]);

  useEffect(() => {
    setLocalBookmark(isBookmarked);
  }, [isBookmarked]);

  // Fetch matched prediction market lazily on first visibility
  useEffect(() => {
    if (matchedMarket !== undefined) return;
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          api.getMarketForArticle(article.id)
            .then((res) => setMatchedMarket(res.market ?? null))
            .catch(() => setMatchedMarket(null));
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.id, matchedMarket]);

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

  const categoryColor = CATEGORY_COLORS[article.category] ?? "var(--category-tech)";
  const timeAgo = formatTimeAgo(new Date(article.publishedAt));
  const readTime = getGistReadTime();
  const freshness = getFreshnessTag(article.publishedAt, article.feedScore);

  // Adaptive layout thresholds based on actual card height (accounts for both
  // viewport height and header size — more reliable than CSS width breakpoints)
  const showInlineComments = cardHeight >= 640;
  const showMarketWidget   = cardHeight >= 520;
  // Shrink the image on shorter cards so content below it isn't clipped
  const imageHeight = Math.round(cardHeight * (cardHeight >= 640 ? 0.24 : cardHeight >= 520 ? 0.20 : 0.17));

  const bullets = article.summary.split("\n").filter(Boolean);
  const effectiveUsername = username || email?.split("@")[0] || "user";
  const visibleComments = comments.slice(0, 2);
  const hiddenCount = comments.length > 2 ? comments.length - 2 : 0;

  async function handleVote(value: 1 | -1) {
    if (!userId || !email || isVoting) return;
    const prev = localVote;
    const next = prev === value ? 0 : value;
    setIsVoting(true);
    setLocalVote(next);
    setUpvotes(u => u + (next === 1 ? 1 : prev === 1 ? -1 : 0));
    setDownvotes(d => d + (next === -1 ? 1 : prev === -1 ? -1 : 0));
    setVotePulse(value === 1 ? "up" : "down");
    setTimeout(() => setVotePulse(null), 300);
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
    if (next) { setBookmarkPop(true); setTimeout(() => setBookmarkPop(false), 350); }
    try {
      if (next) await api.addBookmark(article.id, userId, email!, username!);
      else await api.removeBookmark(article.id, userId);
    } catch {
      setLocalBookmark(!next);
    }
  }

  async function handleSourcesToggle() {
    if (sourcesOpen) {
      setSourcesOpen(false);
      return;
    }
    setSourcesOpen(true);
    if (sourcesData.length > 0) return;
    setSourcesLoading(true);
    try {
      const res = await api.getSources(article.id);
      setSourcesData(res.sources);
    } catch {
      setSourcesData([{ id: "primary", sourceName: article.sourceName, sourceUrl: article.sourceUrl, imageUrl: null }]);
    } finally {
      setSourcesLoading(false);
    }
  }

  const gistUrl = `https://gists.news/gist/${article.id}`;
  const shareText = `${article.title} — check out this gist on gists.news`;

  function handleShareTwitter() {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(gistUrl)}`;
    window.open(url, "_blank", "width=550,height=420");
    setShareMenuOpen(false);
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(gistUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setShareMenuOpen(false);
  }

  async function handleNativeShare() {
    if (navigator.share) {
      await navigator.share({ title: article.title, text: shareText, url: gistUrl });
    }
    setShareMenuOpen(false);
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
      className={`feed-card flex flex-col ${isActive ? "feed-card-active" : ""}`}
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

        {/* Freshness tag */}
        {freshness === "breaking" && (
          <span className="freshness-tag freshness-breaking">
            <span style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "#f87171", display: "inline-block" }} />
            Breaking
          </span>
        )}
        {freshness === "new" && (
          <span className="freshness-tag freshness-new">New</span>
        )}

        {/* Source coverage badge — clickable when multi-source */}
        {article.sourceCount > 1 && (
          <span className="relative">
            <button
              onClick={handleSourcesToggle}
              className="source-badge"
              style={{ cursor: "pointer" }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              {article.sourceCount} sources
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ transform: sourcesOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {sourcesOpen && (
              <div
                className="absolute left-0 top-full mt-2 z-50 rounded-xl overflow-hidden animate-fade-in"
                style={{
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border)",
                  minWidth: 220,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                }}
              >
                <div className="px-3 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="text-xs font-semibold tracking-widest" style={{ color: "var(--text-muted)" }}>
                    SOURCES
                  </span>
                </div>
                {sourcesLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="w-3.5 h-3.5 rounded-full border-2 animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {sourcesData.map((src) => (
                      <a
                        key={src.id}
                        href={src.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-3 py-2.5 transition-colors"
                        style={{ color: "var(--text-primary)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg)")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <div
                          className="w-6 h-6 rounded flex items-center justify-center shrink-0 text-xs font-bold"
                          style={{ backgroundColor: `${categoryColor}20`, color: categoryColor }}
                        >
                          {src.sourceName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{src.sourceName}</p>
                          <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{new URL(src.sourceUrl).hostname}</p>
                        </div>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)", flexShrink: 0 }}>
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </span>
        )}

        <span className="text-sm flex-1 text-right truncate" style={{ color: "var(--text-secondary)" }}>
          {article.sourceName}
        </span>
        <span className="reading-time shrink-0">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {readTime}
        </span>
        <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
          {timeAgo}
        </span>
        {isRead && (
          <span className="text-xs shrink-0" style={{ color: "var(--text-muted)", opacity: 0.6 }} title="You've read this">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        )}
      </div>

      {/* Body: article content (70%) + comments (30%) */}
      <div className="flex-1 flex flex-col min-h-0">

        {/* Article content — 70% */}
        <div className="flex flex-col px-5 pb-3 gap-2 overflow-hidden min-h-0" style={{ flex: "7 1 0" }}>
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
              style={{ height: imageHeight, backgroundColor: "var(--surface-deep)", border: "1px solid var(--border)" }}
            >
              <span className="wordmark font-bold" style={{ color: "var(--border)", fontSize: 20 }}>gists</span>
            </div>
          )}

          <h2
            className="font-bold leading-tight shrink-0"
            style={{ fontSize: 24, color: "var(--text-primary)", lineHeight: 1.25 }}
          >
            {article.title}
          </h2>

          <div className="flex gap-2 shrink-0">
            <div className="summary-bar" />
            <div className="flex flex-col gap-1">
              <span className="wordmark text-xs tracking-wide" style={{ color: "var(--accent)", fontSize: 11 }}>
                the gist
              </span>
              {bullets.map((point, i) => (
                <div key={i} className="flex gap-1.5 items-start">
                  <span className="shrink-0 mt-1" style={{ color: "var(--accent)", fontSize: 6 }}>●</span>
                  <p className="leading-snug" style={{ fontSize: 16, color: "var(--text-primary)" }}>
                    {point}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Inline prediction market — only when card is tall enough */}
          {showMarketWidget && matchedMarket && (
            <a
              href={matchedMarket.affiliateUrl || matchedMarket.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex flex-col gap-2 px-3 py-2.5 rounded-xl transition-opacity hover:opacity-90"
              style={{
                backgroundColor: "var(--surface)",
                border: "1px solid var(--border)",
                textDecoration: "none",
              }}
            >
              {/* Header row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div
                    className="w-4 h-4 rounded flex items-center justify-center shrink-0 text-xs font-black"
                    style={{ backgroundColor: "#5B48F2", color: "#fff", fontSize: 8, lineHeight: 1 }}
                  >
                    P
                  </div>
                  <span className="text-xs font-semibold tracking-wide" style={{ color: "var(--text-muted)" }}>
                    PREDICTION MARKET
                  </span>
                </div>
                <span
                  className="text-xs font-bold tabular-nums shrink-0"
                  style={{
                    color: matchedMarket.yesPrice >= 0.65
                      ? "#34d399"
                      : matchedMarket.yesPrice <= 0.35
                      ? "#f87171"
                      : "var(--text-primary)",
                  }}
                >
                  {Math.round(matchedMarket.yesPrice * 100)}% YES
                </span>
              </div>

              {/* Question */}
              <p
                className="text-sm font-medium leading-snug line-clamp-2"
                style={{ color: "var(--text-primary)" }}
              >
                {matchedMarket.question}
              </p>

              {/* Probability bar */}
              <div className="w-full rounded-full overflow-hidden" style={{ height: 4, backgroundColor: "var(--border)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.round(matchedMarket.yesPrice * 100)}%`,
                    backgroundColor: matchedMarket.yesPrice >= 0.65
                      ? "#34d399"
                      : matchedMarket.yesPrice <= 0.35
                      ? "#f87171"
                      : "#c8f65d",
                  }}
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {matchedMarket.volume >= 1_000_000
                    ? `$${(matchedMarket.volume / 1_000_000).toFixed(1)}M vol`
                    : matchedMarket.volume >= 1_000
                    ? `$${(matchedMarket.volume / 1_000).toFixed(0)}K vol`
                    : "polymarket.com"}
                </span>
                <span className="text-xs" style={{ color: "var(--accent)" }}>
                  Trade on Polymarket →
                </span>
              </div>
            </a>
          )}

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

        {/* Divider + comments — only when card is tall enough to show both */}
        {showInlineComments && <div className="shrink-0 mx-5" style={{ height: 1, backgroundColor: "var(--border)" }} />}
        <div className={`flex-col px-5 pt-3 pb-2 min-h-0 ${showInlineComments ? "flex" : "hidden"}`} style={{ flex: "3 1 0" }}>

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

          <div className="flex-1 flex flex-col gap-3 overflow-hidden min-h-0">
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
                {visibleComments.map((c, ci) => (
                  <div key={c.id} className="flex flex-col gap-0.5 comment-in" style={{ animationDelay: `${ci * 60}ms` }}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
                        {c.user.username}
                      </span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        · {formatTimeAgo(new Date(c.createdAt))}
                      </span>
                    </div>
                    <p className="leading-relaxed" style={{ fontSize: 14, color: "var(--text-primary)" }}>
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
                    style={{ backgroundColor: "var(--accent)", color: "var(--accent-on)" }}
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
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors disabled:cursor-not-allowed ${votePulse === "up" ? "vote-pulse" : ""}`}
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
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors disabled:cursor-not-allowed ${votePulse === "down" ? "vote-pulse" : ""}`}
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
          {/* Share menu */}
          <span className="relative">
            <button
              onClick={() => setShareMenuOpen(!shareMenuOpen)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors"
              style={{ backgroundColor: shareMenuOpen ? "var(--accent-dim)" : "var(--surface)", border: `1px solid ${shareMenuOpen ? "var(--accent)" : "var(--border)"}`, color: shareMenuOpen ? "var(--accent)" : "var(--text-secondary)" }}
              title="Share"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </button>
            {shareMenuOpen && (
              <div
                className="absolute right-0 bottom-full mb-2 z-50 rounded-xl overflow-hidden animate-fade-in"
                style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", minWidth: 180, boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}
              >
                <button onClick={handleShareTwitter} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors" style={{ color: "var(--text-primary)" }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg)")} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                  Post on X
                </button>
                <button onClick={handleCopyLink} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors" style={{ color: "var(--text-primary)" }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg)")} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                  {copied ? "Copied!" : "Copy link"}
                </button>
                {typeof navigator !== "undefined" && "share" in navigator && (
                  <button onClick={handleNativeShare} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors" style={{ color: "var(--text-primary)" }} onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg)")} onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
                    Share…
                  </button>
                )}
              </div>
            )}
          </span>
          <button
            onClick={handleBookmark}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${bookmarkPop ? "bookmark-pop" : ""}`}
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
