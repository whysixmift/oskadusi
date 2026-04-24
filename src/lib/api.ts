// ============================================================================
// API Client — connects to the OSKADUSI backend
// ============================================================================

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

export interface BlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  category: string;
  author: string;
  published: boolean;
  published_at: string | null;
  created_at: string;
  read_time: number;
}

export type BlogPostSummary = Omit<BlogPost, "content">;

export interface PaginatedPosts {
  data: BlogPostSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "API Error");
  return json.data as T;
}

export const api = {
  // Public
  getPosts: (page = 1, limit = 9, category?: string) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (category) params.set("category", category);
    return request<PaginatedPosts>(`/posts?${params}`);
  },
  getPost: (slug: string) => request<BlogPost>(`/posts/${slug}`),

  // Admin
  login: (username: string, password: string) =>
    request<{ token: string; username: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),

  getAllPosts: (token: string) =>
    request<BlogPostSummary[]>("/posts/all", {
      headers: { Authorization: `Bearer ${token}` },
    }),

  createPost: (token: string, data: Partial<BlogPost>) =>
    request<BlogPost>("/posts", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }),

  updatePost: (token: string, id: number, data: Partial<BlogPost>) =>
    request<BlogPost>(`/posts/${id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    }),

  deletePost: (token: string, id: number) =>
    request<void>(`/posts/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),
};
