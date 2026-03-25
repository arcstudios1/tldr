import { Metadata } from "next";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://tldr.up.railway.app";

const CATEGORY_COLORS: Record<string, string> = {
  TECH: "#60a5fa",
  FINANCE: "#34d399",
  POLITICS: "#f87171",
  CULTURE: "#c084fc",
  SPORTS: "#fb923c",
};

interface GistData {
  id: string;
  title: string;
  summary: string;
  imageUrl: string | null;
  sourceUrl: string;
  sourceName: string;
  category: string;
  publishedAt: string;
  sourceCount: number;
  commentCount: number;
  upvotes: number;
  downvotes: number;
  sources?: { id: string; sourceName: string; sourceUrl: string }[];
}

async function fetchGist(id: string): Promise<GistData | null> {
  try {
    const res = await fetch(`${API_URL}/feed/${id}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const gist = await fetchGist(id);
  if (!gist) {
    return { title: "Gist not found — Gists" };
  }

  const bullets = gist.summary.split("\n").filter(Boolean);
  const description = bullets.join(" ");

  const ogImage = `https://gists.news/api/og/${id}`;

  return {
    title: `${gist.title} — Gists`,
    description,
    openGraph: {
      title: gist.title,
      description,
      type: "article",
      publishedTime: gist.publishedAt,
      siteName: "Gists",
      images: [{ url: ogImage, width: 1200, height: 630, alt: gist.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: gist.title,
      description,
      images: [ogImage],
    },
  };
}

export default async function GistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const gist = await fetchGist(id);

  if (!gist) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ backgroundColor: "var(--bg)" }}
      >
        <h1
          className="text-xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          Gist not found
        </h1>
        <Link
          href="/feed"
          className="text-sm px-5 py-2 rounded-full"
          style={{
            backgroundColor: "var(--accent)",
            color: "#000",
          }}
        >
          Go to feed →
        </Link>
      </div>
    );
  }

  const catColor = CATEGORY_COLORS[gist.category] ?? "#60a5fa";
  const bullets = gist.summary.split("\n").filter(Boolean);
  const publishedDate = new Date(gist.publishedAt).toLocaleDateString(
    "en-US",
    { weekday: "long", month: "long", day: "numeric", year: "numeric" }
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: gist.title,
    description: bullets.join(" "),
    datePublished: gist.publishedAt,
    publisher: { "@type": "Organization", name: "Gists", url: "https://gists.news" },
    mainEntityOfPage: `https://gists.news/gist/${gist.id}`,
    ...(gist.imageUrl ? { image: gist.imageUrl } : {}),
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Nav */}
      <nav
        className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
        style={{
          borderBottom: "1px solid var(--border)",
          backgroundColor: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(12px)",
        }}
      >
        <Link
          href="/"
          className="wordmark text-xl font-bold"
          style={{ color: "var(--text-primary)" }}
        >
          gists
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/feed"
            className="text-sm px-4 py-2 rounded-full"
            style={{
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
          >
            Open feed
          </Link>
          <Link
            href="/sign-up"
            className="text-sm px-4 py-2 rounded-full font-medium"
            style={{ backgroundColor: "var(--accent)", color: "#000" }}
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Content */}
      <article className="max-w-2xl mx-auto px-6 pt-10 pb-20">
        {/* Category + meta */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <span
            className="text-xs font-semibold px-2 py-1 rounded border"
            style={{ color: catColor, borderColor: catColor }}
          >
            {gist.category}
          </span>
          {gist.sourceCount > 1 && (
            <span className="source-badge">
              {gist.sourceCount} sources
            </span>
          )}
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {publishedDate}
          </span>
        </div>

        {/* Image */}
        {gist.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={gist.imageUrl}
            alt={gist.title}
            className="w-full rounded-2xl object-cover mb-8"
            style={{ maxHeight: 400, backgroundColor: "var(--surface)" }}
          />
        )}

        {/* Title */}
        <h1
          className="text-3xl font-bold mb-6"
          style={{ color: "var(--text-primary)", lineHeight: 1.3 }}
        >
          {gist.title}
        </h1>

        {/* Source attribution */}
        <div className="flex items-center gap-2 mb-8">
          <span className="text-sm" style={{ color: "var(--text-muted)" }}>
            via
          </span>
          <a
            href={gist.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium hover:underline"
            style={{ color: "var(--accent)" }}
          >
            {gist.sourceName}
          </a>
        </div>

        {/* Summary */}
        <div
          className="rounded-2xl p-6 mb-8"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="flex gap-3">
            <div className="summary-bar" />
            <div className="flex flex-col gap-2">
              <span
                className="wordmark text-xs tracking-wide"
                style={{ color: "var(--accent)", fontSize: 11 }}
              >
                the gist
              </span>
              {bullets.map((point, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span
                    className="shrink-0 mt-1.5"
                    style={{ color: "var(--accent)", fontSize: 6 }}
                  >
                    ●
                  </span>
                  <p
                    className="text-base leading-relaxed"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {point}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div
          className="flex items-center gap-4 text-xs mb-8"
          style={{ color: "var(--text-muted)" }}
        >
          <span>↑ {gist.upvotes}</span>
          <span>↓ {gist.downvotes}</span>
          <span>{gist.commentCount} comments</span>
        </div>

        {/* Sources list */}
        {gist.sources && gist.sources.length > 1 && (
          <div className="mb-8">
            <h2
              className="text-xs font-semibold tracking-widest mb-4"
              style={{ color: "var(--text-muted)" }}
            >
              ALL SOURCES
            </h2>
            <div className="flex flex-col gap-2">
              {gist.sources.map((src) => (
                <a
                  key={src.id}
                  href={src.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
                  style={{
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      backgroundColor: `${catColor}20`,
                      color: catColor,
                    }}
                  >
                    {src.sourceName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{src.sourceName}</p>
                    <p
                      className="text-xs truncate"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {src.sourceUrl}
                    </p>
                  </div>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ color: "var(--text-muted)", flexShrink: 0 }}
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Read full story */}
        <div className="text-center mb-12">
          <a
            href={gist.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: "var(--accent)", color: "#000" }}
          >
            Read full story on {gist.sourceName} →
          </a>
        </div>

        {/* Sign-up CTA */}
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <h2
            className="wordmark text-2xl font-bold mb-3"
            style={{ color: "var(--text-primary)" }}
          >
            gists
          </h2>
          <p
            className="text-sm mb-6 max-w-sm mx-auto"
            style={{ color: "var(--text-muted)", lineHeight: 1.6 }}
          >
            Get the stories that matter, distilled to their essentials.
            Personalized feed, daily digest, and more — free forever.
          </p>
          <Link
            href="/sign-up"
            className="inline-block px-6 py-3 rounded-full text-sm font-semibold transition-all hover:opacity-90"
            style={{ backgroundColor: "var(--accent)", color: "#000" }}
          >
            Create free account →
          </Link>
        </div>
      </article>

      {/* Footer */}
      <footer
        className="text-center py-6 text-xs"
        style={{
          borderTop: "1px solid var(--border)",
          color: "var(--text-muted)",
        }}
      >
        <span className="wordmark mr-2">gists</span> ©{" "}
        {new Date().getFullYear()} · All rights reserved
      </footer>
    </div>
  );
}
