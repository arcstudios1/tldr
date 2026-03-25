"use client";

import { useState } from "react";
import { api, Category } from "@/lib/api";

const CATEGORIES: Category[] = ["TECH", "FINANCE", "POLITICS", "CULTURE", "SPORTS"];

const CATEGORY_COLORS: Record<string, string> = {
  TECH: "#60a5fa",
  FINANCE: "#34d399",
  POLITICS: "#f87171",
  CULTURE: "#c084fc",
  SPORTS: "#fb923c",
};

interface Props {
  userId: string;
  email: string;
  username: string;
  onClose: () => void;
}

export function SubmitGistModal({ userId, email, username, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<Category>("TECH");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ status: string; message?: string } | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!title.trim() || !url.trim()) {
      setError("Title and URL are required");
      return;
    }

    try {
      new URL(url);
    } catch {
      setError("Please enter a valid URL");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await api.submitGist({
        userId,
        email,
        username,
        title: title.trim(),
        url: url.trim(),
        category,
        description: description.trim() || undefined,
      });
      setResult(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Submission failed";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md mx-4 rounded-2xl overflow-hidden"
        style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
            Submit a Gist
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ backgroundColor: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
          >
            ×
          </button>
        </div>

        {result ? (
          <div className="px-6 py-8 text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{
                backgroundColor: result.status === "approved" ? "#34d39920" : "#c8f65d20",
                color: result.status === "approved" ? "#34d399" : "var(--accent)",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              {result.status === "approved" ? "Auto-approved!" : "Submitted for Review"}
            </h3>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
              {result.status === "approved"
                ? "Your gist has been published to the feed."
                : "Your submission will be reviewed and published if approved. Build reputation by submitting quality gists to unlock auto-approval."}
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-full text-sm font-semibold"
              style={{ backgroundColor: "var(--accent)", color: "#000" }}
            >
              Done
            </button>
          </div>
        ) : (
          <div className="px-6 py-5 flex flex-col gap-4">
            {/* Title */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--text-muted)" }}>
                HEADLINE
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What happened?"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  backgroundColor: "var(--bg)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            {/* URL */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--text-muted)" }}>
                SOURCE URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  backgroundColor: "var(--bg)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            {/* Category pills */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--text-muted)" }}>
                CATEGORY
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={{
                      backgroundColor: category === cat ? `${CATEGORY_COLORS[cat]}20` : "var(--bg)",
                      color: category === cat ? CATEGORY_COLORS[cat] : "var(--text-muted)",
                      border: `1px solid ${category === cat ? CATEGORY_COLORS[cat] : "var(--border)"}`,
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Description (optional) */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "var(--text-muted)" }}>
                CONTEXT <span style={{ fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Why is this important?"
                rows={2}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                style={{
                  backgroundColor: "var(--bg)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            {error && (
              <p className="text-xs" style={{ color: "#f87171" }}>{error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={submitting || !title.trim() || !url.trim()}
              className="w-full py-2.5 rounded-full text-sm font-semibold transition-all disabled:opacity-40"
              style={{ backgroundColor: "var(--accent)", color: "#000" }}
            >
              {submitting ? "Submitting..." : "Submit Gist"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
