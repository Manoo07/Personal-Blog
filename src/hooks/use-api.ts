import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  api,
  ApiPost,
  ApiSectionNode,
  ApiPostSummary,
  SectionTreeResponse,
  SectionDetailResponse,
  SectionPostsResponse,
  SectionMutationResponse,
  SectionDeleteResponse,
  CreateSectionRequest,
  UpdateSectionRequest,
  MovePostsRequest,
  ReorderPostsRequest,
  ReorderSectionsRequest,
  PostListResponse,
  TagResponse,
  CreatePostRequest,
  UpdatePostRequest,
  LoginRequest,
  LoginResponse,
  UploadImageResponse,
  ApiClientError,
  UserRegisterRequest,
  UserVerifyEmailRequest,
  UserLoginRequest,
  UserLoginResponse,
  UserProfile,
  ResetPasswordRequest,
  UpdatePasswordRequest,
  UserProgressItem,
  UserStatsResponse,
  ApiNote,
  NoteListResponse,
  CreateNoteRequest,
  UpdateNoteRequest,
  isUserLoggedIn,
} from "@/lib/api";

// Query keys
export const queryKeys = {
  posts: ["posts"] as const,
  post: (slug: string) => ["posts", slug] as const,
  adminPosts: ["admin", "posts"] as const,
  adminPost: (id: string) => ["admin", "posts", id] as const,
  tags: ["tags"] as const,
  auth: ["auth"] as const,
  sections: ["sections"] as const,
};

// ============================================
// Public Post Hooks
// ============================================

export function usePosts(params?: {
  limit?: number;
  offset?: number;
  tag?: string;
  sort?: "createdAt" | "updatedAt" | "title";
  order?: "asc" | "desc";
}) {
  return useQuery<PostListResponse, ApiClientError>({
    queryKey: [...queryKeys.posts, params],
    queryFn: () => api.getPosts(params),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function usePost(slug: string) {
  return useQuery<ApiPost, ApiClientError>({
    queryKey: queryKeys.post(slug),
    queryFn: () => api.getPostBySlug(slug),
    enabled: !!slug,
    staleTime: 1000 * 60 * 5,
  });
}

export function useTags() {
  return useQuery<TagResponse, ApiClientError>({
    queryKey: queryKeys.tags,
    queryFn: () => api.getTags(),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

// ============================================
// Admin Post Hooks
// ============================================

export function useAdminPosts(params?: {
  limit?: number;
  offset?: number;
  tag?: string;
  sort?: "createdAt" | "updatedAt" | "title";
  order?: "asc" | "desc";
}) {
  return useQuery<PostListResponse, ApiClientError>({
    queryKey: [...queryKeys.adminPosts, params],
    queryFn: () => api.getAdminPosts(params),
    staleTime: 1000 * 60 * 2, // 2 minutes
    select: (data) => ({
      ...data,
      // Deduplicate posts by ID to prevent duplicates
      posts: data.posts.filter((post, index, array) => 
        array.findIndex(p => p.id === post.id) === index
      )
    }),
  });
}

export function useAdminPost(id: string) {
  return useQuery<ApiPost, ApiClientError>({
    queryKey: queryKeys.adminPost(id),
    queryFn: () => api.getAdminPostById(id),
    enabled: !!id,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation<ApiPost, ApiClientError, CreatePostRequest>({
    mutationFn: (data) => api.createPost(data),
    onSuccess: (newPost) => {
      // Invalidate all post lists to refetch with new post
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPosts });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts });
      queryClient.invalidateQueries({ queryKey: queryKeys.tags });
      
      // Set the new post in cache for immediate access
      queryClient.setQueryData(queryKeys.adminPost(newPost.id), newPost);
      queryClient.setQueryData(queryKeys.post(newPost.slug), newPost);
    },
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation<
    ApiPost,
    ApiClientError,
    { id: string; data: UpdatePostRequest }
  >({
    mutationFn: ({ id, data }) => api.updatePost(id, data),
    onSuccess: (updatedPost) => {
      // Update the post in cache immediately
      queryClient.setQueryData(queryKeys.adminPost(updatedPost.id), updatedPost);
      queryClient.setQueryData(queryKeys.post(updatedPost.slug), updatedPost);
      
      // Invalidate lists to refetch with updated post
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPosts });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts });
      queryClient.invalidateQueries({ queryKey: queryKeys.tags });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, ApiClientError, string>({
    mutationFn: (id) => api.deletePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPosts });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts });
      queryClient.invalidateQueries({ queryKey: queryKeys.tags });
    },
  });
}

