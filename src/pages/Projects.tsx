import Layout from "@/components/Layout";
import GitHubProjectCard from "@/components/GitHubProjectCard";
import Breadcrumb from "@/components/Breadcrumb";
import { useGitHubRepos } from "@/hooks/use-github";
import { Loader2, FileText, Github } from "lucide-react";

const Projects = () => {
  const { data: githubProjects, isLoading, isError } = useGitHubRepos(8);

  return (
    <Layout>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 pt-6 pb-12">
        <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "Projects" }]} />
        <div className="mb-6 sm:mb-4 animate-fade-in">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 sm:mb-1">
            Projects
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Github className="w-4 h-4" />
            Recent repositories from my GitHub
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading repositories...</span>
          </div>
        )}

        {!isLoading && isError && (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Failed to load projects. Please try again later.</p>
          </div>
        )}

        {!isLoading && !isError && githubProjects && githubProjects.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No public repositories found.</p>
          </div>
        )}

        {!isLoading && !isError && githubProjects && githubProjects.length > 0 && (
          <div className="grid gap-4 sm:gap-3 sm:grid-cols-2">
            {githubProjects.map((project, i) => (
              <GitHubProjectCard key={`${project.github}-${i}`} project={project} index={i} />
            ))}
          </div>
        )}

        {!isLoading && !isError && githubProjects && githubProjects.length > 0 && (
          <div className="text-center mt-8">
            <a
              href="https://github.com/Manoo07"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Github className="w-4 h-4" />
              View all repositories on GitHub
            </a>
          </div>
        )}
      </section>
    </Layout>
  );
};

export default Projects;
