import Link from "next/link";

const FEATURES = [
  {
    icon: "⚡",
    title: "9-second reads",
    desc: "Every story distilled to its essential points. No fluff, no filler — just what you need to know.",
  },
  {
    icon: "🎯",
    title: "Your topics",
    desc: "Personalize your feed by topic and source. Tech, finance, politics, culture — or all of it.",
  },
  {
    icon: "🔇",
    title: "No noise",
    desc: "AI-curated summaries cut through clickbait and give you the signal without the noise.",
  },
];

const CATEGORY_PILLS = [
  { label: "Tech", color: "#60a5fa" },
  { label: "Finance", color: "#34d399" },
  { label: "Politics", color: "#f87171" },
  { label: "Culture", color: "#c084fc" },
];

export default function LandingPage() {
  return (
    <main style={{ backgroundColor: "var(--bg)", minHeight: "100vh" }}>

      {/* Nav */}
      <nav
        className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
        style={{ borderBottom: "1px solid var(--border)", backgroundColor: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
      >
        <span className="wordmark text-xl font-bold">tl;dr</span>
        <div className="flex items-center gap-3">
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
            style={{ backgroundColor: "var(--accent)", color: "#000" }}
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 pt-24 pb-20">
        <div className="flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full text-xs font-medium" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)", color: "var(--accent)" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
          Live · Updated every hour
        </div>

        <h1 className="wordmark font-bold mb-4 leading-none" style={{ fontSize: "clamp(4rem, 12vw, 8rem)", color: "var(--text-primary)" }}>
          tl;dr
        </h1>

        <p className="text-xl mb-3 font-medium" style={{ color: "var(--text-secondary)" }}>
          The news. In seconds.
        </p>
        <p className="text-base max-w-md mb-10" style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>
          AI-curated summaries of the most important stories across tech, finance, politics, and culture — delivered in a feed built for how you actually read.
        </p>

        {/* Category pills preview */}
        <div className="flex items-center gap-2 mb-10 flex-wrap justify-center">
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
            style={{ backgroundColor: "var(--accent)", color: "#000" }}
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
      </section>

      {/* Mock card preview */}
      <section className="flex justify-center px-6 pb-20">
        <div
          className="w-full max-w-sm rounded-2xl overflow-hidden"
          style={{ border: "1px solid var(--border)", backgroundColor: "var(--surface)" }}
        >
          {/* Mock image */}
          <div className="w-full h-48 flex items-center justify-center" style={{ backgroundColor: "#0a0a0a" }}>
            <span className="wordmark text-2xl font-bold" style={{ color: "var(--border)" }}>tl;dr</span>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs px-1.5 py-0.5 rounded border font-semibold tracking-wide" style={{ color: "#60a5fa", borderColor: "#60a5fa" }}>TECH</span>
              <span className="text-sm flex-1" style={{ color: "var(--text-secondary)" }}>TechCrunch</span>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>just now</span>
            </div>
            <h3 className="font-bold text-lg mb-3" style={{ color: "var(--text-primary)" }}>
              AI Reshapes the Modern Newsroom
            </h3>
            <div className="flex gap-2 mb-4">
              <div className="summary-bar" />
              <div>
                <p className="text-xs mb-1 wordmark" style={{ color: "var(--accent)" }}>tl;dr</p>
                {["Major publishers adopt AI tools for faster story delivery.", "Journalists focus on investigation while AI handles summaries.", "Reader engagement up 40% on AI-assisted platforms."].map((b, i) => (
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
              <span className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>💬 8</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-20 max-w-3xl mx-auto">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="p-6 rounded-2xl"
              style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{f.title}</h3>
              <p className="text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA footer */}
      <section className="text-center px-6 pb-24">
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Free to use. No credit card required.
        </p>
        <Link
          href="/feed"
          className="inline-block px-8 py-4 rounded-full font-semibold transition-all hover:opacity-90"
          style={{ backgroundColor: "var(--accent)", color: "#000" }}
        >
          Open the feed →
        </Link>
      </section>

      {/* Footer */}
      <footer
        className="text-center py-6 text-xs"
        style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)" }}
      >
        <span className="wordmark mr-2">tl;dr</span> © {new Date().getFullYear()} · All rights reserved
      </footer>

    </main>
  );
}
