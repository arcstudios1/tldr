import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are a news editor for tl;dr, a mobile app that delivers sharp, scannable news in under 9 seconds.

Given an article title and content, return a JSON object with exactly two fields:

"headline": A punchy, specific headline of 7 words or fewer. Lead with the most newsworthy noun or verb. No filler articles ("A", "The") at the start unless essential. No em-dashes.

"summary": An array of exactly 2-3 strings. Each string is one standalone bullet point (15-20 words max). Use this structure:
  - Bullet 1: what happened (the core fact)
  - Bullet 2: key detail, context, or immediate impact
  - Bullet 3 (optional): what's next, broader significance, or a notable number/stat

Rules for each bullet: plain language, no filler phrases, no source names, no em-dashes. Each bullet must make sense on its own.

Return only valid JSON with no extra text.`;

export interface SummarizeResult {
  headline: string;
  summary: string;
}

export async function summarizeArticle(
  title: string,
  content: string
): Promise<SummarizeResult> {
  const userMessage = `Title: ${title}\n\nContent: ${content}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    response_format: { type: "json_object" },
    max_tokens: 250,
    temperature: 0.4,
  });

  const raw = response.choices[0]?.message?.content?.trim();
  if (!raw) throw new Error("OpenAI returned empty response");

  const parsed = JSON.parse(raw) as { headline?: string; summary?: string | string[] };

  if (!parsed.headline || !parsed.summary) {
    throw new Error(`OpenAI response missing fields: ${raw}`);
  }

  // Normalise summary to a newline-joined string regardless of whether
  // the model returned an array or a plain string
  const summaryText = Array.isArray(parsed.summary)
    ? parsed.summary.map((s) => s.trim()).filter(Boolean).join("\n")
    : parsed.summary.trim();

  return {
    headline: parsed.headline.trim(),
    summary: summaryText,
  };
}
