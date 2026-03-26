import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://tldr.up.railway.app";

const CATEGORY_COLORS: Record<string, string> = {
  TECH: "#60a5fa",
  FINANCE: "#34d399",
  POLITICS: "#f87171",
  CULTURE: "#c084fc",
  SPORTS: "#fb923c",
};

// Width and height of the story image (1080x1920 = 9:16 portrait)
const W = 1080;
const H = 1920;

// Pixel boundary where the image section ends and text section begins
const IMAGE_BOTTOM = Math.round(H * 0.52); // ~55% of the height

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let title = "Gists";
  let category = "NEWS";
  let sourceName = "";
  let sourceCount = 1;
  let summary = "";
  let imageUrl: string | null = null;

  try {
    const res = await fetch(`${API_URL}/feed/${id}`);
    if (res.ok) {
      const data = await res.json();
      title = data.title ?? title;
      category = data.category ?? category;
      sourceName = data.sourceName ?? "";
      sourceCount = data.sourceCount ?? 1;
      imageUrl = data.imageUrl ?? null;
      const raw = (data.summary ?? "").split("\n").filter(Boolean) as string[];
      // Keep up to 3 bullets, each trimmed
      summary = raw
        .slice(0, 3)
        .map((b: string) => b.replace(/^[\u2022\-\*]\s*/, "").trim())
        .join("\n");
    }
  } catch {
    // fall through with defaults
  }

  const catColor = CATEGORY_COLORS[category] ?? "#60a5fa";
  const bullets = summary.split("\n").filter(Boolean);

  const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
  const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

  // Try to fetch the article image as a data URL so @vercel/og can render it.
  // Must use Web APIs only (no Buffer) since this runs on the Edge runtime.
  let imageDataUrl: string | null = null;
  if (imageUrl) {
    try {
      const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(4000) });
      if (imgRes.ok) {
        const mime = imgRes.headers.get("content-type")?.split(";")[0].trim() ?? "image/jpeg";
        const contentLength = Number(imgRes.headers.get("content-length") ?? 0);
        if (ALLOWED_IMAGE_TYPES.has(mime) && (contentLength === 0 || contentLength <= MAX_IMAGE_BYTES)) {
          const buf = await imgRes.arrayBuffer();
          if (buf.byteLength <= MAX_IMAGE_BYTES) {
            // Convert ArrayBuffer → base64 using only Web APIs (Edge-safe)
            const bytes = new Uint8Array(buf);
            let binary = "";
            const chunkSize = 8192;
            for (let i = 0; i < bytes.length; i += chunkSize) {
              binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
            }
            const b64 = btoa(binary);
            imageDataUrl = `data:${mime};base64,${b64}`;
          }
        }
      }
    } catch {
      // no image — fall through to plain dark background
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0a0a0a",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* ── UPPER SECTION: featured image ───────────────────────────── */}
        <div
          style={{
            width: W,
            height: IMAGE_BOTTOM,
            display: "flex",
            position: "relative",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {imageDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageDataUrl}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            /* Fallback: subtle dark gradient placeholder */
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "linear-gradient(180deg, #111111 0%, #0a0a0a 100%)",
                display: "flex",
              }}
            />
          )}

          {/* Gradient overlay fading to dark at the bottom */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 220,
              background:
                "linear-gradient(to bottom, rgba(10,10,10,0) 0%, rgba(10,10,10,0.95) 100%)",
              display: "flex",
            }}
          />

          {/* gists logo — top-right, inside safe zone */}
          <div
            style={{
              position: "absolute",
              top: 80,
              right: 72,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 40,
                fontWeight: 800,
                color: "#ffffff",
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}
            >
              gists
            </div>
            {/* Speech bubble icon */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 18,
                  backgroundColor: "#ffffff",
                  borderRadius: 5,
                  display: "flex",
                  position: "relative",
                }}
              />
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "5px solid transparent",
                  borderRight: "0px solid transparent",
                  borderTop: "7px solid #ffffff",
                  marginLeft: -14,
                  marginTop: -1,
                  display: "flex",
                }}
              />
            </div>
          </div>
        </div>

        {/* ── LOWER SECTION: text content ─────────────────────────────── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "52px 72px 80px",
          }}
        >
          {/* Main content stack */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {/* Category badge */}
            <div
              style={{
                display: "flex",
                marginBottom: 28,
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: catColor,
                  border: `2px solid ${catColor}`,
                  borderRadius: 40,
                  padding: "6px 24px",
                  letterSpacing: "0.06em",
                  lineHeight: 1,
                }}
              >
                {category}
              </div>
            </div>

            {/* Headline */}
            <div
              style={{
                fontSize: title.length > 60 ? 56 : 64,
                fontWeight: 800,
                color: "#ffffff",
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                marginBottom: 36,
              }}
            >
              {title}
            </div>

            {/* Summary bullets */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {bullets.map((bullet, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      backgroundColor: catColor,
                      flexShrink: 0,
                      marginTop: 14,
                    }}
                  />
                  <div
                    style={{
                      fontSize: 30,
                      color: "#9ca3af",
                      lineHeight: 1.45,
                    }}
                  >
                    {bullet}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom: source attribution + gists.news watermark */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              borderTop: "1px solid #1f2937",
              paddingTop: 32,
            }}
          >
            <div
              style={{
                fontSize: 26,
                color: "#4b5563",
              }}
            >
              {sourceCount > 1 ? `${sourceCount} sources` : ""}
              {sourceCount > 1 && sourceName ? " · " : ""}
              {sourceName}
            </div>
            <div
              style={{
                fontSize: 28,
                color: "#6b7280",
                fontWeight: 600,
                letterSpacing: "0.01em",
              }}
            >
              gists.news
            </div>
          </div>
        </div>
      </div>
    ),
    { width: W, height: H }
  );
}
