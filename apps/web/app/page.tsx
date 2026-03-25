"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { ThemeToggle } from "@/components/ThemeToggle";

const CARD_BULLETS = [
  "Federal Reserve holds rates steady for the third consecutive meeting.",
  "Officials cite cooling inflation but warn growth remains fragile.",
  "Markets rally on signals that cuts could come later this year.",
];

const HOW_IT_WORKS: { step: string; icon: React.ReactNode; title: string; desc: string }[] = [
  {
    step: "01",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent)" }}>
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    title: "Collected",
    desc: "Stories pulled every hour from trusted outlets across tech, finance, politics, culture, and sports.",
  },
  {
    step: "02",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent)" }}>
        <circle cx="18" cy="18" r="3" />
        <circle cx="6" cy="6" r="3" />
        <path d="M13 6h3a2 2 0 0 1 2 2v7" />
        <line x1="6" y1="9" x2="6" y2="21" />
      </svg>
    ),
    title: "Grouped",
    desc: "When multiple outlets cover the same event, they're merged into one story — no duplicates cluttering your feed.",
  },
  {
    step: "03",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent)" }}>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
    title: "Ranked",
    desc: "Stories covered by more sources score higher. Older stories decay over time, keeping the feed current.",
  },
  {
    step: "04",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent)" }}>
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
    title: "Delivered",
    desc: "Your feed is ordered by significance, filtered to the topics you've chosen — nothing arbitrary, nothing missed.",
  },
];

const FEATURES: { icon: React.ReactNode; title: string; desc: string }[] = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent)" }}>
        <line x1="3" y1="5" x2="21" y2="5" />
        <line x1="3" y1="11" x2="16" y2="11" />
        <line x1="3" y1="17" x2="10" y2="17" />
      </svg>
    ),
    title: "The short version",
    desc: "Every story distilled to its essential points. No fluff, no filler — just what you need to know.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent)" }}>
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    title: "Multi-source verification",
    desc: "See how many outlets covered each story. More sources = more significant. Transparency built into every card.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent)" }}>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
    title: "Instant search",
    desc: "Find any story across every source and category. Search by headline, topic, or outlet — results in real time.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent)" }}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
    title: "Daily Gist",
    desc: "Today's most important stories, ranked and ready. One page, every morning — your briefing in under two minutes.",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--accent)" }}>
        <line x1="4" y1="6" x2="20" y2="6" />
        <circle cx="9" cy="6" r="2.5" fill="var(--bg)" stroke="currentColor" strokeWidth="1.75" />
        <line x1="4" y1="12" x2="20" y2="12" />
        <circle cx="15" cy="12" r="2.5" fill="var(--bg)" stroke="currentColor" strokeWidth="1.75" />
        <line x1="4" y1="18" x2="20" y2="18" />
        <circle cx="10" cy="18" r="2.5" fill="var(--bg)" stroke="currentColor" strokeWidth="1.75" />
      </svg>
    ),
    title: "Your topics, your feed",
    desc: "Personalize by topic and toggle between ranked and chronological. Tech, finance, politics, culture, sports — or all of it.",
  },
];

const CATEGORY_PILLS = [
  { label: "Tech", color: "var(--category-tech)" },
  { label: "Finance", color: "var(--category-finance)" },
  { label: "Politics", color: "var(--category-politics)" },
  { label: "Culture", color: "var(--category-culture)" },
  { label: "Sports", color: "var(--category-sports)" },
];

