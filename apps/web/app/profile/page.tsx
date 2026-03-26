"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { api, Category } from "@/lib/api";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { User } from "@supabase/supabase-js";

const CATEGORY_META: { id: Category; label: string; color: string; icon: string; description: string }[] = [
  { id: "TECH",     label: "Tech",     color: "var(--category-tech)", icon: "⚡", description: "Software, startups & science" },
  { id: "FINANCE",  label: "Finance",  color: "var(--category-finance)", icon: "📈", description: "Markets, investing & the economy" },
  { id: "POLITICS", label: "Politics", color: "var(--category-politics)", icon: "🏛️", description: "Policy, elections & world affairs" },
  { id: "CULTURE",  label: "Culture",  color: "var(--category-culture)", icon: "🎭", description: "Entertainment, arts & trending" },
  { id: "SPORTS",   label: "Sports",   color: "var(--category-sports)", icon: "🏆", description: "Scores, trades & sports news" },
];

const ALL_SOURCES: { name: string; category: Category }[] = [
  { name: "Hacker News",             category: "TECH"     },
  { name: "WSJ Markets",             category: "FINANCE"  },
  { name: "CNBC Finance",            category: "FINANCE"  },
  { name: "BBC Business",            category: "FINANCE"  },
  { name: "NPR Politics",            category: "POLITICS" },
  { name: "Politico",                category: "POLITICS" },
  { name: "The Hill",                category: "POLITICS" },
  { name: "Variety",                 category: "CULTURE"  },
  { name: "The Hollywood Reporter",  category: "CULTURE"  },
  { name: "Pitchfork",               category: "CULTURE"  },
  { name: "ESPN",                    category: "SPORTS"   },
  { name: "Yahoo Sports",            category: "SPORTS"   },
  { name: "BBC Sport",               category: "SPORTS"   },
  { name: "CBS Sports",              category: "SPORTS"   },
];

