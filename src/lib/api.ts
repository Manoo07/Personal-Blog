// API Configuration
const PRODUCTION_API_URL = "https://journal-be.manoharboinapalli2003.workers.dev";

const resolveApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL?.trim();

  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }

  if (import.meta.env.DEV) {
    return "http://localhost:8787";
  }

  return PRODUCTION_API_URL;
};

const API_BASE_URL = resolveApiBaseUrl();
const IMAGE_UPLOAD_ENDPOINT = import.meta.env.VITE_IMAGE_UPLOAD_ENDPOINT?.trim() || "/api/admin/uploads/image";

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
  order: number;
  sectionId: string | null;
  section?: SectionSummary | null;
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
  order: number;
  /** sectionId is not returned by list endpoints — use section?.id instead */
  sectionId?: string | null;
  section?: SectionSummary | null;
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
  sectionId?: string | null;
  order?: number;
}

export interface UpdatePostRequest {
  title?: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  tags?: string[];
  coverImage?: string | null;
  status?: "DRAFT" | "PUBLISHED";
  sectionId?: string | null;
  order?: number;
}

export interface ReorderPostsRequest {
  posts: { id: string; order: number }[];
}

// ============================================
// Section Types
// ============================================

/** Lightweight section reference embedded inside posts */
export interface SectionSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

/** Full section object (flat, from admin/detail responses) */
export interface ApiSection {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  order: number;
  parentId: string | null;
  showInProgress: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    posts: number;
    children: number;
  };
}

/** Section with recursively nested children (used in the tree) */
export interface ApiSectionNode extends ApiSection {
  children: ApiSectionNode[];
  posts?: ApiPostSummary[];
}

/** Breadcrumb item returned by GET /api/sections/{slug} */
export interface SectionBreadcrumb {
  id: string;
  slug: string;
  name: string;
}

// ── Response envelopes ────────────────────────────────────────────

export interface SectionTreeResponse {
  sections: ApiSectionNode[];
}

export interface SectionDetailResponse {
  section: ApiSection & { breadcrumbs?: SectionBreadcrumb[] };
}

export interface SectionPostsResponse {
  posts: ApiPostSummary[];
  pagination: Pagination;
}

export interface SectionMutationResponse {
  section: ApiSection;
}

export interface SectionDeleteResponse {
  message: string;
}

// ── Request bodies ────────────────────────────────────────────────

export interface CreateSectionRequest {
  name: string;
  slug: string;
  description?: string;
  parentId?: string | null;
  order?: number;
  showInProgress?: boolean;
}

export interface UpdateSectionRequest {
  name?: string;
  slug?: string;
  description?: string;
  parentId?: string | null;
  order?: number;
  showInProgress?: boolean;
}

export interface MovePostsRequest {
  postIds: string[];
  sectionId: string | null;
}

export interface ReorderSectionsRequest {
  sections: { id: string; order: number }[];
}

export interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, string> | Array<{ field: string; message: string }>;
}

export interface UploadImageResponse {
  url: string;
}

// ============================================
// User Types
// ============================================

export interface UserRegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface UserVerifyEmailRequest {
  email: string;
  otp: string;
}

export interface UserLoginRequest {
  email: string;
  password: string;
}

