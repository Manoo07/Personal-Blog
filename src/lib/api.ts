// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8787";

// Types matching the backend API
export interface ApiPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  tags: string[];
  coverImage: string | null;
  status: "DRAFT" | "PUBLISHED";
  readingTime: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiPostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  coverImage: string | null;
  readingTime: number;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface PostListResponse {
  posts: ApiPostSummary[];
  pagination: Pagination;
}

export interface TagResponse {
  tags: { name: string; count: number }[];
  total: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expiresIn: number;
}

export interface CreatePostRequest {
  title: string;
  slug?: string;
  excerpt: string;
  content: string;
  tags?: string[];
  coverImage?: string | null;
  status?: "DRAFT" | "PUBLISHED";
}

export interface UpdatePostRequest {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  tags?: string[];
  coverImage?: string | null;
  status?: "DRAFT" | "PUBLISHED";
}

export interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, string> | Array<{ field: string; message: string }>;
}

// Token management
const TOKEN_KEY = "journal_admin_token";

export const getToken = (): string | null => {
  return sessionStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  sessionStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = (): void => {
  sessionStorage.removeItem(TOKEN_KEY);
};

export const isAuthenticated = (): boolean => {
  return !!getToken();
};

// API Client
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = getToken();

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        error: "An unexpected error occurred",
      }));
      throw new ApiClientError(
        errorData.error,
        response.status,
        errorData.code,
        errorData.details
      );
    }

    return response.json();
  }

  // Health check
  async health(): Promise<{ status: string }> {
    return this.request("/health");
  }

  // ============================================
  // Authentication
  // ============================================
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await this.request<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    setToken(response.token);
    return response;
  }

  async verifyToken(): Promise<{ valid: boolean; user: string }> {
    return this.request("/api/auth/verify", {
      method: "POST",
    });
  }

  async getCurrentUser(): Promise<{ username: string; role: string }> {
    return this.request("/api/auth/me");
  }

  logout(): void {
    removeToken();
  }

  // ============================================
  // Public Posts
  // ============================================
  async getPosts(params?: {
    limit?: number;
    offset?: number;
    tag?: string;
    sort?: "createdAt" | "updatedAt" | "title";
    order?: "asc" | "desc";
  }): Promise<PostListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.offset) searchParams.set("offset", params.offset.toString());
    if (params?.tag) searchParams.set("tag", params.tag);
    if (params?.sort) searchParams.set("sort", params.sort);
    if (params?.order) searchParams.set("order", params.order);

    const query = searchParams.toString();
    return this.request(`/api/posts${query ? `?${query}` : ""}`);
  }

  async getPostBySlug(slug: string): Promise<ApiPost> {
    return this.request(`/api/posts/${slug}`);
  }

  async getTags(): Promise<TagResponse> {
    return this.request("/api/tags");
  }

  // ============================================
  // Admin Posts
  // ============================================
  async getAdminPosts(params?: {
    limit?: number;
    offset?: number;
    tag?: string;
    sort?: "createdAt" | "updatedAt" | "title";
    order?: "asc" | "desc";
  }): Promise<PostListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.offset) searchParams.set("offset", params.offset.toString());
    if (params?.tag) searchParams.set("tag", params.tag);
    if (params?.sort) searchParams.set("sort", params.sort);
    if (params?.order) searchParams.set("order", params.order);

    const query = searchParams.toString();
    return this.request(`/api/admin/posts${query ? `?${query}` : ""}`);
  }

  async getAdminPostById(id: string): Promise<ApiPost> {
    return this.request(`/api/admin/posts/${id}`);
  }

  async createPost(data: CreatePostRequest): Promise<ApiPost> {
    return this.request("/api/admin/posts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updatePost(id: string, data: UpdatePostRequest): Promise<ApiPost> {
    return this.request(`/api/admin/posts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deletePost(id: string): Promise<{ success: boolean }> {
    return this.request(`/api/admin/posts/${id}`, {
      method: "DELETE",
    });
  }

  async publishPost(id: string): Promise<ApiPost> {
    return this.request(`/api/admin/posts/${id}/publish`, {
      method: "POST",
    });
  }

  async unpublishPost(id: string): Promise<ApiPost> {
    return this.request(`/api/admin/posts/${id}/unpublish`, {
      method: "POST",
    });
  }
}

// Custom error class
export class ApiClientError extends Error {
  status: number;
  code?: string;
  details?: Record<string, string> | Array<{ field: string; message: string }>;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: Record<string, string> | Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// Export singleton instance
export const api = new ApiClient(API_BASE_URL);