type Section = "topics" | "sources" | null;

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [bookmarkCount, setBookmarkCount] = useState<number | null>(null);

  // Preferences state
  const [categories, setCategories] = useState<Set<Category>>(new Set());
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [openSection, setOpenSection] = useState<Section>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace("/sign-in"); return; }
      const u = data.session.user;
      setUser(u);
      setAccessToken(data.session.access_token);
      Promise.all([
        api.getBookmarks(u.id).catch(() => []),
        api.getPreferences(u.id).catch(() => null),
      ]).then(([bookmarks, prefs]) => {
        setBookmarkCount(bookmarks.length);
        if (prefs) {
          setCategories(new Set(prefs.categories));
          setExcluded(new Set(prefs.excludedSources));
        }
      });
      setLoading(false);
    });
  }, [router]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      const effectiveUsername = user.user_metadata?.username || user.email?.split("@")[0] || "user";
      await api.savePreferences(
        user.id, user.email!, effectiveUsername,
        Array.from(categories),
        Array.from(excluded),
        accessToken
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      setOpenSection(null);
    } catch (err) {
      console.error("[Profile] save error:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) {
    return (
      <div style={{ backgroundColor: "var(--bg)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!user) return null;

  const username = user.user_metadata?.username ?? user.email ?? "User";
  const initial = username[0].toUpperCase();

  return (
    <div style={{ backgroundColor: "var(--bg)", minHeight: "100vh" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 sticky top-0 z-10"
        style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--nav-bg)", backdropFilter: "blur(12px)" }}
      >
        <Link href="/feed" className="text-sm flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
          ← Feed
        </Link>
        <span className="wordmark text-xl font-bold" style={{ color: "var(--text-primary)" }}>gists</span>
        <ThemeToggle />
      </div>

      <div className="max-w-sm mx-auto px-5 py-8 flex flex-col gap-5">
        {/* Avatar + name */}
        <div className="flex flex-col items-center gap-3 py-2">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold"
            style={{ backgroundColor: "var(--surface)", border: "2px solid var(--accent)", color: "var(--accent)" }}
          >
            {initial}
          </div>
          <div className="text-center">
            <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{username}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{user.email}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-4 text-center" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-2xl font-bold" style={{ color: "var(--accent)" }}>{bookmarkCount ?? "—"}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Bookmarks</p>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-2xl font-bold" style={{ color: "var(--accent)" }}>{categories.size || "—"}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Topics</p>
          </div>
        </div>

        {/* Save success banner */}
        {saveSuccess && (
          <div className="rounded-xl px-4 py-3 text-sm text-center font-medium" style={{ backgroundColor: "#34d39920", border: "1px solid #34d399", color: "#34d399" }}>
            Preferences saved ✓
          </div>
        )}

        {/* Topics accordion */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <button
            className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-medium"
            style={{ backgroundColor: "var(--surface)", color: "var(--text-primary)" }}
            onClick={() => setOpenSection(openSection === "topics" ? null : "topics")}
          >
            <span>Your Topics</span>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--bg)", color: "var(--accent)", border: "1px solid var(--border)" }}>
                {categories.size} selected
              </span>
              <span style={{ color: "var(--text-muted)" }}>{openSection === "topics" ? "▲" : "▼"}</span>
            </div>
          </button>

          {openSection === "topics" && (
            <div className="p-4 flex flex-col gap-2" style={{ borderTop: "1px solid var(--border)" }}>
              {CATEGORY_META.map((topic) => {
                const active = categories.has(topic.id);
                return (
                  <button
                    key={topic.id}
                    onClick={() => {
                      setCategories((prev) => {
                        const next = new Set(prev);
                        if (next.has(topic.id)) {
                          if (next.size === 1) return prev;
                          next.delete(topic.id);
                        } else {
                          next.add(topic.id);
                        }
                        return next;
                      });
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left"
                    style={{
                      backgroundColor: active ? `${topic.color}15` : "transparent",
                      border: `1px solid ${active ? topic.color : "var(--border)"}`,
                    }}
                  >
                    <span>{topic.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: active ? topic.color : "var(--text-primary)" }}>{topic.label}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{topic.description}</p>
                    </div>
                    <div
                      className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0"
                      style={{ borderColor: active ? topic.color : "var(--border)", backgroundColor: active ? topic.color : "transparent" }}
                    >
                      {active && <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1.5 4l2 2L6.5 2" stroke="var(--accent-on)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sources accordion */}
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <button
            className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-medium"
            style={{ backgroundColor: "var(--surface)", color: "var(--text-primary)" }}
            onClick={() => setOpenSection(openSection === "sources" ? null : "sources")}
          >
            <span>Excluded Sources</span>
            <div className="flex items-center gap-2">
              {excluded.size > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--bg)", color: "#f87171", border: "1px solid #f87171" }}>
                  {excluded.size} excluded
                </span>
              )}
              <span style={{ color: "var(--text-muted)" }}>{openSection === "sources" ? "▲" : "▼"}</span>
            </div>
          </button>

          {openSection === "sources" && (
            <div className="flex flex-col" style={{ borderTop: "1px solid var(--border)" }}>
              <p className="text-xs px-4 pt-3 pb-2" style={{ color: "var(--text-muted)" }}>
                Tap a source to exclude it from your feed.
              </p>
              {CATEGORY_META.map((cat) => {
                const sources = ALL_SOURCES.filter((s) => s.category === cat.id);
                if (sources.length === 0) return null;
                return (
                  <div key={cat.id} className="px-4 pb-3">
                    <p className="text-xs font-semibold tracking-wider mb-2" style={{ color: cat.color }}>
                      {cat.label.toUpperCase()}
                    </p>
                    {sources.map((source) => {
                      const isExcluded = excluded.has(source.name);
                      return (
                        <button
                          key={source.name}
                          onClick={() => setExcluded((prev) => {
                            const next = new Set(prev);
                            isExcluded ? next.delete(source.name) : next.add(source.name);
                            return next;
                          })}
                          className="w-full flex items-center justify-between py-2.5 text-sm"
                          style={{ borderBottom: "1px solid var(--border)", opacity: isExcluded ? 0.5 : 1 }}
                        >
                          <span style={{ color: isExcluded ? "var(--text-muted)" : "var(--text-primary)", textDecoration: isExcluded ? "line-through" : "none" }}>
                            {source.name}
                          </span>
                          <div
                            className="w-5 h-5 rounded-full border flex items-center justify-center"
                            style={{ borderColor: isExcluded ? "var(--border)" : cat.color, backgroundColor: isExcluded ? "transparent" : `${cat.color}30` }}
                          >
                            {isExcluded
                              ? <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" style={{ color: "var(--text-muted)" }} /></svg>
                              : <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1.5 4l2 2L6.5 2" stroke={cat.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            }
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Save button — only shown when a section is open */}
        {openSection && (
          <button
            onClick={handleSave}
            disabled={saving || categories.size === 0}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-40"
            style={{ backgroundColor: "var(--accent)", color: "var(--accent-on)" }}
          >
            {saving ? "Saving…" : "Save preferences"}
          </button>
        )}

        {/* Other actions */}
        <div className="flex flex-col gap-2">
          <Link
            href="/feed"
            className="w-full py-3 rounded-xl text-sm font-medium text-center"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          >
            🔖 View Bookmarks
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full py-3 rounded-xl text-sm font-medium"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "#f87171" }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
