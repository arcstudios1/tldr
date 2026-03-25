const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://tldr.up.railway.app";

export type Category = "TECH" | "FINANCE" | "POLITICS" | "CULTURE" | "SPORTS";
export type FeedSort = "ranked" | "latest";

export interface Article {
  id: string;
  title: string;
  summary: string;
  imageUrl: string | null;
  sourceUrl: string;
  sourceName: string;
  category: Category;
  publishedAt: string;
  sourceCount: number;
  importanceScore: number;
  feedScore: number;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  userVote?: number;
}

export interface Preferences {
  categories: Category[];
  excludedSources: string[];
}

export interface FeedResponse {
  items: Article[];
  nextCursor: string | null;
}

export interface SearchResponse {
  items: Article[];
  nextCursor: string | null;
  query: string;
}

export interface DigestResponse {
  date: string;
  items: Article[];
  stats: {
    totalArticles: number;
    totalSources: number;
    categories: { category: Category; count: number }[];
  };
}

export interface GistSource {
  id: string;
  sourceName: string;
  sourceUrl: string;
  imageUrl: string | null;
}

export interface SourcesResponse {
  articleId: string;
  sourceCount: number;
  sources: GistSource[];
}

export interface Comment {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; username: string };
}

export interface CommentsResponse {
  items: Comment[];
  nextCursor: string | null;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.detail || body?.error || "";
    } catch { /* ignore */ }
    const err = new Error(`API error ${res.status}${detail ? `: ${detail}` : ""}`) as Error & { detail?: string };
    err.detail = detail;
    throw err;
  }
  return res.json() as Promise<T>;
}

export interface PredictionMarket {
  id: string;
  externalId: string;
  platform: string;
  question: string;
  category: Category;
  yesPrice: number;
  volume: number;
  url: string;
  affiliateUrl: string | null;
  imageUrl: string | null;
  endDate: string | null;
}

export interface MarketsResponse {
  items: PredictionMarket[];
}

export interface ReferralInfo {
  code: string;
  link: string;
  totalReferred: number;
}

export interface ReferralStats {
  total: number;
  completed: number;
  pending: number;
  referrals: { code: string; status: string; createdAt: string; completedAt: string | null }[];
}

export interface BreakingResponse {
  count: number;
  items: (Article & { breakingScore: number })[];
  lastChecked: string;
}

export interface UserSubmission {
  id: string;
  title: string;
  url: string;
  category: Category;
  description: string | null;
  status: string;
  createdAt: string;
  user?: { username: string; reputation: number };
}

export const api = {
  getPreferences: (userId: string): Promise<Preferences> =>
    request<Preferences>(`/users/${userId}/preferences`),

  savePreferences: (
    userId: string,
    email: string,
    username: string,
    categories: Category[],
    excludedSources: string[]
  ): Promise<Preferences> =>
    request<Preferences>(`/users/${userId}/preferences`, {
      method: "PUT",
      body: JSON.stringify({ email, username, categories, excludedSources }),
    }),

  getFeed: (params: {
    category?: Category;
    cursor?: string;
    userId?: string;
    sort?: FeedSort;
  }): Promise<FeedResponse> => {
    const query = new URLSearchParams();
    if (params.category) query.set("category", params.category);
    if (params.cursor) query.set("cursor", params.cursor);
    if (params.userId) query.set("userId", params.userId);
    if (params.sort) query.set("sort", params.sort);
    return request<FeedResponse>(`/feed?${query}`);
  },

  search: (q: string, limit = 15): Promise<SearchResponse> => {
    const query = new URLSearchParams({ q, limit: String(limit) });
    return request<SearchResponse>(`/search?${query}`);
  },

  getDigest: (): Promise<DigestResponse> =>
    request<DigestResponse>("/digest"),

  getSources: (articleId: string): Promise<SourcesResponse> =>
    request<SourcesResponse>(`/articles/${articleId}/sources`),

  getGist: (id: string): Promise<Article & { sources?: GistSource[] }> =>
    request<Article & { sources?: GistSource[] }>(`/feed/${id}`),

  vote: (articleId: string, userId: string, email: string, username: string, value: 1 | -1 | 0) =>
    request<{ upvotes: number; downvotes: number; userVote: number }>(
      `/articles/${articleId}/vote`,
      { method: "POST", body: JSON.stringify({ userId, email, username, value }) }
    ),

  getBookmarks: (userId: string): Promise<Article[]> =>
    request<Article[]>(`/users/${userId}/bookmarks`),

  addBookmark: (articleId: string, userId: string, email: string, username: string) =>
    request<{ bookmarked: boolean }>(`/users/${userId}/bookmarks`, {
      method: "POST",
      body: JSON.stringify({ articleId, email, username }),
    }),

  removeBookmark: (articleId: string, userId: string) =>
    request<{ bookmarked: boolean }>(`/users/${userId}/bookmarks/${articleId}`, {
      method: "DELETE",
    }),

  getComments: (articleId: string): Promise<CommentsResponse> =>
    request<CommentsResponse>(`/articles/${articleId}/comments`),

  postComment: (articleId: string, userId: string, email: string, username: string, body: string): Promise<Comment> =>
    request<Comment>(`/articles/${articleId}/comments`, {
      method: "POST",
      body: JSON.stringify({ userId, email, username, body }),
    }),

  getMarkets: (category?: Category): Promise<MarketsResponse> => {
    const path = category ? `/markets/${category}` : "/markets";
    return request<MarketsResponse>(path);
  },

  getReferral: (userId: string): Promise<ReferralInfo> =>
    request<ReferralInfo>(`/users/${userId}/referral`),

  getReferralStats: (userId: string): Promise<ReferralStats> =>
    request<ReferralStats>(`/users/${userId}/referral/stats`),

  redeemReferral: (code: string, email: string) =>
    request<{ success: boolean; message: string }>("/users/referral/redeem", {
      method: "POST",
      body: JSON.stringify({ code, email }),
    }),

  submitGist: (params: {
    userId: string;
    email: string;
    username: string;
    title: string;
    url: string;
    category: Category;
    description?: string;
  }) =>
    request<{ id: string; status: string; message?: string }>("/gists/submit", {
      method: "POST",
      body: JSON.stringify(params),
    }),

  getSubmissions: (userId?: string): Promise<{ items: UserSubmission[] }> => {
    const query = userId ? `?userId=${userId}` : "";
    return request<{ items: UserSubmission[] }>(`/gists/submissions${query}`);
  },

  getBreaking: (): Promise<BreakingResponse> =>
    request<BreakingResponse>("/breaking"),
};
