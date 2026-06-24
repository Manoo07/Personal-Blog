import { useParams, Link } from "react-router-dom";
import { useRef } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import Layout from "@/components/Layout";
import Breadcrumb from "@/components/Breadcrumb";
import BlogSidebar from "@/components/BlogSidebar";
import SectionNav from "@/components/SectionNav";
import PostNotes from "@/components/PostNotes";
import MermaidDiagram from "@/components/MermaidDiagram";
import { usePost, useAdjacentPosts, useMarkComplete, useUnmarkComplete, useUserProgress } from "@/hooks/use-api";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2, Circle } from "lucide-react";
import { format } from "date-fns";

/** Custom renderers for ReactMarkdown */
const markdownComponents: Components = {
  pre({ children, ...props }) {
    // Extract language from the child <code> element's className
    let language = "";
    let codeContent = "";
    if (
      children &&
      typeof children === "object" &&
      "props" in (children as any)
    ) {
      const codeProps = (children as any).props;
      const className = codeProps?.className || "";
      const match = className.match(/language-(\w+)/);
      if (match) language = match[1];
      if (typeof codeProps?.children === "string") {
        codeContent = codeProps.children;
      }
    }

    if (language === "mermaid") {
      return <MermaidDiagram code={codeContent} />;
    }

    return (
      <div className="code-block-wrapper">
        {language && (
          <div className="code-block-lang">
            {language}
          </div>
        )}
        <pre {...props}>{children}</pre>
      </div>
    );
  },

  // Wrap every table in a horizontally-scrollable container so it
  // never overflows on small screens.
  table({ children, ...props }) {
    return (
      <div className="table-responsive-wrapper">
        <table {...props}>{children}</table>
      </div>
    );
  },
};

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading, isError } = usePost(slug || "");
  const { prev, next } = useAdjacentPosts(slug || "", post?.sectionId);
  const { isLoggedIn, openAuthModal } = useUserAuth();
  const { data: progressData } = useUserProgress();
  const markComplete = useMarkComplete();
  const unmarkComplete = useUnmarkComplete();
  const articleRef = useRef<HTMLElement>(null);

  const completedItem = progressData?.completed.find((c) => c.postSlug === slug);
  const isCompleted = !!completedItem;

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 pt-12 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!post || isError) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 pt-12 text-center">
          <h1 className="text-xl font-bold text-foreground mb-4">
            {isError ? "Failed to load post" : "Post not found"}
          </h1>
          <p className="text-muted-foreground mb-4">
            {isError ? "Please try again later." : "The post you're looking for doesn't exist."}
          </p>
          <Link to="/blog" className="text-primary text-sm hover:underline">
            ← Back to blog
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 pt-4 sm:pt-6 pb-12 sm:pb-16">
        <Breadcrumb
          items={[
            { label: "Home", to: "/" },
            { label: "Blog", to: "/blog" },
            { label: post.title },
          ]}
        />

        {/* Left fixed sidebar — Section navigation */}
        <SectionNav section={post.section} />

        <div className="lg:pr-52 xl:pl-60 xl:pr-56 2xl:pl-72 2xl:pr-56">
          {/* Main content */}
          <article ref={articleRef} className="max-w-3xl">
            <header className="mb-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs text-muted-foreground mb-2">
                <time>
                  {new Date(post.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
                <span className="hidden sm:inline">·</span>
                <span>{post.readingTime} min read</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight mb-3">
                {post.title}
              </h1>

              <div className="flex items-center gap-1.5 flex-wrap">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </header>

            <div className="prose prose-sm sm:prose prose-slate dark:prose-invert max-w-none animate-fade-in" style={{ animationDelay: "100ms" }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={markdownComponents}
              >
                {post.content}
              </ReactMarkdown>
            </div>

            {/* Mark as Complete */}
            <div className="mt-10 pt-6 border-t border-border/40 not-prose">
              {isLoggedIn ? (
                <button
                  onClick={() =>
                    isCompleted
                      ? unmarkComplete.mutate(slug || "")
                      : markComplete.mutate(slug || "")
                  }
                  disabled={markComplete.isPending || unmarkComplete.isPending}
                  className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg border transition-all duration-200 ${
                    isCompleted
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                      : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-primary"
                  }`}
                >
                  {markComplete.isPending || unmarkComplete.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                  {isCompleted
                    ? `Completed · ${format(new Date(completedItem!.completedAt), "MMM d, yyyy")}`
                    : "Mark as Complete"}
                </button>
              ) : (
                <button
                  onClick={() => openAuthModal("login")}
                  className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-border/50 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                >
                  <Circle className="w-4 h-4" />
                  Sign in to track progress
                </button>
              )}
            </div>

            {/* Prev / Next navigation */}
            {(prev || next) && (
              <nav className="mt-12 pt-6 border-t border-border/40 flex gap-3 not-prose">
                {prev ? (
                  <Link
                    to={`/blog/${prev.slug}`}
                    className="group flex-1 flex flex-col gap-1 p-4 rounded-lg border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 min-w-0"
                  >
                    <span className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                      <ChevronLeft className="w-3 h-3 shrink-0" />
                      Previous
                    </span>
                    <span className="text-sm font-medium text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                      {prev.title}
                    </span>
                  </Link>
                ) : (
                  <div className="flex-1" />
                )}

                {next ? (
                  <Link
                    to={`/blog/${next.slug}`}
                    className="group flex-1 flex flex-col gap-1 p-4 rounded-lg border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 text-right min-w-0"
                  >
                    <span className="text-[11px] text-muted-foreground flex items-center gap-0.5 justify-end">
                      Next
                      <ChevronRight className="w-3 h-3 shrink-0" />
                    </span>
                    <span className="text-sm font-medium text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                      {next.title}
                    </span>
                  </Link>
                ) : (
                  <div className="flex-1" />
                )}
              </nav>
            )}
          </article>
        </div>

        {/* Fixed Right Sidebar - Table of Contents + Notes */}
        <BlogSidebar content={post.content} postSlug={slug} isLoggedIn={isLoggedIn} />

        {/* Floating selection → note bubble (logged-in only) */}
        {isLoggedIn && slug && (
          <PostNotes postSlug={slug} articleRef={articleRef} />
        )}
      </div>
    </Layout>
  );
};

export default BlogPost;