function ArticleCard() {
  return (
    <div
      className="w-full max-w-sm rounded-2xl overflow-hidden"
      style={{ border: "1px solid var(--border)", backgroundColor: "var(--surface)" }}
    >
      <div className="w-full h-44 flex items-center justify-center" style={{ backgroundColor: "var(--surface-deep)" }}>
        <span className="wordmark text-2xl font-bold" style={{ color: "var(--border)" }}>gists</span>
      </div>
      <div className="p-5">
        {/* Meta row — with new source badge + freshness tag */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs px-1.5 py-0.5 rounded border font-semibold tracking-wide" style={{ color: "var(--category-finance)", borderColor: "var(--category-finance)" }}>FINANCE</span>
          <span className="freshness-tag freshness-breaking">
            <span style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "#f87171", display: "inline-block" }} />
            Breaking
          </span>
          <span className="source-badge">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
            5 sources
          </span>
          <span className="reading-time ml-auto">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            1 min
          </span>
        </div>
        <h3 className="font-bold text-lg mb-3" style={{ color: "var(--text-primary)" }}>
          Fed Holds Rates Amid Market Uncertainty
        </h3>
        <div className="flex gap-2 mb-4">
          <div className="summary-bar" />
          <div>
            <p className="text-xs mb-1 wordmark" style={{ color: "var(--accent)" }}>the gist</p>
            {CARD_BULLETS.map((b, i) => (
              <div key={i} className="flex gap-1.5 items-start mb-1">
                <span className="mt-1.5 shrink-0" style={{ color: "var(--accent)", fontSize: 6 }}>●</span>
                <p className="text-sm" style={{ color: "var(--text-primary)" }}>{b}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            <span className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>↑ 24</span>
            <span className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>↓ 3</span>
          </div>
          <span className="px-3 py-1 rounded-full text-xs flex items-center gap-1" style={{ backgroundColor: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            8
          </span>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/feed");
    });
  }, [router]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    document.querySelectorAll(".animate-ready").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <main style={{ backgroundColor: "var(--bg)", minHeight: "100vh" }}>

      {/* Nav */}
      <nav
        className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
        style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--nav-bg)", backdropFilter: "blur(12px)" }}
      >
        <span className="wordmark text-xl font-bold">gists</span>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/sign-in"
            className="text-sm px-4 py-2 rounded-full transition-colors"
            style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="text-sm px-4 py-2 rounded-full font-medium transition-colors"
            style={{ backgroundColor: "var(--accent)", color: "var(--accent-on)" }}
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero — 2-column */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

        {/* Left: copy + CTAs */}
        <div
          className="flex flex-col items-center text-center lg:items-start lg:text-left"
          style={{ animation: "fadeInUp 0.7s ease both" }}
        >
          <div
            className="flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--accent)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            Live · Updated every hour
          </div>

          <h1 className="wordmark font-bold mb-4 leading-none" style={{ fontSize: "clamp(3.5rem, 10vw, 7rem)", color: "var(--text-primary)" }}>
            gists
          </h1>

          <p className="text-xl mb-3 font-medium" style={{ color: "var(--text-secondary)" }}>
            The news. In seconds.
          </p>
          <p className="text-base mb-8 max-w-md" style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
            The most important stories across tech, finance, politics, and culture — distilled to their essentials and delivered in a feed built for how you actually read.
          </p>

          <div className="flex items-center gap-2 mb-8 flex-wrap justify-center lg:justify-start">
            {CATEGORY_PILLS.map((pill) => (
              <span
                key={pill.label}
                className="px-3 py-1 rounded-full text-xs font-semibold tracking-wide"
                style={{ color: pill.color, border: `1px solid ${pill.color}`, backgroundColor: `${pill.color}18` }}
              >
                {pill.label}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/feed"
              className="px-6 py-3 rounded-full font-semibold text-sm transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: "var(--accent)", color: "var(--accent-on)" }}
            >
              Start reading →
            </Link>
            <Link
              href="/sign-up"
              className="px-6 py-3 rounded-full font-semibold text-sm transition-colors"
              style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            >
              Create account
            </Link>
          </div>
        </div>

        {/* Right: floating article card */}
        <div
          className="flex justify-center lg:justify-end"
          style={{ animation: "fadeInUp 0.7s ease 0.15s both" }}
        >
          <div className="animate-float">
            <ArticleCard />
          </div>
        </div>
      </section>

      {/* How it works — horizontal timeline */}
      <section className="px-6 pb-24 max-w-5xl mx-auto">
        <div className="text-center mb-14 animate-ready">
          <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "var(--accent)" }}>
            Transparency
          </p>
          <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            How the feed works
          </h2>
        </div>

        <div className="relative">
          {/* Connecting line — desktop only */}
          <div
            className="absolute hidden lg:block"
            style={{ top: "19px", left: "13%", right: "13%", height: "1px", backgroundColor: "var(--border)" }}
          />

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 lg:gap-6">
            {HOW_IT_WORKS.map((item, i) => (
              <div
                key={item.step}
                className="animate-ready flex gap-5 lg:flex-col lg:gap-0"
                style={{ transitionDelay: `${i * 110}ms` }}
              >
                {/* Step circle */}
                <div className="shrink-0 lg:mb-6 relative z-10">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "var(--bg)", border: "2px solid var(--border)" }}
                  >
                    <span className="text-xs font-bold tracking-wider" style={{ color: "var(--accent)" }}>{item.step}</span>
                  </div>
                </div>

                {/* Icon + title + desc */}
                <div>
                  <div className="mb-3 hidden lg:block">{item.icon}</div>
                  <h3 className="font-semibold mb-1.5" style={{ color: "var(--text-primary)" }}>{item.title}</h3>
                  <p className="text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features — card + list */}
      <section className="px-6 pb-24 max-w-5xl mx-auto">
        <div className="text-center mb-14 animate-ready">
          <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: "var(--accent)" }}>
            The story
          </p>
          <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Everything you need. Nothing you don&apos;t.
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          {/* Card */}
          <div className="animate-ready flex justify-center lg:justify-start">
            <ArticleCard />
          </div>

          {/* Feature list */}
          <div className="flex flex-col gap-8">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="animate-ready flex gap-4 items-start"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div
                  className="shrink-0 rounded-xl p-3"
                  style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{f.title}</h3>
                  <p className="text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center px-6 pb-24 animate-ready">
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Free to use. No credit card required.
        </p>
        <Link
          href="/feed"
          className="inline-block px-8 py-4 rounded-full font-semibold transition-all hover:opacity-90"
          style={{ backgroundColor: "var(--accent)", color: "var(--accent-on)" }}
        >
          Open the feed →
        </Link>
      </section>

      {/* Footer */}
      <footer
        className="text-center py-6 text-xs"
        style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)" }}
      >
        <span className="wordmark mr-2">gists</span> © {new Date().getFullYear()} · All rights reserved
      </footer>

    </main>
  );
}
