"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api, ReferralInfo, ReferralStats } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function ReferralPage() {
  const [user, setUser] = useState<User | null>(null);
  const [referral, setReferral] = useState<ReferralInfo | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) {
        Promise.all([api.getReferral(u.id), api.getReferralStats(u.id)])
          .then(([ref, st]) => { setReferral(ref); setStats(st); })
          .catch(() => {})
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });
  }, []);

  async function handleCopy() {
    if (!referral) return;
    await navigator.clipboard.writeText(referral.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleShareTwitter() {
    if (!referral) return;
    const text = `I use Gists to stay on top of the news — fast, personalized, and free. Try it out:`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referral.link)}`;
    window.open(url, "_blank", "width=550,height=420");
  }

  if (!user && !loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ backgroundColor: "var(--bg)" }}>
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Sign in to access referrals</h1>
        <Link href="/sign-in" className="text-sm px-5 py-2 rounded-full" style={{ backgroundColor: "var(--accent)", color: "#000" }}>
          Sign in →
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      {/* Nav */}
      <nav
        className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
        style={{ borderBottom: "1px solid var(--border)", backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
      >
        <Link href="/" className="wordmark text-xl font-bold" style={{ color: "var(--text-primary)" }}>gists</Link>
        <Link href="/feed" className="text-sm px-4 py-2 rounded-full" style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
          Back to feed
        </Link>
      </nav>

      <div className="max-w-lg mx-auto px-6 pt-12 pb-20">
        <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
          Invite Friends
        </h1>
        <p className="text-sm mb-10" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
          Share Gists with friends and earn reputation points. Higher reputation unlocks auto-approval for submitted gists.
        </p>

        {loading ? (
          <div className="flex flex-col gap-4">
            <div className="skeleton" style={{ height: 120, borderRadius: 16 }} />
            <div className="skeleton" style={{ height: 80, borderRadius: 16 }} />
          </div>
        ) : referral && (
          <>
            {/* Referral link card */}
            <div
              className="rounded-2xl p-6 mb-6"
              style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <label className="text-xs font-semibold tracking-widest mb-3 block" style={{ color: "var(--text-muted)" }}>
                YOUR REFERRAL LINK
              </label>
              <div className="flex items-center gap-2">
                <div
                  className="flex-1 px-3 py-2 rounded-lg text-sm truncate"
                  style={{ backgroundColor: "var(--bg)", border: "1px solid var(--border)", color: "var(--accent)" }}
                >
                  {referral.link}
                </div>
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 rounded-lg text-sm font-semibold shrink-0"
                  style={{ backgroundColor: "var(--accent)", color: "#000" }}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleShareTwitter}
                  className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium"
                  style={{ backgroundColor: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                  Share on X
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { label: "Referred", value: stats?.completed ?? 0 },
                { label: "Pending", value: stats?.pending ?? 0 },
                { label: "Reputation", value: `+${(stats?.completed ?? 0) * 10}` },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl p-4 text-center"
                  style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <div className="text-2xl font-bold tabular-nums" style={{ color: "var(--accent)" }}>
                    {stat.value}
                  </div>
                  <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Rewards tiers */}
            <div
              className="rounded-2xl p-6"
              style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <h2 className="text-xs font-semibold tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>
                REPUTATION REWARDS
              </h2>
              <div className="flex flex-col gap-3">
                {[
                  { rep: 10, reward: "Visible reputation badge" },
                  { rep: 50, reward: "Auto-approved gist submissions" },
                  { rep: 100, reward: "Early access to new features" },
                  { rep: 250, reward: "Community moderator status" },
                ].map((tier) => {
                  const earned = (referral.totalReferred * 10) >= tier.rep;
                  return (
                    <div key={tier.rep} className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                        style={{
                          backgroundColor: earned ? "var(--accent-dim)" : "var(--bg)",
                          color: earned ? "var(--accent)" : "var(--text-muted)",
                          border: `1px solid ${earned ? "var(--accent)" : "var(--border)"}`,
                        }}
                      >
                        {tier.rep}
                      </div>
                      <span className="text-sm" style={{ color: earned ? "var(--text-primary)" : "var(--text-muted)" }}>
                        {tier.reward}
                      </span>
                      {earned && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent)", marginLeft: "auto" }}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
