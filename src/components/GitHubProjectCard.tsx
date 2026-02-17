import { Project } from "@/types/blog";
import { ProjectFromRepo } from "@/lib/github";
import { ExternalLink, Star, GitFork } from "lucide-react";

interface GitHubProjectCardProps {
  project: Project | ProjectFromRepo;
  index?: number;
}

// Type guard to check if it's a GitHub repo
function isGitHubRepo(project: Project | ProjectFromRepo): project is ProjectFromRepo {
  return 'stars' in project && 'forks' in project;
}

const GitHubProjectCard = ({ project, index = 0 }: GitHubProjectCardProps) => {
  const isGithub = isGitHubRepo(project);

  return (
    <div
      className="group p-4 rounded border border-border/50 bg-card hover:border-primary/30 transition-all duration-200 animate-fade-in"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
          {project.title}
        </h3>
        <div className="flex items-center gap-2">
          {project.github && (
            <a 
              href={project.github} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-muted-foreground hover:text-foreground transition-colors" 
              aria-label="GitHub"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          )}
          {project.link && (
            <a 
              href={project.link} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-muted-foreground hover:text-foreground transition-colors" 
              aria-label="Live demo"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed mb-3">
        {project.description}
      </p>

      {/* GitHub stats */}
      {isGithub && (project.stars > 0 || project.forks > 0) && (
        <div className="flex items-center gap-3 mb-3">
          {project.stars > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{project.stars}</span>
            </div>
          )}
          {project.forks > 0 && (
            <div className="flex items-center gap-1">
              <GitFork className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{project.forks}</span>
            </div>
          )}
          {isGithub && project.language && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <span className="text-xs text-muted-foreground">{project.language}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5">
        {project.tags.map((tag) => (
          <span key={tag} className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
};

export default GitHubProjectCard;