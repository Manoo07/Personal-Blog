// GitHub API service for fetching repositories
export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  created_at: string;
  topics: string[];
  private: boolean;
  fork: boolean;
}

export interface ProjectFromRepo {
  title: string;
  description: string;
  tags: string[];
  github: string;
  link?: string;
  stars: number;
  forks: number;
  language: string | null;
  updatedAt: string;
}

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_USERNAME = 'Manoo07';

export class GitHubAPI {
  private async fetchWithErrorHandling<T>(url: string): Promise<T> {
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('GitHub API fetch error:', error);
      throw error;
    }
  }

  async getPublicRepos(limit: number = 30): Promise<GitHubRepo[]> {
    const url = `${GITHUB_API_BASE}/users/${GITHUB_USERNAME}/repos?type=public&sort=updated&per_page=${limit}`;
    return this.fetchWithErrorHandling<GitHubRepo[]>(url);
  }

  async getRecentRepos(limit: number = 6): Promise<ProjectFromRepo[]> {
    try {
      // Fetch a larger pool so filtering still leaves enough results
      const repos = await this.getPublicRepos(50);
      
      return repos
        .filter(repo => !repo.fork) // Exclude forks
        .slice(0, limit)
        .map(repo => ({
          title: repo.name
            .split(/[-_]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' '),
          description: repo.description || 'No description available',
          tags: [
            ...(repo.language ? [repo.language.toLowerCase()] : []),
            ...repo.topics.slice(0, 3),
          ].filter(Boolean),
          github: repo.html_url,
          link: repo.homepage || undefined,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          language: repo.language,
          updatedAt: repo.updated_at,
        }))
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to fetch GitHub repos:', error);
      return [];
    }
  }
}

export const githubApi = new GitHubAPI();