"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { api, Article, Category, FeedSort } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { NewsCard, SkeletonCard } from "@/components/NewsCard";
import { CategoryBar, TabValue } from "@/components/CategoryBar";
import { LeftPanel } from "@/components/LeftPanel";
import { RightPanel } from "@/components/RightPanel";
import { SearchOverlay } from "@/components/SearchOverlay";
import type { User } from "@supabase/supabase-js";

const AD_INTERVAL = 6;

type FeedItem = Article | { type: "ad"; id: string };

function injectAds(articles: Article[]): FeedItem[] {
  const result: FeedItem[] = [];
  articles.forEach((article, i) => {
    result.push(article);
    if ((i + 1) % AD_INTERVAL === 0) {
      result.push({ type: "ad", id: `ad-${i}` });
    }
  });
  return result;
}

function AdCard({ cardHeight }: { cardHeight: number }) {
  return (
    <div
      className="feed-card flex flex-col"
      style={{ height: cardHeight, backgroundColor: "var(--bg)", borderBottom: "1px solid var(--border)" }}
    >
      <div className="flex items-center gap-2 px-5 pt-4 pb-3 shrink-0">
        <span className="text-xs font-semibold tracking-wide px-1.5 py-0.5 rounded border" style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}>
          SPONSORED
        </span>
        <span className="text-sm flex-1" style={{ color: "var(--text-secondary)" }}>tl;dr for Business</span>
      </div>
      <div className="flex-1 flex flex-col px-5 pb-4 gap-3">
        <div className="w-full rounded-lg flex items-center justify-center shrink-0" style={{ height: Math.round(cardHeight * 0.28), backgroundColor: "#0a0a0a", border: "1px solid var(--border)" }}>
          <span className="wordmark text-2xl font-bold" style={{ color: "var(--accent)" }}>tl;dr</span>
          <span className="ml-2 text-sm" style={{ color: "var(--text-muted)" }}>for Business</span>
        </div>
        <h2 className="font-bold leading-tight" style={{ fontSize: 20, color: "var(--text-primary)" }}>
          Reach Readers Who Actually Pay Attention
        </h2>
        <div className="flex gap-2">
          <div className="summary-bar" />
          <div className="flex flex-col gap-1">
            <span className="wordmark text-xs tracking-wide" style={{ color: "var(--accent)", fontSize: 11 }}>tl;dr</span>
            {["tl;dr serves daily news to thousands of professionals.", "Native placements look and feel like trusted content.", "No banner blindness. Just your message in context."].map((b, i) => (
              <div key={i} className="flex gap-1.5 items-start">
                <span className="shrink-0 mt-1.5" style={{ color: "var(--accent)", fontSize: 6 }}>●</span>
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>{b}</p>
              </div>
            ))}
          </div>
        </div>
        <a href="mailto:advertise@tldr.app" className="text-sm hover:underline" style={{ color: "var(--accent)" }}>
          Advertise on tl;dr →
        </a>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Sponsored content</p>
      </div>
    </div>
  );
}

