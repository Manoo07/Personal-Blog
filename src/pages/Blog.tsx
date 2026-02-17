import Layout from "@/components/Layout";
import BlogCard from "@/components/BlogCard";
import Breadcrumb from "@/components/Breadcrumb";
import { usePosts } from "@/hooks/use-api";
import { Loader2, FileText } from "lucide-react";

const Blog = () => {
  const { data, isLoading, isError } = usePosts({
    limit: 100,
    sort: "createdAt",
    order: "desc",
  });

  const posts = data?.posts || [];

  return (
    <Layout>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 pt-4 sm:pt-6 pb-8 sm:pb-12">
        <Breadcrumb items={[{ label: "Home", to: "/" }, { label: "Blog" }]} />
        <div className="mb-4 animate-fade-in">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
            Blog
          </h1>
          <p className="text-sm text-muted-foreground">
            Technical writing on systems, databases, languages, and engineering.
          </p>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && posts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{isError ? "Failed to load posts. Please try again later." : "No posts yet. Check back soon!"}</p>
          </div>
        )}

        {!isLoading && posts.length > 0 && (
          <div>
            {posts.map((post, i) => (
              <BlogCard key={post.slug} post={post} index={i} />
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
};

export default Blog;
