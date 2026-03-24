"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { api, Article, Category } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { NewsCard } from "@/components/NewsCard";
import { CategoryBar, TabValue } from "@/components/CategoryBar";
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
  const [articles, setArticles] = useState<Article[]>([]);
  const [bookmarks, setBookmarks] = useState<Article[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [cardHeight, setCardHeight] = useState(0);
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

  // Card height calculation
  useEffect(() => {
    function measure() {
      if (feedRef.current) setCardHeight(feedRef.current.clientHeight);
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
      });
      setArticles(prev => reset ? res.items : [...prev, ...res.items]);
      setNextCursor(res.nextCursor);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [selectedCategory, user, isSavedView, nextCursor]);

  useEffect(() => {
    setArticles([]);
    setNextCursor(null);
    loadFeed(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTab, user]);

  const feedItems: FeedItem[] = isSavedView ? bookmarks : injectAds(articles);

  return (
    <div style={{ height: "100vh", backgroundColor: "var(--bg)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div ref={headerRef}>
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <Link href="/" className="wordmark text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            tl;dr
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
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
        <CategoryBar selected={selectedTab} onSelect={setSelectedTab} />
      </div>

      {/* Feed */}
      <div ref={feedRef} className="feed-container flex-1">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <p style={{ color: "var(--text-secondary)" }}>Failed to load feed.</p>
            <button onClick={() => loadFeed(true)} className="text-sm px-4 py-2 rounded-full" style={{ color: "var(--accent)", border: "1px solid var(--accent)" }}>
              Try again
            </button>
          </div>
        ) : isSavedView && feedItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <p className="text-2xl">🔖</p>
            <p className="font-medium" style={{ color: "var(--text-secondary)" }}>No saved articles yet</p>
            <p className="text-sm text-center px-8" style={{ color: "var(--text-muted)" }}>
              Bookmark articles from the feed and they&apos;ll appear here.
            </p>
          </div>
        ) : (
          <>
            {cardHeight > 0 && feedItems.map((item) => (
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
    </div>
  );
}