export interface UserLoginResponse {
  token: string;
  user: { id: string; email: string; username: string };
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  isVerified: boolean;
  createdAt: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UserProgressItem {
  postId: string;
  postSlug: string;
  postTitle: string;
  sectionId: string | null;
  completedAt: string;
}

export interface SectionStatPost {
  postId: string;
  postSlug: string;
  postTitle: string;
  isCompleted: boolean;
}

export interface SectionStatNode {
  sectionId: string;
  sectionName: string;
  sectionSlug: string;
  total: number;
  completed: number;
  posts: SectionStatPost[];
  children: SectionStatNode[];
}

export interface UserStatsResponse {
  totalPosts: number;
  completedPosts: number;
  completionPercent: number;
  sections: SectionStatNode[];
}

export interface ApiNote {
  id: string;
  selectedText: string;
  note: string | null;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteListResponse {
  notes: ApiNote[];
}

export interface CreateNoteRequest {
  selectedText: string;
  note?: string | null;
  color?: string;
}

export interface UpdateNoteRequest {
  note?: string | null;
  color?: string;
}

// ── User token management (localStorage, separate from admin sessionStorage) ──

const USER_TOKEN_KEY = "journal_user_token";
const USER_DATA_KEY = "journal_user_data";

export const getUserToken = (): string | null => localStorage.getItem(USER_TOKEN_KEY);

export const setUserToken = (token: string): void =>
  localStorage.setItem(USER_TOKEN_KEY, token);

export const removeUserToken = (): void => {
  localStorage.removeItem(USER_TOKEN_KEY);
  localStorage.removeItem(USER_DATA_KEY);
};

export const isUserLoggedIn = (): boolean => !!getUserToken();

export const getStoredUser = (): UserLoginResponse["user"] | null => {
  const raw = localStorage.getItem(USER_DATA_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};

export const setStoredUser = (user: UserLoginResponse["user"]): void =>
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));

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

  private async uploadRequest<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = getToken();

