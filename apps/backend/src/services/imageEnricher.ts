import { prisma } from "../db/client";

const TIMEOUT_MS = 6_000;
const CONCURRENT = 5;
const MAX_PER_RUN = 80;
const BATCH_DELAY_MS = 250;

async function fetchOgImage(sourceUrl: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(sourceUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; tldr-bot/1.0; +https://tldr.app)",
        "Accept": "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return null;

    const html = await res.text();

    // og:image — property before content, or content before property
    const ogImage =
      html.match(/<meta\b[^>]*?\bproperty=["']og:image["'][^>]*?\bcontent=["']([^"']+)["'][^>]*>/i)?.[1] ??
      html.match(/<meta\b[^>]*?\bcontent=["']([^"']+)["'][^>]*?\bproperty=["']og:image["'][^>]*>/i)?.[1] ??
      // twitter:image fallback
      html.match(/<meta\b[^>]*?\bname=["']twitter:image["'][^>]*?\bcontent=["']([^"']+)["'][^>]*>/i)?.[1] ??
      html.match(/<meta\b[^>]*?\bcontent=["']([^"']+)["'][^>]*?\bname=["']twitter:image["'][^>]*>/i)?.[1] ??
      null;

    if (!ogImage) return null;

    // Resolve relative URLs
    if (ogImage.startsWith("//")) return `https:${ogImage}`;
    if (ogImage.startsWith("/")) {
      const origin = new URL(sourceUrl).origin;
      return `${origin}${ogImage}`;
    }

    return ogImage;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function enrichMissingImages(): Promise<void> {
  const articles = await prisma.article.findMany({
    where: {
      imageUrl: null,
      publishedAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
    },
    orderBy: { feedScore: "desc" },
    take: MAX_PER_RUN,
    select: { id: true, sourceUrl: true, title: true },
  });

  if (articles.length === 0) {
    console.log("[ImageEnricher] No imageless articles to enrich.");
    return;
  }

  console.log(`[ImageEnricher] Enriching ${articles.length} articles...`);
  let enriched = 0;

  for (let i = 0; i < articles.length; i += CONCURRENT) {
    const batch = articles.slice(i, i + CONCURRENT);

    await Promise.all(
      batch.map(async (article) => {
        const imageUrl = await fetchOgImage(article.sourceUrl);
        if (imageUrl) {
          await prisma.article.update({
            where: { id: article.id },
            data: { imageUrl },
          });
          enriched++;
        }
      })
    );

    if (i + CONCURRENT < articles.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  console.log(`[ImageEnricher] Done. Enriched ${enriched}/${articles.length} articles.`);
}
