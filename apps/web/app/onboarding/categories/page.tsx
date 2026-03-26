"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { api, Category } from "@/lib/api";

const TOPICS: {
  id: Category;
  label: string;
  description: string;
  icon: string;
  color: string;
}[] = [
  { id: "TECH",     label: "Tech",     description: "Software, startups & science",    icon: "⚡", color: "var(--category-tech)" },
  { id: "FINANCE",  label: "Finance",  description: "Markets, investing & the economy", icon: "📈", color: "var(--category-finance)" },
  { id: "POLITICS", label: "Politics", description: "Policy, elections & world affairs", icon: "🏛️", color: "var(--category-politics)" },
  { id: "CULTURE",  label: "Culture",  description: "Entertainment, arts & trending",   icon: "🎭", color: "var(--category-culture)" },
  { id: "SPORTS",   label: "Sports",   description: "Scores, trades & sports news",     icon: "🏆", color: "var(--category-sports)" },
];

export default function OnboardingCategoriesPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<Category>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | undefined>();

  // Run once on mount — don't include router in deps to avoid re-run during navigation
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        window.location.href = "/sign-in";
        return;
      }
      const u = data.session.user;
      setUserId(u.id);
      setEmail(u.email ?? null);
      setUsername(u.user_metadata?.username ?? null);
      setAccessToken(data.session.access_token);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(id: Category) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleContinue() {
    if (selected.size === 0) return;

    // Fetch a fresh session in case state hasn't resolved yet
    let uid = userId;
    let userEmail = email;
    let userUsername = username;
    let token = accessToken;
    if (!uid || !userEmail) {
      const { data } = await supabase.auth.getSession();
      uid = data.session?.user.id ?? null;
      userEmail = data.session?.user.email ?? null;
      userUsername = data.session?.user.user_metadata?.username ?? null;
      token = data.session?.access_token;
    }

    if (!uid || !userEmail) {
      setError("Session expired. Please sign in again.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const effectiveUsername = userUsername || userEmail.split("@")[0] || "user";
      await api.savePreferences(
        uid, userEmail, effectiveUsername,
        Array.from(selected),
        [],
        token
      );
      // Fire-and-forget — don't let this block navigation
      supabase.auth.updateUser({ data: { onboardingComplete: true } }).catch(console.error);
      // Hard redirect to avoid router race conditions
      window.location.href = "/feed";
    } catch (err) {
      console.error("[Onboarding] save error:", err);
      const detail = (err as { detail?: string })?.detail;
      const message = (err as Error)?.message ?? "";
      setError(`Failed to save: ${detail || message || "unknown error"}`);
      setSaving(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
      style={{ backgroundColor: "var(--bg)" }}
    >
      <div className="w-full max-w-sm flex flex-col gap-8">
        {/* Header */}
        <div className="text-center">
          <p className="wordmark text-2xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
            gists
          </p>
          <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
            What do you want to follow?
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Pick at least one topic. Your feed is personalized instantly.
          </p>
        </div>

        {/* Topic grid */}
        <div className="grid grid-cols-2 gap-3">
          {TOPICS.slice(0, 4).map((topic) => {
            const active = selected.has(topic.id);
            return (
              <button
                key={topic.id}
                onClick={() => toggle(topic.id)}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl text-center transition-all"
                style={{
                  backgroundColor: active ? `${topic.color}18` : "var(--surface)",
                  border: `2px solid ${active ? topic.color : "var(--border)"}`,
                  aspectRatio: "1.2",
                }}
              >
                <span style={{ fontSize: 28 }}>{topic.icon}</span>
                <span
                  className="font-semibold text-sm"
                  style={{ color: active ? topic.color : "var(--text-primary)" }}
                >
                  {topic.label}
                </span>
                <span className="text-xs leading-tight" style={{ color: "var(--text-muted)" }}>
                  {topic.description}
                </span>
                {active && (
                  <div
                    className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center text-xs"
                    style={{ backgroundColor: topic.color, color: "var(--accent-on)" }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Sports — full width */}
        {(() => {
          const topic = TOPICS[4];
          const active = selected.has(topic.id);
          return (
            <button
              onClick={() => toggle(topic.id)}
              className="flex items-center gap-4 px-5 py-4 rounded-2xl transition-all"
              style={{
                backgroundColor: active ? `${topic.color}18` : "var(--surface)",
                border: `2px solid ${active ? topic.color : "var(--border)"}`,
              }}
            >
              <span style={{ fontSize: 28 }}>{topic.icon}</span>
              <div className="text-left flex-1">
                <p
                  className="font-semibold"
                  style={{ color: active ? topic.color : "var(--text-primary)" }}
                >
                  {topic.label}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {topic.description}
                </p>
              </div>
              <div
                className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                style={{
                  borderColor: active ? topic.color : "var(--border)",
                  backgroundColor: active ? topic.color : "transparent",
                }}
              >
                {active && (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="var(--accent-on)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </button>
          );
        })()}

        {/* Error banner */}
        {error && (
          <div className="text-xs text-center px-4 py-3 rounded-xl" style={{ backgroundColor: "rgba(248,113,113,0.1)", border: "1px solid #f87171", color: "#f87171" }}>
            {error}
          </div>
        )}

        {/* Continue button */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleContinue}
            disabled={selected.size === 0 || saving}
            className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40"
            style={{ backgroundColor: "var(--accent)", color: "var(--accent-on)" }}
          >
            {saving ? "Setting up your feed…" : `Continue with ${selected.size > 0 ? selected.size : ""} topic${selected.size !== 1 ? "s" : ""} →`}
          </button>
          <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>
            You can change these anytime from your profile.
          </p>
        </div>
      </div>
    </div>
  );
}
