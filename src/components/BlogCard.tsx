import { Link } from "react-router-dom";
import { BlogPost } from "@/types/blog";
import type { ApiPostSummary } from "@/lib/api";

interface BlogCardProps {
  post: BlogPost | ApiPostSummary;
  index?: number;
}

const BlogCard = ({ post, index = 0 }: BlogCardProps) => {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group block py-3 sm:py-4 border-b border-border/40 last:border-0 animate-fade-in"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4">
          <h3 className="text-base font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 pr-2 sm:pr-0">
            {post.title}
          </h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
            <time>{new Date(post.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: window.innerWidth < 640 ? undefined : "numeric",
            })}</time>
            <span>·</span>
            <span>{post.readingTime}m</span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
          {post.excerpt}
        </p>

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground"
              >
                {tag}
              </span>
            ))}
            {post.tags.length > 3 && (
              <span className="text-[11px] font-mono px-1.5 py-0.5 text-muted-foreground">
                +{post.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
};

export default BlogCard;
