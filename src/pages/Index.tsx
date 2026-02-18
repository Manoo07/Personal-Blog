import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import BlogCard from "@/components/BlogCard";
import GitHubProjectCard from "@/components/GitHubProjectCard";
import { usePosts } from "@/hooks/use-api";
import { useGitHubRepos } from "@/hooks/use-github";
import { getAssetPath } from "@/lib/assets";
import { ArrowRight, Loader2, FileText } from "lucide-react";

const Index = () => {
  const { data: postsData, isLoading: postsLoading } = usePosts({ limit: 4, sort: "createdAt", order: "desc" });
  const { data: githubProjects } = useGitHubRepos(4);
  const recentPosts = postsData?.posts || [];
  const featuredProjects = githubProjects?.slice(0, 2) || [];

  return (
    <Layout>
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 pt-8 sm:pt-12 pb-8 sm:pb-10">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
          {/* Left: Content */}
          <div className="animate-fade-in text-center lg:text-left">
            <p className="font-mono text-xs text-primary mb-2">Hi, I'm</p>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-foreground leading-tight mb-4">
              Manohar Boinapally
              <br />
              <span className="text-muted-foreground">Software Engineer</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-lg mx-auto lg:mx-0 leading-relaxed mb-5">
              Associate Software Engineer @ OSI Digital | AWS Certified | BE OU'24
              <br />
              I specialize in building scalable web applications with React, Node.js, and cloud technologies. 
              Passionate about distributed systems, API design, and modern DevOps practices.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start">
              <Link
                to="/blog"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
              >
                Read the blog
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                to="/about"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded border border-border text-foreground font-medium text-sm hover:bg-secondary transition-colors"
              >
                About me
              </Link>
            </div>
          </div>

          {/* Right: Image */}
          <div className="flex justify-center items-center animate-fade-in order-first lg:order-last" style={{ animationDelay: "200ms" }}>
            <div className="relative w-full max-w-xs sm:max-w-sm lg:max-w-lg">
              {/* Glow effect behind image */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/20 to-primary/30 blur-3xl opacity-60"></div>
              
              {/* Image container with glassmorphism */}
              <div className="relative backdrop-blur-sm bg-card/20 p-2 rounded-2xl border border-border/50 shadow-2xl">
                <img 
                  src={getAssetPath("image.png")} 
                  alt="Manohar Boinapally" 
                  className="w-full h-auto rounded-xl object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Posts */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 pb-8 sm:pb-10">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">
            Recent Writing
          </h2>
          <Link
            to="/blog"
            className="text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
          >
            All posts <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div>
          {postsLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
              <span className="text-sm text-muted-foreground">Loading recent posts...</span>
            </div>
          )}
          
          {!postsLoading && recentPosts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No posts available yet.</p>
            </div>
          )}
          
          {!postsLoading && recentPosts.length > 0 && (
            <>
              {recentPosts.map((post, i) => (
                <BlogCard key={post.slug} post={post} index={i} />
              ))}
            </>
          )}
        </div>
      </section>

      {/* Featured Projects */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 pb-8 sm:pb-12">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">
            Featured Projects
          </h2>
          <Link
            to="/projects"
            className="text-xs text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
          >
            All projects <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {featuredProjects.map((project, i) => (
            <GitHubProjectCard key={`${project.github}-${i}`} project={project} index={i} />
          ))}
        </div>
      </section>
    </Layout>
  );
};

export default Index;
