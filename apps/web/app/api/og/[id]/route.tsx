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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let title = "Gists";
  let category = "NEWS";
  let sourceName = "";
  let sourceCount = 1;
  let summary = "";

  try {
    const res = await fetch(`${API_URL}/feed/${id}`, {
      next: { revalidate: 600 },
    });
    if (res.ok) {
      const data = await res.json();
      title = data.title ?? title;
      category = data.category ?? category;
      sourceName = data.sourceName ?? "";
      sourceCount = data.sourceCount ?? 1;
      const bullets = (data.summary ?? "").split("\n").filter(Boolean);
      summary = bullets[0] ?? "";
      if (summary.length > 120) summary = summary.slice(0, 117) + "...";
    }
  } catch {
    // fall through with defaults
  }

  const catColor = CATEGORY_COLORS[category] ?? "#60a5fa";

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0a0a0a",
          padding: "48px 56px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Top bar: logo + category */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 40,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Speech bubble logo */}
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: "#c8f65d",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  color: "#0a0a0a",
                  lineHeight: 1,
                }}
              >
                g
              </div>
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: "#e5e5e5",
                letterSpacing: "-0.02em",
              }}
            >
              gists
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            {sourceCount > 1 && (
              <div
                style={{
                  fontSize: 16,
                  color: "#888",
                  padding: "6px 14px",
                  borderRadius: 20,
                  border: "1px solid #333",
                }}
              >
                {sourceCount} sources
              </div>
            )}
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: catColor,
                padding: "6px 14px",
                borderRadius: 20,
                border: `1px solid ${catColor}`,
              }}
            >
              {category}
            </div>
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: title.length > 80 ? 42 : 52,
            fontWeight: 800,
            color: "#f5f5f5",
            lineHeight: 1.15,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {title}
        </div>

        {/* Summary excerpt */}
        {summary && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                width: 3,
                height: 48,
                backgroundColor: "#c8f65d",
                borderRadius: 2,
                flexShrink: 0,
              }}
            />
            <div
              style={{
                fontSize: 20,
                color: "#aaa",
                lineHeight: 1.4,
              }}
            >
              {summary}
            </div>
          </div>
        )}

        {/* Bottom bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #222",
            paddingTop: 20,
          }}
        >
          <div style={{ fontSize: 18, color: "#666" }}>
            {sourceName ? `via ${sourceName}` : ""}
          </div>
          <div style={{ fontSize: 18, color: "#666" }}>gists.news</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
