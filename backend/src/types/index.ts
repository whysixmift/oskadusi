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
  updated_at: string;
  read_time: number; // minutes
}

export interface CreatePostDTO {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  image?: string;
  category?: string;
  author?: string;
  published?: boolean;
}

export type UpdatePostDTO = Partial<CreatePostDTO>;

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AdminUser {
  id: number;
  username: string;
  created_at: string;
}

export interface LoginDTO {
  username: string;
  password: string;
}

export interface AuthPayload {
  userId: number;
  username: string;
}
