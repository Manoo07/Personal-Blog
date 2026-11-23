import { useQuery } from "@tanstack/react-query";
import { githubApi, ProjectFromRepo } from "@/lib/github";

export const githubQueryKeys = {
  repos: ["github", "repos"] as const,
  recentRepos: (limit: number, username: string) => ["github", "recent-repos", username, limit] as const,
};

export function useGitHubRepos(limit: number = 10, username?: string) {
  return useQuery({
    queryKey: githubQueryKeys.recentRepos(limit, username ?? ""),
    queryFn: () => githubApi.getRecentRepos(limit, username),
    enabled: username === undefined || username.trim().length > 0,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    retry: 2,
  });
}