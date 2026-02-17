import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  api,
  ApiPost,
  PostListResponse,
  TagResponse,
  CreatePostRequest,
  UpdatePostRequest,
  LoginRequest,
  LoginResponse,
  ApiClientError,
} from "@/lib/api";

// Query keys
export const queryKeys = {
  posts: ["posts"] as const,
  post: (slug: string) => ["posts", slug] as const,
  adminPosts: ["admin", "posts"] as const,
  adminPost: (id: string) => ["admin", "posts", id] as const,
  tags: ["tags"] as const,
  auth: ["auth"] as const,
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