export default function FeedPage() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedTab, setSelectedTab] = useState<TabValue>(null);
  const [feedSort, setFeedSort] = useState<FeedSort>("ranked");
  const [articles, setArticles] = useState<Article[]>([]);
  const [bookmarks, setBookmarks] = useState<Article[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [cardHeight, setCardHeight] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const isSavedView = selectedTab === "SAVED";
  const selectedCategory = isSavedView ? null : (selectedTab as Category | null);

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Card height
  useEffect(() => {
    function measure() {
      if (feedRef.current) {
        const peek = 80;
        setCardHeight(feedRef.current.clientHeight - peek);
      }
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Load bookmarks
  useEffect(() => {
    if (!user) return;
    api.getBookmarks(user.id).then((b) => {
      setBookmarks(b);
      setBookmarkedIds(new Set(b.map(a => a.id)));
    }).catch(() => {});
  }, [user]);

  // Load feed
  const loadFeed = useCallback(async (reset = true) => {
    if (isSavedView) return;
    try {
      reset ? setLoading(true) : setLoadingMore(true);
      setError(false);
      const res = await api.getFeed({
        category: selectedCategory ?? undefined,
        cursor: reset ? undefined : nextCursor ?? undefined,
        userId: user?.id,
        sort: feedSort,
      });
      setArticles(prev => reset ? res.items : [...prev, ...res.items]);
      setNextCursor(res.nextCursor);
      if (reset) setActiveCardIndex(0);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedCategory, user, isSavedView, nextCursor, feedSort]);

  useEffect(() => {
    setArticles([]);
    setNextCursor(null);
    loadFeed(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTab, user, feedSort]);

  const feedItems: FeedItem[] = isSavedView ? bookmarks : injectAds(articles);

  const trendingArticles = useMemo(
    () =>
      [...articles]
        .sort((a, b) => b.upvotes + b.commentCount - (a.upvotes + a.commentCount))
        .slice(0, 5),
    [articles]
  );

  function scrollToArticle(id: string) {
    const idx = feedItems.findIndex((item) => !("type" in item) && (item as Article).id === id);
    if (idx >= 0 && feedRef.current) {
      feedRef.current.scrollTo({ top: idx * cardHeight, behavior: "smooth" });
      setActiveCardIndex(idx);
    }
  }

  function scrollToIndex(idx: number) {
    if (idx >= 0 && idx < feedItems.length && feedRef.current) {
      feedRef.current.scrollTo({ top: idx * cardHeight, behavior: "smooth" });
      setActiveCardIndex(idx);
    }
  }

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (searchOpen) return;

      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      switch (e.key) {
        case "j":
        case "ArrowDown":
          e.preventDefault();
          scrollToIndex(Math.min(activeCardIndex + 1, feedItems.length - 1));
          break;
        case "k":
        case "ArrowUp":
          e.preventDefault();
          scrollToIndex(Math.max(activeCardIndex - 1, 0));
          break;
        case "/":
          e.preventDefault();
          setSearchOpen(true);
          break;
        case "o": {
          const item = feedItems[activeCardIndex];
          if (item && !("type" in item)) {
            window.open((item as Article).sourceUrl, "_blank");
          }
          break;
        }
        case "b": {
          const item = feedItems[activeCardIndex];
          if (item && !("type" in item) && user) {
            const art = item as Article;
            const isBm = bookmarkedIds.has(art.id);
            if (isBm) {
              api.removeBookmark(art.id, user.id).catch(() => {});
              setBookmarkedIds((prev) => { const n = new Set(prev); n.delete(art.id); return n; });
            } else {
              api.addBookmark(art.id, user.id, user.email!, user.user_metadata?.username ?? "user").catch(() => {});
              setBookmarkedIds((prev) => new Set(prev).add(art.id));
            }
          }
          break;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCardIndex, feedItems, searchOpen, user, bookmarkedIds]);

  // Track scroll position to update active card index
  useEffect(() => {
    const feed = feedRef.current;
    if (!feed || cardHeight === 0) return;
    function onScroll() {
      const idx = Math.round(feed!.scrollTop / cardHeight);
      setActiveCardIndex(idx);
    }
    feed.addEventListener("scroll", onScroll, { passive: true });
    return () => feed.removeEventListener("scroll", onScroll);
  }, [cardHeight]);

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "var(--bg)", display: "flex", justifyContent: "center" }}>
      <div style={{ display: "flex", width: "100%", maxWidth: 1080, height: "100%", alignItems: "stretch" }}>

      {/* Left panel */}
      <LeftPanel
        articles={articles}
        selected={isSavedView ? null : (selectedTab as Category | null)}
        onSelect={(cat) => setSelectedTab(cat)}
      />

      {/* Center feed column */}
      <div style={{
        width: "100%",
        maxWidth: 500,
        flexShrink: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderLeft: "1px solid var(--border)",
        borderRight: "1px solid var(--border)",
      }}>
      {/* Header */}
      <div ref={headerRef} style={{ flexShrink: 0 }}>
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <Link href="/" className="wordmark text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            tl;dr
          </Link>
          <div className="flex items-center gap-2">
            {/* Search button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
              title="Search (press /)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>

            {/* Daily Digest link */}
            <Link
              href="/digest"
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
              title="Daily Digest"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </Link>

            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs hidden sm:inline" style={{ color: "var(--text-muted)" }}>
                  {user.user_metadata?.username ?? user.email}
                </span>
                <Link href="/profile" className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--accent)" }}>
                  {(user.user_metadata?.username ?? user.email ?? "?")[0].toUpperCase()}
                </Link>
              </div>
            ) : (
              <Link href="/sign-in" className="text-xs px-3 py-1.5 rounded-full" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                Sign in
              </Link>
            )}
          </div>
        </div>
        <CategoryBar
          selected={selectedTab}
          onSelect={setSelectedTab}
          sort={feedSort}
          onSortChange={setFeedSort}
        />
      </div>

      {/* Feed */}
      <div ref={feedRef} className="feed-container" style={{ flex: 1, minHeight: 0 }}>
        {loading ? (
          cardHeight > 0 ? (
            <>
              <SkeletonCard cardHeight={cardHeight} />
              <SkeletonCard cardHeight={cardHeight} />
              <SkeletonCard cardHeight={cardHeight} />
            </>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
            </div>
          )
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <p style={{ color: "var(--text-secondary)" }}>Failed to load feed.</p>
            <button onClick={() => loadFeed(true)} className="text-sm px-4 py-2 rounded-full" style={{ color: "var(--accent)", border: "1px solid var(--accent)" }}>
              Try again
            </button>
          </div>
        ) : isSavedView && feedItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)" }}>
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            <p className="font-medium" style={{ color: "var(--text-secondary)" }}>No saved articles yet</p>
            <p className="text-sm text-center px-8" style={{ color: "var(--text-muted)" }}>
              Bookmark articles from the feed and they&apos;ll appear here.
            </p>
          </div>
        ) : (
          <>
            {cardHeight > 0 && feedItems.map((item, idx) => (
              "type" in item && item.type === "ad" ? (
                <AdCard key={item.id} cardHeight={cardHeight} />
              ) : (
                <NewsCard
                  key={(item as Article).id}
                  article={item as Article}
                  userId={user?.id ?? null}
                  email={user?.email ?? null}
                  username={user?.user_metadata?.username ?? null}
                  isBookmarked={bookmarkedIds.has((item as Article).id)}
                  cardHeight={cardHeight}
                  isActive={idx === activeCardIndex}
                />
              )
            ))}
            {nextCursor && !isSavedView && (
              <div className="feed-card flex items-center justify-center" style={{ height: cardHeight }}>
                <button
                  onClick={() => loadFeed(false)}
                  disabled={loadingMore}
                  className="px-6 py-3 rounded-full text-sm font-medium"
                  style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--accent)" }}
                >
                  {loadingMore ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
      </div>{/* end center column */}

      {/* Right panel */}
      <RightPanel
        trendingArticles={trendingArticles}
        onScrollToArticle={scrollToArticle}
      />

      </div>{/* end max-width wrapper */}

      {/* Search overlay */}
      {searchOpen && (
        <SearchOverlay
          onClose={() => setSearchOpen(false)}
          onSelectArticle={(article) => {
            setSearchOpen(false);
            window.open(article.sourceUrl, "_blank");
          }}
        />
      )}
    </div>
  );
}
