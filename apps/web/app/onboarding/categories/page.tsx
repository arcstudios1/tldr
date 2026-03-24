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
  { id: "TECH",     label: "Tech",     description: "Software, startups & science",    icon: "⚡", color: "#60a5fa" },
  { id: "FINANCE",  label: "Finance",  description: "Markets, investing & the economy", icon: "📈", color: "#34d399" },
  { id: "POLITICS", label: "Politics", description: "Policy, elections & world affairs", icon: "🏛️", color: "#f87171" },
  { id: "CULTURE",  label: "Culture",  description: "Entertainment, arts & trending",   icon: "🎭", color: "#c084fc" },
  { id: "SPORTS",   label: "Sports",   description: "Scores, trades & sports news",     icon: "🏆", color: "#fb923c" },
];

export default function OnboardingCategoriesPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<Category>>(new Set());
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace("/sign-in");
        return;
      }
      const u = data.session.user;
      setUserId(u.id);
      setEmail(u.email ?? null);
      setUsername(u.user_metadata?.username ?? null);
    });
  }, [router]);

  function toggle(id: Category) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleContinue() {
    if (!userId || !email || selected.size === 0) return;
    setSaving(true);
    try {
      const effectiveUsername = username || email.split("@")[0] || "user";
      await api.savePreferences(
        userId, email, effectiveUsername,
        Array.from(selected),
        [] // no excluded sources on first setup
      );
      await supabase.auth.updateUser({ data: { onboardingComplete: true } });
      router.replace("/feed");
    } catch (err) {
      console.error("[Onboarding] save error:", err);
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
            tl;dr
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
                    style={{ backgroundColor: topic.color, color: "#000" }}
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
                    <path d="M2 5l2.5 2.5L8 3" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </button>
          );
        })()}

        {/* Continue button */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleContinue}
            disabled={selected.size === 0 || saving}
            className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40"
            style={{ backgroundColor: "var(--accent)", color: "#000" }}
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