export function usePublishPost() {
  const queryClient = useQueryClient();

  return useMutation<ApiPost, ApiClientError, string>({
    mutationFn: (id) => api.publishPost(id),
    onSuccess: (updatedPost) => {
      // Update the post in cache immediately
      queryClient.setQueryData(queryKeys.adminPost(updatedPost.id), updatedPost);
      queryClient.setQueryData(queryKeys.post(updatedPost.slug), updatedPost);
      
      // Invalidate all lists to refetch with updated post
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPosts });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts });
      queryClient.invalidateQueries({ queryKey: queryKeys.tags });
    },
  });
}

export function useUnpublishPost() {
  const queryClient = useQueryClient();

  return useMutation<ApiPost, ApiClientError, string>({
    mutationFn: (id) => api.unpublishPost(id),
    onSuccess: (updatedPost) => {
      // Update the post in cache immediately
      queryClient.setQueryData(queryKeys.adminPost(updatedPost.id), updatedPost);
      queryClient.setQueryData(queryKeys.post(updatedPost.slug), updatedPost);
      
      // Invalidate all lists to refetch with updated post
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPosts });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts });
      queryClient.invalidateQueries({ queryKey: queryKeys.tags });
    },
  });
}

export function useUploadImage() {
  return useMutation<UploadImageResponse, ApiClientError, File>({
    mutationFn: (file) => api.uploadImage(file),
  });
}

export function useReorderPosts() {
  const queryClient = useQueryClient();
  return useMutation<{ updated: number }, ApiClientError, ReorderPostsRequest>({
    mutationFn: (data) => api.reorderPosts(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPosts });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts });
    },
  });
}

// ============================================
// Authentication Hooks
// ============================================

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation<LoginResponse, ApiClientError, LoginRequest>({
    mutationFn: (credentials) => api.login(credentials),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth });
    },
  });
}

export function useVerifyToken() {
  return useQuery<{ valid: boolean; user: string }, ApiClientError>({
    queryKey: queryKeys.auth,
    queryFn: () => api.verifyToken(),
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, void>({
    mutationFn: async () => {
      api.logout();
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

// ============================================
// Section Hooks
// ============================================

export function useSectionTree() {
  return useQuery<SectionTreeResponse, ApiClientError>({
    queryKey: queryKeys.sections,
    queryFn: () => api.getSectionTree(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useSectionBySlug(slug: string, includeChildren = true) {
  return useQuery<SectionDetailResponse, ApiClientError>({
    queryKey: [...queryKeys.sections, "detail", slug],
    queryFn: () => api.getSectionBySlug(slug, includeChildren),
    enabled: !!slug,
    staleTime: 1000 * 60 * 5,
  });
}

export function useSectionPosts(
  slug: string,
  params?: { includeChildren?: boolean; limit?: number; offset?: number }
) {
  return useQuery<SectionPostsResponse, ApiClientError>({
    queryKey: [...queryKeys.sections, "posts", slug, params],
    queryFn: () => api.getSectionPosts(slug, params),
    enabled: !!slug,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateSection() {
  const queryClient = useQueryClient();
  return useMutation<SectionMutationResponse, ApiClientError, CreateSectionRequest>({
    mutationFn: (data) => api.createSection(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sections });
    },
  });
}

export function useUpdateSection() {
  const queryClient = useQueryClient();
  return useMutation<
    SectionMutationResponse,
    ApiClientError,
    { id: string; data: UpdateSectionRequest }
  >({
    mutationFn: ({ id, data }) => api.updateSection(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sections });
    },
  });
}

export function useDeleteSection() {
  const queryClient = useQueryClient();
  return useMutation<
    SectionDeleteResponse,
    ApiClientError,
    { id: string; mode?: "cascade" | "promote" }
  >({
    mutationFn: ({ id, mode }) => api.deleteSection(id, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sections });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPosts });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts });
    },
  });
}

export function useMovePosts() {
  const queryClient = useQueryClient();
  return useMutation<{ message: string; movedCount: number }, ApiClientError, MovePostsRequest>({
    mutationFn: (data) => api.movePosts(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminPosts });
      queryClient.invalidateQueries({ queryKey: queryKeys.posts });
      queryClient.invalidateQueries({ queryKey: queryKeys.sections });
    },
  });
}

export function useReorderSections() {
  const queryClient = useQueryClient();
  return useMutation<{ updated: number }, ApiClientError, ReorderSectionsRequest>({
    mutationFn: (data) => api.reorderSections(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sections });
    },
  });
}

// ============================================
// User Auth Hooks
// ============================================

export const userQueryKeys = {
  me: ["user", "me"] as const,
  progress: ["user", "progress"] as const,
  stats: ["user", "stats"] as const,
};

export function useRegister() {
  return useMutation<{ message: string }, ApiClientError, UserRegisterRequest>({
    mutationFn: (data) => api.registerUser(data),
  });
}

