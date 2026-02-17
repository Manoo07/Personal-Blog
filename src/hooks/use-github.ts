import { useQuery } from "@tanstack/react-query";
import { githubApi, ProjectFromRepo } from "@/lib/github";

export const githubQueryKeys = {
  repos: ["github", "repos"] as const,
  recentRepos: (limit: number) => ["github", "recent-repos", limit] as const,
};

export function useGitHubRepos(limit: number = 10) {
  return useQuery({
    queryKey: githubQueryKeys.recentRepos(limit),
    queryFn: () => githubApi.getRecentRepos(limit),
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    retry: 2,
  });
}