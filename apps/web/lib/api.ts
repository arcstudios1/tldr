const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "https://tldr.up.railway.app";

export type Category = "TECH" | "FINANCE" | "POLITICS" | "CULTURE" | "SPORTS";

export interface Article {
  id: string;
  title: string;
  summary: string;
  imageUrl: string | null;
  sourceUrl: string;
  sourceName: string;
  category: Category;
  publishedAt: string;
  upvotes: number;
  downvotes: number;
  commentCount: number;
}

export interface FeedResponse {
  items: Article[];
  nextCursor: string | null;
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
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  getFeed: (params: { category?: Category; cursor?: string; userId?: string }): Promise<FeedResponse> => {
    const query = new URLSearchParams();
    if (params.category) query.set("category", params.category);
    if (params.cursor) query.set("cursor", params.cursor);
    if (params.userId) query.set("userId", params.userId);
    return request<FeedResponse>(`/feed?${query}`);
  },

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
};
