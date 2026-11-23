import { useParams, Link, useNavigate } from "react-router-dom";
import { useMemo, useRef, useState } from "react";
import ReactMarkdown, { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkObsidian from "@/lib/remark-obsidian";
import rehypeHighlight from "rehype-highlight";
import Layout from "@/components/Layout";
import BlogSidebar from "@/components/BlogSidebar";
import SectionNav from "@/components/SectionNav";
import { sortSections } from "@/lib/sections";
import PostNotes from "@/components/PostNotes";
import MermaidDiagram from "@/components/MermaidDiagram";
import { usePost, useAdjacentPosts, useMarkComplete, useUnmarkComplete, useUserProgress, useSectionTree } from "@/hooks/use-api";
import type { ApiSectionNode } from "@/lib/api";
import { useUserAuth } from "@/contexts/UserAuthContext";
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, Circle, AlignLeft, Binary, Tags, CalendarDays, Clock, PanelLeft, PanelRight } from "lucide-react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { cn } from "@/lib/utils";
import { useSiteConfig } from "@/hooks/use-site-config";
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

  img({ node: _node, ...props }) {
    return <img {...props} loading="lazy" decoding="async" />;
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

/** Path of sections from the root down to `id` (inclusive), or [] if not found. */
function findSectionPath(nodes: ApiSectionNode[], id: string): ApiSectionNode[] {
  for (const n of nodes) {
    if (n.id === id) return [n];
    const sub = findSectionPath(n.children ?? [], id);
    if (sub.length) return [n, ...sub];
  }
  return [];
}


/** Obsidian-style property row */
const Property = ({
  icon: Icon,
  name,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-start min-h-[28px] py-[3px]">
    <div className="flex items-center gap-2 w-[130px] sm:w-[160px] shrink-0 text-[14px] text-muted-foreground pt-[1px]">
      <Icon className="w-4 h-4 shrink-0" />
      <span>{name}</span>
    </div>
    <div className="flex-1 min-w-0 text-[14px] text-foreground pt-[1px]">{children}</div>
  </div>
);

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: post, isLoading, isError } = usePost(slug || "");
  const { prev, next } = useAdjacentPosts(slug || "", post?.sectionId);
  const { data: sectionData } = useSectionTree();
  const { isLoggedIn, openAuthModal } = useUserAuth();
  const { data: progressData } = useUserProgress();
  const markComplete = useMarkComplete();
  const unmarkComplete = useUnmarkComplete();
  const articleRef = useRef<HTMLElement>(null);
  const libraryName = useSiteConfig().site.libraryName;

  // Obsidian-style side panes: desktop collapse state persists; below the
  // breakpoint the same buttons open the pane as a drawer instead.
  const [leftOpen, setLeftOpen] = usePersistentState("blog:pane:left", true);
  const [rightOpen, setRightOpen] = usePersistentState("blog:pane:right", true);
  const [leftDrawer, setLeftDrawer] = useState(false);
  const [rightDrawer, setRightDrawer] = useState(false);

  // Reading width grows as panes close, so the freed space is actually used
  // (only at breakpoints where that pane would otherwise be visible).
  const readingWidth =
    !leftOpen && !rightOpen
      ? "lg:max-w-[880px] xl:max-w-[980px]"
      : !rightOpen
        ? "lg:max-w-[880px]"
        : !leftOpen
          ? "xl:max-w-[880px]"
          : "";

  const toggleLeft = () =>
    window.matchMedia("(min-width: 1280px)").matches ? setLeftOpen((o) => !o) : setLeftDrawer((o) => !o);
  const toggleRight = () =>
    window.matchMedia("(min-width: 1024px)").matches ? setRightOpen((o) => !o) : setRightDrawer((o) => !o);

  const completedItem = progressData?.completed.find((c) => c.postSlug === slug);
  const isCompleted = !!completedItem;

  const sectionId = post?.section?.id ?? post?.sectionId ?? null;

  const sectionPath = useMemo(
    () => (sectionId ? findSectionPath(sortSections(sectionData?.sections ?? []), sectionId) : []),
    [sectionData, sectionId]
  );

  // "part" = 1-based position of this post inside its section
  const part = useMemo(() => {
    const leaf = sectionPath[sectionPath.length - 1];
    const idx = leaf?.posts?.findIndex((p) => p.slug === slug) ?? -1;
    return idx >= 0 ? idx + 1 : null;
  }, [sectionPath, slug]);

  const stats = useMemo(() => {
    const text = post?.content ?? "";
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    return { words, chars: text.length };
  }, [post?.content]);

  if (isLoading) {
    return (
      <Layout hideFooter>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!post || isError) {
    return (
      <Layout>
        <div className="max-w-[700px] mx-auto px-6 pt-16 text-center">
          <h1 className="text-xl font-semibold text-foreground mb-3">
            {isError ? "Failed to load post" : "Post not found"}
          </h1>
          <p className="text-muted-foreground mb-4">
            {isError ? "Please try again later." : "The post you're looking for doesn't exist."}
          </p>
          <Link to="/blog" className="text-link underline underline-offset-[3px] text-sm">
            ← Back to blog
          </Link>
        </div>
      </Layout>
    );
  }

  const createdLabel = new Date(post.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <Layout hideFooter>
      {/* Left pane — file explorer */}
      <SectionNav
        section={post.section}
        open={leftOpen}
        onClose={() => setLeftOpen(false)}
        mobileOpen={leftDrawer}
        onMobileClose={() => setLeftDrawer(false)}
      />

      {/* Centre pane */}
      <div
        className={cn(
          "min-h-[calc(100vh-49px)] bg-background transition-[padding] duration-200 ease-out",
          leftOpen && "xl:pl-[300px]",
          rightOpen && "lg:pr-[300px]"
        )}
      >
        {/* View header: ← →  Library / Section / Title */}
        <div className="sticky top-[49px] z-20 h-10 flex items-center gap-0.5 px-2 bg-background/95 backdrop-blur-sm border-b border-transparent">
          <button
            type="button"
            onClick={toggleLeft}
            className={cn(
              "p-1.5 rounded-[4px] text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors",
              leftOpen && "xl:hidden"
            )}
            aria-label="Toggle left sidebar"
            title="Toggle left sidebar"
          >
            <PanelLeft className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-[4px] text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
            aria-label="Navigate back"
          >
            <ArrowLeft className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => navigate(1)}
            className="p-1.5 rounded-[4px] text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors"
            aria-label="Navigate forward"
          >
            <ArrowRight className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </button>

          <nav className="ml-3 flex items-center min-w-0 text-[15px] text-muted-foreground" aria-label="Breadcrumb">
            <Link to="/blog" className="shrink-0 hover:text-foreground transition-colors">
              {libraryName}
            </Link>
            {sectionPath.map((s) => (
              <span key={s.id} className="hidden sm:flex items-center shrink-0">
                <span className="mx-1.5 text-faint/70">/</span>
                <span>{s.name}</span>
              </span>
            ))}
            <span className="mx-1.5 text-faint/70">/</span>
            <span className="truncate text-foreground">{post.title}</span>
          </nav>

          <button
            type="button"
            onClick={toggleRight}
            className={cn(
              "ml-auto shrink-0 p-1.5 rounded-[4px] text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors",
              rightOpen && "lg:hidden"
            )}
            aria-label="Toggle right sidebar"
            title="Toggle right sidebar"
          >
            <PanelRight className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </button>
        </div>

        <div
          className={cn(
            "mx-auto px-5 sm:px-6 pt-5 pb-16 max-w-[720px] transition-[max-width] duration-200 ease-out",
            readingWidth
          )}
        >
          <article ref={articleRef}>
            {/* Inline title */}
            <h1 className="text-[26px] sm:text-[1.802rem] font-bold leading-[1.2] tracking-[-0.015em] text-foreground mb-4">
              {post.title}
            </h1>

            {/* Properties */}
            <section className="mb-7 pb-5 border-b border-secondary-alt/60" aria-label="Properties">
              <h2 className="text-[14px] font-semibold text-foreground mb-1">Properties</h2>
              {sectionPath.length > 0 && (
                <Property icon={AlignLeft} name="series">
                  {sectionPath[sectionPath.length - 1].name}
                </Property>
              )}
              {part != null && (
                <Property icon={Binary} name="part">
                  {part}
                </Property>
              )}
              <Property icon={CalendarDays} name="created">
                {createdLabel}
              </Property>
              <Property icon={Clock} name="reading time">
                {post.readingTime} min
              </Property>
              {post.tags.length > 0 && (
                <Property icon={Tags} name="tags">
                  <div className="flex flex-wrap gap-[6px] -mt-[1px]">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center h-[22px] px-[9px] rounded-full bg-tag text-primary text-[13.5px] leading-none"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </Property>
              )}
            </section>

            {/* Body */}
            <div className="prose">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkObsidian]}
                rehypePlugins={[rehypeHighlight]}
                components={markdownComponents}
              >
                {post.content}
              </ReactMarkdown>
            </div>

            {/* Mark as complete */}
            <div className="mt-8 pt-5 border-t border-secondary-alt/70">
              {isLoggedIn ? (
                <button
                  type="button"
                  onClick={() =>
                    isCompleted ? unmarkComplete.mutate(slug || "") : markComplete.mutate(slug || "")
                  }
                  disabled={markComplete.isPending || unmarkComplete.isPending}
                  className={
                    isCompleted
                      ? "inline-flex items-center gap-2 h-[32px] px-3.5 rounded-[5px] text-[14px] bg-tag text-primary hover:brightness-95 transition"
                      : "inline-flex items-center gap-2 h-[32px] px-3.5 rounded-[5px] text-[14px] bg-[hsl(0_0%_96%)] text-foreground border border-border shadow-[0_1px_1px_rgba(0,0,0,0.06)] hover:bg-white transition"
                  }
                >
                  {markComplete.isPending || unmarkComplete.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Circle className="w-4 h-4 text-muted-foreground" />
                  )}
                  {isCompleted
                    ? `Completed · ${format(new Date(completedItem!.completedAt), "MMM d, yyyy")}`
                    : "Mark as complete"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal("login")}
                  className="inline-flex items-center gap-2 h-[32px] px-3.5 rounded-[5px] text-[14px] bg-[hsl(0_0%_96%)] text-muted-foreground border border-border hover:text-foreground transition"
                >
                  <Circle className="w-4 h-4" />
                  Sign in to track progress
                </button>
              )}
            </div>

            {/* Prev / next — plain links, like an Obsidian series nav */}
            {(prev || next) && (
              <nav className="mt-5 flex items-start justify-between gap-6 text-[15px]">
                {prev ? (
                  <Link to={`/blog/${prev.slug}`} className="group min-w-0 max-w-[48%]">
                    <span className="block text-[12px] text-muted-foreground mb-0.5">Previous</span>
                    <span className="text-link underline underline-offset-[3px] decoration-1 group-hover:opacity-80">
                      ← {prev.title}
                    </span>
                  </Link>
                ) : (
                  <span />
                )}
                {next && (
                  <Link to={`/blog/${next.slug}`} className="group min-w-0 max-w-[48%] text-right">
                    <span className="block text-[12px] text-muted-foreground mb-0.5">Next</span>
                    <span className="text-link underline underline-offset-[3px] decoration-1 group-hover:opacity-80">
                      {next.title} →
                    </span>
                  </Link>
                )}
              </nav>
            )}
          </article>
        </div>
      </div>

      {/* Right pane — search + outline */}
      <BlogSidebar
        content={post.content}
        postSlug={slug}
        isLoggedIn={isLoggedIn}
        open={rightOpen}
        onClose={() => setRightOpen(false)}
        mobileOpen={rightDrawer}
        onMobileClose={() => setRightDrawer(false)}
      />

      {/* Status bar */}
      <div className="hidden sm:flex fixed bottom-0 right-0 z-40 items-center gap-4 h-[28px] px-3 bg-secondary border-t border-l border-border rounded-tl-[8px] text-[12px] text-muted-foreground tabular-nums">
        <span>{post.readingTime} min read</span>
        <span>{stats.words.toLocaleString()} words</span>
        <span>{stats.chars.toLocaleString()} characters</span>
      </div>

      {/* Highlights & notes: selection bubble + Obsidian-style right-click menu */}
      {slug && (
        <PostNotes
          postSlug={slug}
          articleRef={articleRef}
          isLoggedIn={isLoggedIn}
          onRequireLogin={() => openAuthModal("login")}
        />
      )}
    </Layout>
  );
};

export default BlogPost;
