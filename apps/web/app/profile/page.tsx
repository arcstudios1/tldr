"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import type { User } from "@supabase/supabase-js";

const CATEGORY_COLORS: Record<string, string> = {
  TECH: "#60a5fa",
  FINANCE: "#34d399",
  POLITICS: "#f87171",
  CULTURE: "#c084fc",
  SPORTS: "#fb923c",
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarkCount, setBookmarkCount] = useState<number | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/sign-in");
        return;
      }
      const u = data.session.user;
      setUser(u);
      // Load bookmarks + prefs in parallel
      Promise.all([
        api.getBookmarks(u.id).catch(() => []),
        api.getPreferences(u.id).catch(() => null),
      ]).then(([bookmarks, prefs]) => {
        setBookmarkCount(bookmarks.length);
        if (prefs?.categories) setCategories(prefs.categories);
      });
      setLoading(false);
    });
  }, [router]);

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
        style={{ borderBottom: "1px solid var(--border)", backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
      >
        <Link href="/feed" className="text-sm flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
          ← Feed
        </Link>
        <span className="wordmark text-xl font-bold" style={{ color: "var(--text-primary)" }}>tl;dr</span>
        <div style={{ width: 48 }} />
      </div>

      <div className="max-w-sm mx-auto px-5 py-8 flex flex-col gap-6">
        {/* Avatar + name */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
            style={{ backgroundColor: "var(--surface)", border: "2px solid var(--accent)", color: "var(--accent)" }}
          >
            {initial}
          </div>
          <div className="text-center">
            <p className="font-semibold text-lg" style={{ color: "var(--text-primary)" }}>{username}</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{user.email}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-4 text-center" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-2xl font-bold" style={{ color: "var(--accent)" }}>
              {bookmarkCount ?? "—"}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Bookmarks</p>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-2xl font-bold" style={{ color: "var(--accent)" }}>
              {categories.length || "—"}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Topics</p>
          </div>
        </div>

        {/* Topics */}
        {categories.length > 0 && (
          <div className="rounded-xl p-4" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-xs font-semibold tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>YOUR TOPICS</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <span
                  key={cat}
                  className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{ color: CATEGORY_COLORS[cat] ?? "var(--accent)", border: `1px solid ${CATEGORY_COLORS[cat] ?? "var(--accent)"}`, backgroundColor: `${CATEGORY_COLORS[cat] ?? "var(--accent)"}18` }}
                >
                  {cat.charAt(0) + cat.slice(1).toLowerCase()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Link
            href="/feed"
            className="w-full py-3 rounded-xl text-sm font-medium text-center transition-colors"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          >
            🔖 View Bookmarks
          </Link>
          <Link
            href="/feed"
            className="w-full py-3 rounded-xl text-sm font-medium text-center transition-colors"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          >
            ✦ Edit Topics &amp; Sources
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full py-3 rounded-xl text-sm font-medium transition-colors"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "#f87171" }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