export function useVerifyUserEmail() {
  return useMutation<{ message: string }, ApiClientError, UserVerifyEmailRequest>({
    mutationFn: (data) => api.verifyUserEmail(data),
  });
}

export function useUserLogin() {
  const queryClient = useQueryClient();
  return useMutation<UserLoginResponse, ApiClientError, UserLoginRequest>({
    mutationFn: (data) => api.loginUser(data),
    onSuccess: (data) => {
      queryClient.setQueryData(userQueryKeys.me, { user: data.user });
    },
  });
}

export function useForgotPassword() {
  return useMutation<{ message: string }, ApiClientError, { email: string }>({
    mutationFn: (data) => api.forgotPassword(data),
  });
}

export function useResetPassword() {
  return useMutation<{ message: string }, ApiClientError, ResetPasswordRequest>({
    mutationFn: (data) => api.resetPassword(data),
  });
}

export function useUpdatePassword() {
  return useMutation<{ message: string }, ApiClientError, UpdatePasswordRequest>({
    mutationFn: (data) => api.updateUserPassword(data),
  });
}

export function useMe() {
  return useQuery<{ user: UserProfile }, ApiClientError>({
    queryKey: userQueryKeys.me,
    queryFn: () => api.getMe(),
    enabled: isUserLoggedIn(),
    retry: false,
    staleTime: 1000 * 60 * 10,
  });
}

// ============================================
// User Progress Hooks
// ============================================

export function useMarkComplete() {
  const queryClient = useQueryClient();
  return useMutation<{ completedAt: string }, ApiClientError, string>({
    mutationFn: (slug) => api.markPostComplete(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.progress });
      queryClient.invalidateQueries({ queryKey: userQueryKeys.stats });
    },
  });
}

export function useUnmarkComplete() {
  const queryClient = useQueryClient();
  return useMutation<{ message: string }, ApiClientError, string>({
    mutationFn: (slug) => api.unmarkPostComplete(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.progress });
      queryClient.invalidateQueries({ queryKey: userQueryKeys.stats });
    },
  });
}

export function useUserProgress() {
  return useQuery<{ completed: UserProgressItem[] }, ApiClientError>({
    queryKey: userQueryKeys.progress,
    queryFn: () => api.getUserProgress(),
    enabled: isUserLoggedIn(),
    staleTime: 1000 * 60 * 2,
  });
}

export function useUserStats() {
  return useQuery<UserStatsResponse, ApiClientError>({
    queryKey: userQueryKeys.stats,
    queryFn: () => api.getUserStats(),
    enabled: isUserLoggedIn(),
    staleTime: 1000 * 60 * 5,
  });
}

// ============================================
// User Notes Hooks
// ============================================

export function useNotes(postSlug: string) {
  return useQuery<NoteListResponse, ApiClientError>({
    queryKey: ["user", "notes", postSlug],
    queryFn: () => api.getNotes(postSlug),
    enabled: isUserLoggedIn() && !!postSlug,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateNote(postSlug: string) {
  const queryClient = useQueryClient();
  return useMutation<ApiNote, ApiClientError, CreateNoteRequest>({
    mutationFn: (data) => api.createNote(postSlug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "notes", postSlug] });
    },
  });
}

export function useUpdateNote(postSlug: string) {
  const queryClient = useQueryClient();
  return useMutation<ApiNote, ApiClientError, { noteId: string; data: UpdateNoteRequest }>({
    mutationFn: ({ noteId, data }) => api.updateNote(noteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "notes", postSlug] });
    },
  });
}

export function useDeleteNote(postSlug: string) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, ApiClientError, string>({
    mutationFn: (noteId) => api.deleteNote(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "notes", postSlug] });
    },
  });
}

/** Returns the previous and next post within the same section, ordered by `order`. */
export function useAdjacentPosts(
  currentSlug: string,
  sectionId: string | null | undefined
): { prev: ApiPostSummary | null; next: ApiPostSummary | null } {
  const { data: sectionData } = useSectionTree();

  return useMemo(() => {
    if (!sectionId || !sectionData) return { prev: null, next: null };

    const findNode = (nodes: ApiSectionNode[]): ApiSectionNode | null => {
      for (const node of nodes) {
        if (node.id === sectionId) return node;
        const found = findNode(node.children ?? []);
        if (found) return found;
      }
      return null;
    };

    const node = findNode(sectionData.sections);
    if (!node?.posts?.length) return { prev: null, next: null };

    const sorted = [...node.posts].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const idx = sorted.findIndex((p) => p.slug === currentSlug);
    if (idx === -1) return { prev: null, next: null };

    return {
      prev: idx > 0 ? sorted[idx - 1] : null,
      next: idx < sorted.length - 1 ? sorted[idx + 1] : null,
    };
  }, [sectionData, currentSlug, sectionId]);
}
