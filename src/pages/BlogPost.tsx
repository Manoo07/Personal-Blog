import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import Layout from "@/components/Layout";
import Breadcrumb from "@/components/Breadcrumb";
import BlogSidebar from "@/components/BlogSidebar";
import { usePost } from "@/hooks/use-api";
import { Loader2 } from "lucide-react";

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading, isError } = usePost(slug || "");

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

        <div className="lg:pr-52 xl:pr-56">
          {/* Main content */}
          <article className="max-w-3xl">
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
              >
                {post.content}
              </ReactMarkdown>
            </div>
          </article>
        </div>

        {/* Fixed Sidebar - Table of Contents */}
        <BlogSidebar content={post.content} />
      </div>
    </Layout>
  );
};

export default BlogPost;