    const headers: HeadersInit = {};
    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({
        error: "Image upload failed",
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

  async getNextPostOrder(): Promise<{ nextOrder: number }> {
    return this.request("/api/admin/posts/next-order");
  }

  async reorderPosts(data: ReorderPostsRequest): Promise<{ updated: number }> {
    return this.request("/api/admin/posts/reorder", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ============================================
  // Sections  (routes per OpenAPI spec)
  // ============================================

  /** GET /api/sections/tree — public */
  async getSectionTree(): Promise<SectionTreeResponse> {
    return this.request("/api/sections/tree");
  }

  /** GET /api/sections/{slug} — public */
  async getSectionBySlug(
    slug: string,
    includeChildren = true
  ): Promise<SectionDetailResponse> {
    const q = includeChildren ? "?includeChildren=true" : "";
    return this.request(`/api/sections/${slug}${q}`);
  }

  /** GET /api/sections/{slug}/posts — public */
  async getSectionPosts(
    slug: string,
    params?: { includeChildren?: boolean; limit?: number; offset?: number }
  ): Promise<SectionPostsResponse> {
    const sp = new URLSearchParams();
    if (params?.includeChildren != null)
      sp.set("includeChildren", String(params.includeChildren));
    if (params?.limit != null) sp.set("limit", String(params.limit));
    if (params?.offset != null) sp.set("offset", String(params.offset));
    const q = sp.toString();
    return this.request(`/api/sections/${slug}/posts${q ? `?${q}` : ""}`);
  }

  /** POST /api/sections — auth required, returns { section } */
  async createSection(data: CreateSectionRequest): Promise<SectionMutationResponse> {
    return this.request("/api/sections", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /** PUT /api/sections/{id} — auth required, returns { section } */
  async updateSection(
    id: string,
    data: UpdateSectionRequest
  ): Promise<SectionMutationResponse> {
    return this.request(`/api/sections/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  /** DELETE /api/sections/{id} — auth required, returns { message } */
  async deleteSection(id: string, mode?: "cascade" | "promote"): Promise<SectionDeleteResponse> {
    const q = mode ? `?mode=${mode}` : "";
    return this.request(`/api/sections/${id}${q}`, {
      method: "DELETE",
    });
  }

  /** POST /api/sections/move-posts — auth required */
  async movePosts(data: MovePostsRequest): Promise<{ message: string; movedCount: number }> {
    return this.request("/api/sections/move-posts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /** PUT /api/sections/reorder — auth required */
  async reorderSections(data: ReorderSectionsRequest): Promise<{ updated: number }> {
    return this.request("/api/sections/reorder", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  // ============================================
  // User Auth (uses user JWT, not admin JWT)
  // ============================================

  private async userRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token = getUserToken();
    const headers: HeadersInit = { "Content-Type": "application/json", ...options.headers };
    if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const errorData: ApiError = await response.json().catch(() => ({ error: "Unexpected error" }));
      throw new ApiClientError(errorData.error, response.status, errorData.code, errorData.details);
    }
    return response.json();
  }

  async registerUser(data: UserRegisterRequest): Promise<{ message: string }> {
    return this.request("/api/user/auth/register", { method: "POST", body: JSON.stringify(data) });
  }

  async verifyUserEmail(data: UserVerifyEmailRequest): Promise<{ message: string }> {
    return this.request("/api/user/auth/verify-email", { method: "POST", body: JSON.stringify(data) });
  }

  async loginUser(data: UserLoginRequest): Promise<UserLoginResponse> {
    const res = await this.request<UserLoginResponse>("/api/user/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
    setUserToken(res.token);
    setStoredUser(res.user);
    return res;
  }

  async forgotPassword(data: { email: string }): Promise<{ message: string }> {
    return this.request("/api/user/auth/forgot-password", { method: "POST", body: JSON.stringify(data) });
  }

  async resetPassword(data: ResetPasswordRequest): Promise<{ message: string }> {
    return this.request("/api/user/auth/reset-password", { method: "POST", body: JSON.stringify(data) });
  }

  async updateUserPassword(data: UpdatePasswordRequest): Promise<{ message: string }> {
    return this.userRequest("/api/user/auth/password", { method: "PUT", body: JSON.stringify(data) });
  }

  async getMe(): Promise<{ user: UserProfile }> {
    return this.userRequest("/api/user/auth/me");
  }

  logoutUser(): void {
    removeUserToken();
  }

  // ============================================
  // User Progress
  // ============================================

  async markPostComplete(postSlug: string): Promise<{ completedAt: string }> {
    return this.userRequest(`/api/user/progress/${postSlug}`, { method: "POST" });
  }

  async unmarkPostComplete(postSlug: string): Promise<{ message: string }> {
    return this.userRequest(`/api/user/progress/${postSlug}`, { method: "DELETE" });
  }

  async getUserProgress(): Promise<{ completed: UserProgressItem[] }> {
    return this.userRequest("/api/user/progress");
  }

  async getUserStats(): Promise<UserStatsResponse> {
    return this.userRequest("/api/user/progress/stats");
  }

  // ============================================
  // User Notes
  // ============================================

  async createNote(postSlug: string, data: CreateNoteRequest): Promise<ApiNote> {
    return this.userRequest(`/api/user/notes/${postSlug}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getNotes(postSlug: string): Promise<NoteListResponse> {
    return this.userRequest(`/api/user/notes/${postSlug}`);
  }

  async updateNote(noteId: string, data: UpdateNoteRequest): Promise<ApiNote> {
    return this.userRequest(`/api/user/notes/${noteId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteNote(noteId: string): Promise<{ success: boolean }> {
    return this.userRequest(`/api/user/notes/${noteId}`, { method: "DELETE" });
  }

  async uploadImage(file: File): Promise<UploadImageResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await this.uploadRequest<Record<string, unknown>>(IMAGE_UPLOAD_ENDPOINT, formData);
    const url =
      (typeof response.url === "string" && response.url) ||
      (typeof response.imageUrl === "string" && response.imageUrl) ||
      (typeof response.location === "string" && response.location) ||
      (typeof response.secure_url === "string" && response.secure_url) ||
      (typeof response.data === "object" && response.data !== null && typeof (response.data as Record<string, unknown>).url === "string"
        ? ((response.data as Record<string, unknown>).url as string)
        : "");

    if (!url) {
      throw new ApiClientError(
        "Upload succeeded but no image URL was returned",
        500,
        "UPLOAD_URL_MISSING"
      );
    }

    return { url };
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
